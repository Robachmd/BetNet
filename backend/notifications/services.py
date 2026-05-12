import logging
import math
from datetime import datetime

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone as django_timezone

from .models import LocationAlert, Notification, NotificationPreference

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


def _haversine_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Great-circle distance between two WGS84 points in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    h = (
        math.sin(dphi / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    )
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def _location_alert_matches(alert: LocationAlert, property_obj) -> bool:
    """True if the published property falls inside this watch definition."""
    loc = property_obj.location
    if getattr(alert, "only_available_listings", True) and not getattr(
        property_obj, "is_available", True
    ):
        return False
    if loc.city.strip().lower() != alert.city.strip().lower():
        return False
    types_filter = getattr(alert, "property_types", None) or []
    if types_filter:
        allowed = {str(x).strip().upper() for x in types_filter if str(x).strip()}
        if allowed:
            pt = str(property_obj.property_type).strip().upper()
            if pt not in allowed:
                return False
    alat, alon = alert.latitude, alert.longitude
    plat, plon = loc.latitude, loc.longitude
    if (
        alat is not None
        and alon is not None
        and plat is not None
        and plon is not None
    ):
        dist = _haversine_km(
            float(plat), float(plon), float(alat), float(alon)
        )
        return dist <= float(alert.radius_km)
    if alert.sub_city and alert.sub_city.strip():
        return loc.sub_city.strip().lower() == alert.sub_city.strip().lower()
    return True


def notify_subscribers_of_new_listing(property_obj):
    """
    Notify every user (except the poster) with at least one **active** LocationAlert
    that matches this property. Users with `new_listing_alerts=False` are skipped;
    missing preference rows are treated as opted in. At most one notification
    per user per property.
    """
    users_opted_out = NotificationPreference.objects.filter(
        new_listing_alerts=False
    ).values_list("user_id", flat=True)
    alerts = (
        LocationAlert.objects.filter(is_active=True, user__is_active=True)
        .exclude(user_id=property_obj.owner_id)
        .exclude(user_id__in=users_opted_out)
        .select_related("user")
    )

    seen_recipients: set[int] = set()
    loc = property_obj.location
    place = f"{loc.city}" + (f", {loc.sub_city}" if loc.sub_city else "")
    for alert in alerts.iterator():
        if alert.user_id in seen_recipients:
            continue
        if not _location_alert_matches(alert, property_obj):
            continue
        create_notification(
            recipient=alert.user,
            notification_type=Notification.NotificationType.NEW_LISTING,
            title="New listing in your area",
            message=f'"{property_obj.title}" was just listed in {place}.',
            data={
                "property_id": property_obj.pk,
                "property_slug": property_obj.slug,
                "location_alert_id": alert.pk,
            },
        )
        seen_recipients.add(alert.user_id)


# Backwards-compatible name
notify_new_listing = notify_subscribers_of_new_listing


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


def notify_visit_booking_created(booking):
    """Notify property owner when a renter requests a property visit."""
    if booking.booking_type != booking.BookingType.VISIT:
        return
    prop = booking.property
    aware_dt = django_timezone.make_aware(
        datetime.combine(booking.visit_date, booking.visit_time)
    )
    dt_str = django_timezone.localtime(aware_dt).strftime("%b %d, %Y at %I:%M %p")
    create_notification(
        recipient=prop.owner,
        notification_type=Notification.NotificationType.BOOKING_VISIT_REQUEST,
        title="New visit request",
        message=(
            f'{booking.renter.get_full_name() or booking.renter} requested a visit to '
            f'"{prop.title}" on {dt_str}.'
        ),
        data={
            "booking_id": booking.pk,
            "property_id": prop.pk,
            "property_slug": prop.slug,
        },
    )


def send_visit_day_reminders():
    """
    Send notifications for visits scheduled for today. Idempotent per booking.
    Call from cron: python manage.py send_visit_reminders
    """
    from bookings.models import Booking

    today = django_timezone.localdate()
    qs = Booking.objects.filter(
        booking_type=Booking.BookingType.VISIT,
        visit_date=today,
        visit_reminder_sent=False,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
    ).select_related("property", "property__owner", "renter")

    for booking in qs.iterator():
        prop = booking.property
        aware_dt = django_timezone.make_aware(
            datetime.combine(booking.visit_date, booking.visit_time)
        )
        time_str = django_timezone.localtime(aware_dt).strftime("%I:%M %p")
        title = f"Visit today: {prop.title}"
        body = (
            f'Your visit for "{prop.title}" is scheduled today at {time_str}.'
        )
        create_notification(
            recipient=booking.renter,
            notification_type=Notification.NotificationType.VISIT_REMINDER,
            title=title,
            message=body,
            data={
                "booking_id": booking.pk,
                "property_id": prop.pk,
                "property_slug": prop.slug,
            },
        )
        create_notification(
            recipient=prop.owner,
            notification_type=Notification.NotificationType.VISIT_REMINDER,
            title=title,
            message=(
                f'Visit scheduled today at {time_str} with '
                f"{booking.renter.get_full_name() or booking.renter} for "
                f'"{prop.title}".'
            ),
            data={
                "booking_id": booking.pk,
                "property_id": prop.pk,
                "property_slug": prop.slug,
            },
        )
        booking.visit_reminder_sent = True
        booking.save(update_fields=["visit_reminder_sent", "updated_at"])


def notify_booking_update(booking):
    """Notify the renter and property owner about a booking status change."""
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
