import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Payment(models.Model):
    class PaymentType(models.TextChoices):
        LISTING_FEE = "LISTING_FEE", "Listing Fee"
        FEATURED_LISTING = "FEATURED_LISTING", "Featured Listing"
        VERIFICATION_FEE = "VERIFICATION_FEE", "Verification Fee"
        SUBSCRIPTION = "SUBSCRIPTION", "Subscription"
        HALL_BOOKING = "HALL_BOOKING", "Hall Booking"
        COMMISSION = "COMMISSION", "Commission"

    class PaymentMethod(models.TextChoices):
        CHAPA = "CHAPA", "Chapa"
        TELEBIRR = "TELEBIRR", "Telebirr"
        STRIPE = "STRIPE", "Stripe"
        BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    payment_type = models.CharField(max_length=20, choices=PaymentType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="ETB")
    payment_method = models.CharField(max_length=15, choices=PaymentMethod.choices)
    transaction_id = models.CharField(max_length=100, unique=True, db_index=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    property = models.ForeignKey(
        "properties.Property",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    hall_booking = models.ForeignKey(
        "bookings.HallBooking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    description = models.TextField(blank=True, default="")
    payment_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["transaction_id"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return (
            f"{self.get_payment_type_display()} – {self.amount} {self.currency} "
            f"({self.get_status_display()})"
        )

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            self.transaction_id = self.generate_tx_ref()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_tx_ref() -> str:
        return f"BTRT-{uuid.uuid4().hex[:12].upper()}"

    def mark_completed(self, provider_data: dict | None = None):
        self.status = self.Status.COMPLETED
        if provider_data:
            self.payment_data = provider_data
        self.save(update_fields=["status", "payment_data", "updated_at"])

    def mark_failed(self, provider_data: dict | None = None):
        self.status = self.Status.FAILED
        if provider_data:
            self.payment_data = provider_data
        self.save(update_fields=["status", "payment_data", "updated_at"])


class Subscription(models.Model):
    class Plan(models.TextChoices):
        BASIC = "BASIC", "Basic"
        STANDARD = "STANDARD", "Standard"
        PREMIUM = "PREMIUM", "Premium"

    PLAN_DEFAULTS = {
        Plan.BASIC: {"price": 0, "max_listings": 3, "features": ["basic_support"]},
        Plan.STANDARD: {
            "price": 499,
            "max_listings": 15,
            "features": ["basic_support", "featured_badge", "analytics"],
        },
        Plan.PREMIUM: {
            "price": 999,
            "max_listings": 50,
            "features": [
                "priority_support",
                "featured_badge",
                "analytics",
                "unlimited_photos",
                "promoted_listings",
            ],
        },
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan = models.CharField(max_length=10, choices=Plan.choices, default=Plan.BASIC)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField()
    is_active = models.BooleanField(default=True, db_index=True)
    max_listings = models.IntegerField(default=3)
    features = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} – {self.get_plan_display()} (active={self.is_active})"

    @property
    def is_expired(self) -> bool:
        return self.end_date < timezone.now().date()

    def deactivate(self):
        self.is_active = False
        self.save(update_fields=["is_active"])
