from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        NEW_LISTING = "NEW_LISTING", "New Listing"
        PRICE_DROP = "PRICE_DROP", "Price Drop"
        BOOKING_CONFIRMED = "BOOKING_CONFIRMED", "Booking Confirmed"
        BOOKING_CANCELLED = "BOOKING_CANCELLED", "Booking Cancelled"
        NEW_MESSAGE = "NEW_MESSAGE", "New Message"
        REVIEW_RECEIVED = "REVIEW_RECEIVED", "Review Received"
        LISTING_VERIFIED = "LISTING_VERIFIED", "Listing Verified"
        PAYMENT_RECEIVED = "PAYMENT_RECEIVED", "Payment Received"
        BOOKING_VISIT_REQUEST = "BOOKING_VISIT_REQUEST", "Visit Booking Request"
        VISIT_REMINDER = "VISIT_REMINDER", "Visit Reminder"
        SYSTEM = "SYSTEM", "System"
        LISTING_PACKAGE_LOW = "LISTING_PACKAGE_LOW", "Listing package: few credits left"
        LISTING_PACKAGE_DEPLETED = (
            "LISTING_PACKAGE_DEPLETED",
            "Listing package: credits used up",
        )
        LISTING_PACKAGE_EXPIRING = (
            "LISTING_PACKAGE_EXPIRING",
            "Listing package: expiring soon",
        )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=32,
        choices=NotificationType.choices,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.get_notification_type_display()} → {self.recipient}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    new_listing_alerts = models.BooleanField(default=True)
    price_drop_alerts = models.BooleanField(default=True)
    booking_updates = models.BooleanField(default=True)
    message_notifications = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"

    def __str__(self):
        return f"Preferences for {self.user}"


class LocationAlert(models.Model):
    """
    User-defined area to receive NEW_LISTING notifications when a property is
    first published in/near that area (city + optional sub-city, or radius
    around coordinates when the listing has map coordinates).
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="location_alerts",
    )
    label = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Short name shown in the app (e.g. 'Near Bole').",
    )
    city = models.CharField(
        max_length=100,
        db_index=True,
    )
    sub_city = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="If empty, the whole city is watched (text match).",
    )
    property_type = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Optional filter, matches Property.property_type (e.g. APARTMENT). Leave blank for any.",
    )
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Optional center for radius matching when the listing has coordinates.",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    radius_km = models.PositiveSmallIntegerField(
        default=5,
        help_text="Used when you set lat/lng; listing must be within this distance (km) if it has coordinates.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.city}" + (f" ({self.sub_city})" if self.sub_city else "")
