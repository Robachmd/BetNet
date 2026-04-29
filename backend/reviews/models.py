from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Review(models.Model):
    class ReviewType(models.TextChoices):
        PROPERTY_REVIEW = "PROPERTY_REVIEW", "Property Review"
        LANDLORD_REVIEW = "LANDLORD_REVIEW", "Property Owner Review"
        TENANT_REVIEW = "TENANT_REVIEW", "Tenant Review"

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_given",
    )
    review_type = models.CharField(
        max_length=20,
        choices=ReviewType.choices,
        db_index=True,
    )
    property = models.ForeignKey(
        "properties.Property",
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    reviewed_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_received",
        null=True,
        blank=True,
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    title = models.CharField(max_length=255)
    comment = models.TextField()
    is_approved = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["reviewer", "property"],
                condition=models.Q(property__isnull=False),
                name="unique_review_per_user_per_property",
            ),
            models.UniqueConstraint(
                fields=["reviewer", "reviewed_user", "review_type"],
                condition=models.Q(reviewed_user__isnull=False),
                name="unique_review_per_user_per_reviewed_user_type",
            ),
        ]
        indexes = [
            models.Index(fields=["property", "-created_at"]),
            models.Index(fields=["reviewed_user", "-created_at"]),
        ]

    def __str__(self):
        target = self.property or self.reviewed_user
        return f"{self.reviewer} → {target} ({self.rating}★)"


class ReviewResponse(models.Model):
    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name="response",
    )
    responder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="review_responses",
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Response by {self.responder} to review #{self.review_id}"
