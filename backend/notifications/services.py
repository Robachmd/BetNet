import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.mail import send_mail

from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)


def create_notification(recipient, notification_type, title, message, data=None):
    """Create a notification and push it via WebSocket if the channel layer is available."""
    notification = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        data=data or {},
    )

    _push_ws_notification(notification)
    _dispatch_external(notification)

    return notification


def _push_ws_notification(notification):
    """Send real-time update through the WebSocket channel layer."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            f"notifications_{notification.recipient_id}",
            {
                "type": "send_notification",
                "notification": {
                    "id": notification.id,
                    "notification_type": notification.notification_type,
                    "title": notification.title,
                    "message": notification.message,
                    "data": notification.data,
                    "created_at": notification.created_at.isoformat(),
                },
            },
        )
    except Exception:
        logger.exception("Failed to push WebSocket notification")


def _dispatch_external(notification):
    """Route to email / SMS based on user preferences."""
    try:
        prefs = NotificationPreference.objects.get(user=notification.recipient)
    except NotificationPreference.DoesNotExist:
        prefs = None

    if prefs and prefs.email_notifications and notification.recipient.email:
        send_email_notification(
            notification.recipient.email,
            notification.title,
            notification.message,
        )

    if prefs and prefs.sms_notifications:
        phone = str(getattr(notification.recipient, "phone_number", ""))
        if phone:
            send_sms_notification(phone, notification.message)


def send_email_notification(email, subject, message):
    """Send an email notification."""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception:
        logger.exception("Failed to send email notification to %s", email)


def send_sms_notification(phone, message):
    """Placeholder for SMS gateway integration (e.g. Twilio, AfricasTalking)."""
    logger.info("SMS to %s: %s", phone, message[:80])


def notify_new_listing(property_obj):
    """Notify users who have new-listing alerts enabled in the same city."""
    from django.contrib.auth import get_user_model

    User = get_user_model()

    city = property_obj.location.city
    recipients = (
        User.objects.filter(
            city__iexact=city,
            notification_preferences__new_listing_alerts=True,
        )
        .exclude(pk=property_obj.owner_id)
    )

    for user in recipients.iterator():
        create_notification(
            recipient=user,
            notification_type=Notification.NotificationType.NEW_LISTING,
            title="New listing in your area",
            message=f'"{property_obj.title}" was just listed in {city}.',
            data={"property_id": property_obj.pk},
        )


def notify_price_drop(property_obj, old_price):
    """Notify users who favourited the property about the price drop."""
    from properties.models import FavoriteProperty

    favourites = FavoriteProperty.objects.filter(
        property=property_obj
    ).select_related("user")

    prefs_qs = NotificationPreference.objects.filter(
        user__favorite_properties__property=property_obj,
        price_drop_alerts=True,
    ).values_list("user_id", flat=True)
    eligible = set(prefs_qs)

    for fav in favourites.iterator():
        if fav.user_id in eligible:
            create_notification(
                recipient=fav.user,
                notification_type=Notification.NotificationType.PRICE_DROP,
                title="Price drop on a property you saved",
                message=(
                    f'"{property_obj.title}" dropped from '
                    f"{old_price:,.2f} ETB to {property_obj.price_monthly:,.2f} ETB."
                ),
                data={
                    "property_id": property_obj.pk,
                    "old_price": str(old_price),
                    "new_price": str(property_obj.price_monthly),
                },
            )


def notify_booking_update(booking):
    """Notify the renter and landlord about a booking status change."""
    status_label = booking.get_status_display()
    property_title = booking.property.title

    if booking.status == "CONFIRMED":
        ntype = Notification.NotificationType.BOOKING_CONFIRMED
    elif booking.status == "CANCELLED":
        ntype = Notification.NotificationType.BOOKING_CANCELLED
    else:
        ntype = Notification.NotificationType.SYSTEM

    create_notification(
        recipient=booking.renter,
        notification_type=ntype,
        title=f"Booking {status_label}",
        message=f'Your booking for "{property_title}" is now {status_label}.',
        data={"booking_id": booking.pk, "property_id": booking.property_id},
    )

    create_notification(
        recipient=booking.property.owner,
        notification_type=ntype,
        title=f"Booking {status_label}",
        message=f'A booking for "{property_title}" is now {status_label}.',
        data={"booking_id": booking.pk, "property_id": booking.property_id},
    )
