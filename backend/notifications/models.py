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
