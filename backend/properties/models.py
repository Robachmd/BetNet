import builtins
import os

from django.conf import settings
from django.db import models
from django.utils.text import slugify

_property = builtins.property
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MinValueValidator


class City(models.Model):
    """Canonical Ethiopian cities for listings, search, and filters."""

    name = models.CharField(max_length=120, unique=True, db_index=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True, db_index=True)
    region = models.CharField(
        max_length=120,
        blank=True,
        default="",
        help_text="Regional state or charter (for grouping and search).",
    )
    search_text = models.TextField(
        blank=True,
        default="",
        help_text="Optional alternate spellings / transliterations (space-separated).",
    )
    sort_order = models.PositiveIntegerField(
        default=100,
        db_index=True,
        help_text="Lower values appear first in dropdowns.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "cities"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:120] or "city"
            slug = base
            n = 1
            while City.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Location(models.Model):
    city_ref = models.ForeignKey(
        City,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="locations",
        help_text="Canonical city; keeps Location.city string in sync when set.",
    )
    city = models.CharField(max_length=100, db_index=True)
    sub_city = models.CharField(max_length=100, db_index=True)
    woreda = models.CharField(max_length=50, blank=True, default="")
    kebele = models.CharField(max_length=50, blank=True, default="")
    specific_location = models.CharField(
        max_length=255,
        help_text='Landmark description, e.g. "near Bole Medhanialem"',
    )
    maps_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        help_text="Google Maps / Apple Maps share link — renters open this instead of typing coordinates.",
    )
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-90)],
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-180)],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["city", "sub_city"]

    def save(self, *args, **kwargs):
        if self.city_ref_id:
            self.city = self.city_ref.name
        super().save(*args, **kwargs)

    def __str__(self):
        parts = [self.city, self.sub_city]
        if self.woreda:
            parts.append(f"Woreda {self.woreda}")
        return ", ".join(parts)


class Amenities(models.Model):
    class WaterAvailability(models.TextChoices):
        ALWAYS = "ALWAYS", "Always Available"
        SOMETIMES = "SOMETIMES", "Sometimes Available"
        RARELY = "RARELY", "Rarely Available"

    class ElectricityStability(models.TextChoices):
        STABLE = "STABLE", "Stable"
        MODERATE = "MODERATE", "Moderate"
        UNSTABLE = "UNSTABLE", "Unstable"

    water_availability = models.CharField(
        max_length=10,
        choices=WaterAvailability.choices,
        default=WaterAvailability.SOMETIMES,
    )
    electricity_stability = models.CharField(
        max_length=10,
        choices=ElectricityStability.choices,
        default=ElectricityStability.MODERATE,
    )
    has_parking = models.BooleanField(default=False)
    has_wifi = models.BooleanField(default=False)
    has_security = models.BooleanField(default=False)
    has_generator = models.BooleanField(default=False)
    is_furnished = models.BooleanField(default=False)
    has_elevator = models.BooleanField(default=False)
    has_balcony = models.BooleanField(default=False)
    has_garden = models.BooleanField(default=False)
    has_cctv = models.BooleanField(default=False)
    pets_allowed = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "amenities"

    def __str__(self):
        features = [
            name.replace("has_", "").replace("is_", "").replace("_", " ").title()
            for name in [
                "has_parking",
                "has_wifi",
                "has_security",
                "has_generator",
                "is_furnished",
                "has_elevator",
                "has_balcony",
                "has_garden",
                "has_cctv",
            ]
            if getattr(self, name)
        ]
        return ", ".join(features[:4]) or "Basic amenities"


