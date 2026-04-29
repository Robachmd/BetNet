"""Notify property owners when an active package will expire within N days (credits not yet used)."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.translation import gettext as _

from notifications.models import Notification
from notifications.services import create_notification
from payments.models import ListingPackagePurchase


class Command(BaseCommand):
    help = (
        "Send a one-time in-app notification for listing packages that expire within "
        "7 days and still have unused credits."
    )

    def handle(self, *args, **options):
        now = timezone.now()
        soon = now + timedelta(days=7)
        qs = ListingPackagePurchase.objects.filter(
            status=ListingPackagePurchase.Status.ACTIVE,
            expiry_warning_notified=False,
            expires_at__isnull=False,
            expires_at__gt=now,
            expires_at__lte=soon,
        ).select_related("package", "user")

        n = 0
        for purchase in qs:
            if purchase.slots_remaining < 1:
                continue
            label = purchase.package.name or purchase.package.code
            create_notification(
                purchase.user,
                Notification.NotificationType.LISTING_PACKAGE_EXPIRING,
                _("Listing package expiring soon"),
                _(
                    "Your «%(name)s» package with unused listing credits expires on %(date)s. "
                    "Use your slots or consider renewing."
                )
                % {
                    "name": label,
                    "date": purchase.expires_at.date().isoformat()
                    if purchase.expires_at
                    else "",
                },
                data={
                    "purchase_id": purchase.pk,
                    "expires_at": purchase.expires_at.isoformat()
                    if purchase.expires_at
                    else None,
                },
            )
            purchase.expiry_warning_notified = True
            purchase.save(update_fields=["expiry_warning_notified", "updated_at"])
            n += 1

        self.stdout.write(self.style.SUCCESS(f"Listing package expiry warnings sent: {n}"))
