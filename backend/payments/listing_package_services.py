"""Business logic for listing slot packages (ETB bundles) and legacy subscriptions."""

from __future__ import annotations

from datetime import timedelta
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext as _

from .models import ListingPackagePurchase, Payment, Subscription


def _notify_listing_slot_events(purchase: ListingPackagePurchase) -> None:
    """In-app (and email) when a package nears depletion or runs out of credits."""
    from notifications.models import Notification
    from notifications.services import create_notification

    user = purchase.user
    rem = purchase.slots_remaining
    label = (purchase.package.name or purchase.package.code) if purchase.package_id else _("Package")

    if rem == 0:
        exists = Notification.objects.filter(
            recipient=user,
            notification_type=Notification.NotificationType.LISTING_PACKAGE_DEPLETED,
            data__purchase_id=purchase.pk,
        ).exists()
        if not exists:
            create_notification(
                user,
                Notification.NotificationType.LISTING_PACKAGE_DEPLETED,
                _("Listing credits used up"),
                _(
                    'Your listing package «%(name)s» has no remaining credits. Buy a new package to publish more listings.'
                )
                % {"name": label},
                data={"purchase_id": purchase.pk, "package_code": purchase.package.code},
            )
        return

    if rem == 1 and not purchase.low_balance_notified:
        create_notification(
            user,
            Notification.NotificationType.LISTING_PACKAGE_LOW,
            _("One listing credit left"),
            _(
                'Your «%(name)s» package has one free publish left. Add or renew a package to avoid interruption.'
            )
            % {"name": label},
            data={"purchase_id": purchase.pk, "slots_remaining": 1},
        )
        purchase.low_balance_notified = True
        purchase.save(update_fields=["low_balance_notified", "updated_at"])


def activate_listing_package_purchase(payment: Payment) -> None:
    """Mark a listing package purchase active after the payment is confirmed."""
    if payment.payment_type != Payment.PaymentType.LISTING_PACKAGE:
        return
    try:
        purchase = payment.listing_package_purchase
    except ListingPackagePurchase.DoesNotExist:
        return
    if purchase.status != ListingPackagePurchase.Status.PENDING:
        return
    now = timezone.now()
    purchase.status = ListingPackagePurchase.Status.ACTIVE
    purchase.starts_at = now
    purchase.expires_at = now + timedelta(days=purchase.package.validity_days)
    purchase.save(
        update_fields=["status", "starts_at", "expires_at", "updated_at"]
    )


def _active_package_qs_for_user(user_id: int):
    now = timezone.now()
    return (
        ListingPackagePurchase.objects.filter(
            user_id=user_id,
            status=ListingPackagePurchase.Status.ACTIVE,
        )
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gte=now))
        .select_related("package", "user")
        .select_for_update()
        .order_by("expires_at")
    )


def total_slot_remaining_from_packages(user) -> int:
    now = timezone.now()
    total = 0
    qs = ListingPackagePurchase.objects.filter(
        user=user,
        status=ListingPackagePurchase.Status.ACTIVE,
    ).filter(Q(expires_at__isnull=True) | Q(expires_at__gte=now))
    for p in qs:
        total += p.slots_remaining
    return total


def _legacy_subscription_can_add_listing(user) -> bool:
    sub = (
        Subscription.objects.filter(user=user, is_active=True)
        .order_by("-created_at")
        .first()
    )
    if not sub or sub.is_expired:
        return False
    from properties.models import Property

    published = Property.objects.filter(owner=user, is_published=True).count()
    return published < sub.max_listings


def has_listing_capacity(user) -> bool:
    """
    True when the user has at least one package slot or legacy subscription capacity.
    """
    return (total_slot_remaining_from_packages(user) > 0) or _legacy_subscription_can_add_listing(
        user
    )


@transaction.atomic
def consume_slot_for_publish(user, prop) -> bool:
    """
    Publish a property: use a package slot if available, else allow legacy active subscription.
    Returns True on success, False if no capacity.
    """
    if prop.owner_id != user.id:
        return False
    if prop.is_published:
        return True

    for purchase in _active_package_qs_for_user(user.id):
        if purchase.slots_remaining < 1:
            continue
        purchase.slots_used = purchase.slots_used + 1
        purchase.save(update_fields=["slots_used", "updated_at"])
        _notify_listing_slot_events(purchase)
        prop.listing_slot_purchase = purchase
        prop.is_published = True
        prop.save(
            update_fields=["listing_slot_purchase", "is_published", "updated_at"]
        )
        return True

    if _legacy_subscription_can_add_listing(user):
        prop.is_published = True
        prop.save(update_fields=["is_published", "updated_at"])
        return True

    return False


@transaction.atomic
def release_slot_on_property_delete(prop: "Property") -> None:
    """Return one slot to the purchase if this listing consumed a package slot."""
    if not prop.listing_slot_purchase_id or not prop.is_published:
        return
    purchase = (
        ListingPackagePurchase.objects.select_for_update()
        .filter(pk=prop.listing_slot_purchase_id)
        .first()
    )
    if not purchase:
        return
    if purchase.slots_used > 0:
        purchase.slots_used = purchase.slots_used - 1
        purchase.save(update_fields=["slots_used", "updated_at"])


def cancel_pending_purchase(purchase: ListingPackagePurchase) -> None:
    """Mark purchase cancelled when payment failed after initiation."""
    if purchase.status == ListingPackagePurchase.Status.PENDING:
        purchase.status = ListingPackagePurchase.Status.CANCELLED
        purchase.save(update_fields=["status", "updated_at"])