class Property(models.Model):
    class PropertyType(models.TextChoices):
        APARTMENT = "APARTMENT", "Apartment"
        VILLA = "VILLA", "Villa"
        CONDOMINIUM = "CONDOMINIUM", "Condominium"
        SERVICE_HOUSE = "SERVICE_HOUSE", "Service House"
        REAL_ESTATE = "REAL_ESTATE", "Real Estate"
        BUSINESS_SHOP = "BUSINESS_SHOP", "Business Shop"
        HALL_RENTAL = "HALL_RENTAL", "Hall Rental"

    class ListingType(models.TextChoices):
        RENT = "rent", "For rent"
        SALE = "sale", "For sale"
        SHORT_TERM = "short_term", "Short-term rental"

    class BedroomCount(models.TextChoices):
        STUDIO = "STUDIO", "Studio"
        ONE = "ONE", "1 Bedroom"
        TWO = "TWO", "2 Bedrooms"
        THREE_PLUS = "THREE_PLUS", "3+ Bedrooms"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="properties",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField()

    property_type = models.CharField(
        max_length=15,
        choices=PropertyType.choices,
        db_index=True,
    )
    bedrooms = models.CharField(
        max_length=10,
        choices=BedroomCount.choices,
        blank=True,
        default="",
    )
    bathrooms = models.PositiveIntegerField(default=1)
    shop_class_count = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="For business shops: number of classes (rooms, counters, or separate areas).",
    )
    floor_number = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Floor (for apartment, condominium, real estate listings).",
    )
    area_sqm = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    price_monthly = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Monthly rent, short-term rate, or total asking price when listing is for sale.",
    )
    price_currency = models.CharField(max_length=3, default="ETB")

    listing_type = models.CharField(
        max_length=12,
        choices=ListingType.choices,
        default=ListingType.RENT,
        db_index=True,
        help_text="Whether the owner is offering the property for rent, sale, or short-term rent.",
    )

    location = models.OneToOneField(
        Location, on_delete=models.CASCADE, related_name="property"
    )
    amenities = models.OneToOneField(
        Amenities, on_delete=models.CASCADE, related_name="property"
    )

    is_verified = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    is_available = models.BooleanField(default=True, db_index=True)
    listing_slot_purchase = models.ForeignKey(
        "payments.ListingPackagePurchase",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="properties",
        help_text="Purchase record that provided the slot for this published listing.",
    )
    is_published = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Set to True when published using a package slot (or legacy fee flow).",
    )
    verification_date = models.DateTimeField(null=True, blank=True)

    total_views = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "properties"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["property_type", "is_available"]),
            models.Index(fields=["price_monthly"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Property.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def primary_image(self):
        return self.images.filter(is_primary=True).first() or self.images.first()

    @property
    def is_hall(self):
        return self.property_type == self.PropertyType.HALL_RENTAL


class HallDetail(models.Model):
    """Extra fields that only apply to HALL_RENTAL properties."""

    class HallType(models.TextChoices):
        WEDDING = "WEDDING", "Wedding Hall"
        MEETING = "MEETING", "Meeting Room"
        CONFERENCE = "CONFERENCE", "Conference Hall"
        PARTY = "PARTY", "Party Venue"
        OUTDOOR_GARDEN = "OUTDOOR_GARDEN", "Outdoor Garden"

    property = models.OneToOneField(
        Property, on_delete=models.CASCADE, related_name="hall_detail"
    )
    capacity = models.PositiveIntegerField(
        help_text="Maximum number of guests"
    )
    price_per_hour = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    price_per_day = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    has_sound_system = models.BooleanField(default=False)
    has_stage = models.BooleanField(default=False)
    decoration_allowed = models.BooleanField(default=True)
    catering_available = models.BooleanField(default=False)
    is_indoor = models.BooleanField(default=True)
    hall_type = models.CharField(
        max_length=15,
        choices=HallType.choices,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Hall Detail"
        verbose_name_plural = "Hall Details"

    def __str__(self):
        return f"Hall details for {self.property.title}"


def property_image_path(instance, filename):
    return f"properties/{instance.property.pk}/images/{filename}"


def property_video_path(instance, filename):
    return f"properties/{instance.property_id}/videos/{filename}"


class PropertyImage(models.Model):
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to=property_image_path)
    is_primary = models.BooleanField(default=False)
    caption = models.CharField(max_length=200, blank=True, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "-uploaded_at"]

    def __str__(self):
        return f"Image for {self.property.title}"

    def save(self, *args, **kwargs):
        if self.is_primary:
            PropertyImage.objects.filter(
                property=self.property, is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class PropertyVideo(models.Model):
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="videos"
    )
    video = models.FileField(
        upload_to=property_video_path,
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(
                allowed_extensions=["mp4", "webm", "mov", "mkv", "m4v", "3gp"]
            )
        ],
        help_text="Short walkthrough clip (MP4, WebM, MOV — max 75 MB on upload).",
    )
    video_url = models.URLField(
        blank=True,
        default="",
        help_text="Optional: external link (e.g. YouTube) if not uploading a file.",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Video for {self.property.title}"

    def video_mime_type(self):
        """MIME type for HTML <source type=\"…\"> (helps mobile browsers play uploads)."""
        if not self.video:
            return ""
        ext = os.path.splitext(self.video.name)[1].lower()
        return {
            ".mp4": "video/mp4",
            ".m4v": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".mkv": "video/x-matroska",
            ".3gp": "video/3gpp",
        }.get(ext, "video/mp4")

    def clean(self):
        super().clean()
        has_file = bool(self.video)
        has_url = bool((self.video_url or "").strip())
        if not has_file and not has_url:
            raise ValidationError(
                "Provide an uploaded video file or a video URL."
            )

    @_property
    def has_uploaded_file(self):
        return bool(self.video)


class FavoriteProperty(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorite_properties",
    )
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="favorited_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "property")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.property.title}"


class PropertyReport(models.Model):
    class Reason(models.TextChoices):
        FAKE = "FAKE", "Fake Listing"
        DUPLICATE = "DUPLICATE", "Duplicate Listing"
        INAPPROPRIATE = "INAPPROPRIATE", "Inappropriate Content"
        SCAM = "SCAM", "Potential Scam"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        REVIEWED = "REVIEWED", "Reviewed"
        RESOLVED = "RESOLVED", "Resolved"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="property_reports",
    )
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="reports"
    )
    reason = models.CharField(max_length=15, choices=Reason.choices)
    description = models.TextField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report on {self.property.title} – {self.get_reason_display()}"
