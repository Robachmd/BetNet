import random
import string

from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from phonenumber_field.modelfields import PhoneNumberField


class UserManager(BaseUserManager):
    """Custom manager where phone_number is the unique identifier."""

    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError("Phone number is required")
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(phone_number, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        RENTER = "RENTER", "Renter"
        LANDLORD = "LANDLORD", "Property Owner"
        ADMIN = "ADMIN", "Admin"

    class OwnerType(models.TextChoices):
        """Business type for property owners."""
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        AGENT = "AGENT", "Agent / broker"
        COMPANY = "COMPANY", "Real estate company"

    class Language(models.TextChoices):
        EN = "EN", "English"
        AM = "AM", "Amharic"
        OM = "OM", "Afaan Oromo"

    class AppMode(models.TextChoices):
        """Which home/dashboard the user last chose (one account, two experiences)."""
        RENTER = "RENTER", "Renter / browsing"
        LANDLORD = "LANDLORD", "Property owner / listings"

    username = None  # Remove default username field

    phone_number = PhoneNumberField(
        unique=True,
        region="ET",
        help_text="Ethiopian phone number (e.g. +251911234567)",
    )
    email = models.EmailField(blank=True, default="")
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.RENTER,
    )
    landlord_eligible = models.BooleanField(
        default=False,
        help_text="True if the user may list properties: registered as a property owner or completed owner opt-in.",
    )
    active_app_mode = models.CharField(
        max_length=10,
        choices=AppMode.choices,
        default=AppMode.RENTER,
        db_index=True,
        help_text="Last selected dashboard: renter vs property owner (same login).",
    )
    profile_image = models.ImageField(
        upload_to="profile_images/%Y/%m/",
        blank=True,
        default="",
    )
    id_verified = models.BooleanField(
        default=False,
        help_text="Whether identity document has been verified (KYC).",
    )
    phone_verified = models.BooleanField(default=False)
    preferred_language = models.CharField(
        max_length=2,
        choices=Language.choices,
        default=Language.EN,
    )
    city = models.CharField(max_length=100, blank=True, default="")
    sub_city = models.CharField(max_length=100, blank=True, default="")
    bio = models.TextField(blank=True, default="")
    owner_type = models.CharField(
        max_length=10,
        choices=OwnerType.choices,
        blank=True,
        default="",
        help_text="Set for property owners: individual, agent, or company.",
    )

    # OTP fields
    otp = models.CharField(max_length=6, blank=True, default="")
    otp_created_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.get_full_name() or self.phone_number} ({self.role})"

    def generate_otp(self) -> str:
        """Generate a 6-digit OTP and persist it."""
        self.otp = "".join(random.choices(string.digits, k=6))
        self.otp_created_at = timezone.now()
        self.save(update_fields=["otp", "otp_created_at"])
        return self.otp

    def verify_otp(self, code: str) -> bool:
        """Return True if *code* matches and was created < 5 minutes ago."""
        if not self.otp or not self.otp_created_at:
            return False
        if self.otp != code:
            return False
        elapsed = (timezone.now() - self.otp_created_at).total_seconds()
        if elapsed > 300:  # 5 minutes
            return False
        self.otp = ""
        self.otp_created_at = None
        self.phone_verified = True
        self.save(update_fields=["otp", "otp_created_at", "phone_verified"])
        return True


class OwnerProfile(models.Model):
    """Extended profile for property owners: agency/company details and public branding."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="owner_profile",
    )
    display_name = models.CharField(
        max_length=200,
        blank=True,
        default="",
        help_text="Public display name (e.g. brand). Falls back to user name if empty.",
    )
    company_legal_name = models.CharField(max_length=255, blank=True, default="")
    trade_license_number = models.CharField(max_length=100, blank=True, default="")
    license_expiry = models.DateField(null=True, blank=True)
    website = models.URLField(blank=True, default="")
    logo = models.ImageField(
        upload_to="owner_logos/%Y/%m/",
        blank=True,
        default="",
    )
    verified_badge = models.BooleanField(
        default=False,
        help_text="KYC / business verification badge (set by staff after review).",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    public_slug = models.SlugField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        help_text="Optional /company/{slug} public page.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"OwnerProfile({self.user_id})"


class IdentityVerificationSubmission(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="identity_verifications",
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    id_document_front = models.ImageField(
        upload_to="verification/id_front/%Y/%m/",
        blank=True,
        default="",
    )
    id_document_back = models.ImageField(
        upload_to="verification/id_back/%Y/%m/",
        blank=True,
        default="",
    )
    selfie = models.ImageField(
        upload_to="verification/selfie/%Y/%m/",
        blank=True,
        default="",
    )
    review_notes = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return f"IdentityVerificationSubmission({self.user_id}, {self.status})"
