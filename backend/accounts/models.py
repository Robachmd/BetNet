import random
import string

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
        LANDLORD = "LANDLORD", "Landlord"
        ADMIN = "ADMIN", "Admin"

    class Language(models.TextChoices):
        EN = "EN", "English"
        AM = "AM", "Amharic"
        OM = "OM", "Afaan Oromo"

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
