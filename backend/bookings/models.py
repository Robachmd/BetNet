import builtins

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

_property = builtins.property


class Booking(models.Model):
    """Property visit / rental scheduling between renter and landlord."""

    class BookingType(models.TextChoices):
        VISIT = "VISIT", "Property Visit"
        RENTAL = "RENTAL", "Rental Application"
        HALL_EVENT = "HALL_EVENT", "Hall Event"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"
        COMPLETED = "COMPLETED", "Completed"
        REJECTED = "REJECTED", "Rejected"

    VALID_TRANSITIONS = {
        Status.PENDING: {Status.CONFIRMED, Status.CANCELLED, Status.REJECTED},
        Status.CONFIRMED: {Status.CANCELLED, Status.COMPLETED},
        Status.CANCELLED: set(),
        Status.COMPLETED: set(),
        Status.REJECTED: set(),
    }

    property = models.ForeignKey(
        "properties.Property",
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    renter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    booking_type = models.CharField(
        max_length=10,
        choices=BookingType.choices,
        default=BookingType.VISIT,
    )
    visit_date = models.DateField()
    visit_time = models.TimeField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    message = models.TextField(blank=True, default="")
    landlord_response = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["property", "status"]),
            models.Index(fields=["renter", "status"]),
            models.Index(fields=["visit_date"]),
        ]

    def __str__(self):
        return (
            f"{self.get_booking_type_display()} – "
            f"{self.property.title} on {self.visit_date}"
        )

    def clean(self):
        if self.visit_date and self.visit_date < timezone.now().date():
            raise ValidationError({"visit_date": "Visit date cannot be in the past."})

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.VALID_TRANSITIONS.get(self.status, set())


class HallBooking(models.Model):
    """Event space reservation for HALL_RENTAL properties."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"
        COMPLETED = "COMPLETED", "Completed"

    VALID_TRANSITIONS = {
        Status.PENDING: {Status.CONFIRMED, Status.CANCELLED},
        Status.CONFIRMED: {Status.CANCELLED, Status.COMPLETED},
        Status.CANCELLED: set(),
        Status.COMPLETED: set(),
    }

    property = models.ForeignKey(
        "properties.Property",
        on_delete=models.CASCADE,
        related_name="hall_bookings",
        limit_choices_to={"property_type": "HALL_RENTAL"},
    )
    renter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hall_bookings",
    )
    event_date = models.DateField()
    event_end_date = models.DateField(null=True, blank=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    guest_count = models.PositiveIntegerField()
    event_type = models.CharField(max_length=100)
    special_requests = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["property", "event_date"]),
            models.Index(fields=["renter", "status"]),
        ]

    def __str__(self):
        return f"{self.event_type} at {self.property.title} on {self.event_date}"

    def clean(self):
        errors = {}
        today = timezone.now().date()

        if self.event_date and self.event_date < today:
            errors["event_date"] = "Event date cannot be in the past."

        if self.event_end_date:
            if self.event_end_date < self.event_date:
                errors["event_end_date"] = (
                    "End date cannot be before the start date."
                )

        if self.start_time and self.end_time and self.start_time >= self.end_time:
            if not self.event_end_date or self.event_end_date == self.event_date:
                errors["end_time"] = "End time must be after start time for same-day events."

        if errors:
            raise ValidationError(errors)

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.VALID_TRANSITIONS.get(self.status, set())

    @_property
    def duration_days(self) -> int:
        if self.event_end_date and self.event_end_date > self.event_date:
            return (self.event_end_date - self.event_date).days + 1
        return 1

    @_property
    def booked_dates(self) -> list:
        """Return every date covered by this booking."""
        from datetime import timedelta

        end = self.event_end_date or self.event_date
        return [
            self.event_date + timedelta(days=i)
            for i in range((end - self.event_date).days + 1)
        ]


class UnavailableDate(models.Model):
    """Dates a property (typically a hall) is marked unavailable."""

    property = models.ForeignKey(
        "properties.Property",
        on_delete=models.CASCADE,
        related_name="unavailable_dates",
    )
    date = models.DateField()
    reason = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("property", "date")
        ordering = ["date"]

    def __str__(self):
        return f"{self.property.title} – {self.date}"
