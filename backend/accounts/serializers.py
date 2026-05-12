import re

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from phonenumber_field.phonenumber import PhoneNumber
from phonenumber_field.serializerfields import PhoneNumberField
from rest_framework import serializers

from .models import IdentityVerificationSubmission, OwnerProfile, User


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
    )
    password_confirm = serializers.CharField(write_only=True)
    phone_number = PhoneNumberField(region="ET")
    requested_roles = serializers.ListField(
        child=serializers.ChoiceField(choices=[User.Role.RENTER, User.Role.LANDLORD]),
        required=False,
        allow_empty=False,
        write_only=True,
        help_text="Optional multi-role signup, e.g. ['RENTER','LANDLORD']. Backward-compatible with 'role'.",
    )

    class Meta:
        model = User
        fields = [
            "phone_number",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "email",
            "role",
            "requested_roles",
            "preferred_language",
        ]

    def validate_email(self, value):
        v = (value or "").strip().lower()
        if not v:
            raise serializers.ValidationError("Email is required.")
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return v

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "A user with this phone number already exists."
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        requested_roles = validated_data.pop("requested_roles", None)
        role = validated_data.get("role", User.Role.RENTER)
        roles = []
        if requested_roles:
            roles = [str(r).upper() for r in requested_roles]
        else:
            roles = [str(role).upper()]

        if User.Role.LANDLORD in roles:
            validated_data["landlord_eligible"] = True
            validated_data["active_app_mode"] = User.AppMode.LANDLORD
            validated_data["role"] = User.Role.LANDLORD
        else:
            validated_data["active_app_mode"] = User.AppMode.RENTER
            validated_data["role"] = User.Role.RENTER

        validated_data["roles"] = roles
        return User.objects.create_user(password=password, **validated_data)


class UserLoginSerializer(serializers.Serializer):
    phone_number = PhoneNumberField(region="ET")
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        phone_number = str(attrs["phone_number"])
        password = attrs["password"]

        user = authenticate(
            request=self.context.get("request"),
            phone_number=phone_number,
            password=password,
        )
        if user is None:
            raise serializers.ValidationError(
                "Invalid phone number or password."
            )
        if not user.is_active:
            raise serializers.ValidationError("This account is deactivated.")
        attrs["user"] = user
        return attrs


class UserIdentifierLoginSerializer(serializers.Serializer):
    """
    Login with either phone number or email, using a single `identifier` field.
    Backward-compatible with clients that still send `phone_number`.
    """

    identifier = serializers.CharField(required=False, allow_blank=True)
    phone_number = PhoneNumberField(region="ET", required=False)
    password = serializers.CharField(write_only=True)

    def _as_phone_e164(self, raw: str) -> str:
        s = (raw or "").strip()
        if not s:
            raise serializers.ValidationError("Phone number is required.")
        try:
            pn = PhoneNumber.from_string(s, region="ET")
        except Exception:
            raise serializers.ValidationError("Invalid phone number.")
        if not pn or not pn.is_valid():
            raise serializers.ValidationError("Invalid phone number.")
        return pn.as_e164

    def validate(self, attrs):
        password = attrs.get("password") or ""
        ident = (attrs.get("identifier") or "").strip()

        # Backward compatibility: prefer explicit phone_number if provided.
        if not ident and attrs.get("phone_number"):
            ident = str(attrs["phone_number"])

        if not ident:
            raise serializers.ValidationError({"identifier": "Email or phone number is required."})

        request = self.context.get("request")

        # Email path.
        if "@" in ident:
            email = ident.lower()
            user = (
                User.objects.filter(email__iexact=email)
                .order_by("-id")
                .first()
            )
            if user is None or not user.check_password(password):
                raise serializers.ValidationError("Invalid email/phone or password.")
            if not user.is_active:
                raise serializers.ValidationError("This account is deactivated.")
            attrs["user"] = user
            return attrs

        # Phone path.
        phone_e164 = self._as_phone_e164(ident)
        user = authenticate(
            request=request,
            phone_number=phone_e164,
            password=password,
        )
        if user is None:
            raise serializers.ValidationError("Invalid email/phone or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is deactivated.")
        attrs["user"] = user
        return attrs


class OTPRequestSerializer(serializers.Serializer):
    phone_number = PhoneNumberField(region="ET")

    def validate_phone_number(self, value):
        if not User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "No account found with this phone number."
            )
        return value


class OTPVerifySerializer(serializers.Serializer):
    phone_number = PhoneNumberField(region="ET")
    otp = serializers.CharField(max_length=6, min_length=6)

    def validate_otp(self, value):
        if not re.fullmatch(r"\d{6}", value):
            raise serializers.ValidationError("OTP must be exactly 6 digits.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    phone_number = PhoneNumberField(region="ET")
    otp = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
    )
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_otp(self, value):
        if not re.fullmatch(r"\d{6}", value):
            raise serializers.ValidationError("OTP must be exactly 6 digits.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    phone_number = PhoneNumberField(read_only=True)
    roles = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "phone_number",
            "email",
            "first_name",
            "last_name",
            "role",
            "roles",
            "landlord_eligible",
            "active_app_mode",
            "owner_type",
            "profile_image",
            "id_verified",
            "phone_verified",
            "preferred_language",
            "city",
            "sub_city",
            "bio",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "phone_number",
            "id_verified",
            "phone_verified",
            "date_joined",
            "last_login",
            "landlord_eligible",
        ]


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "profile_image",
            "preferred_language",
            "city",
            "sub_city",
            "bio",
            "owner_type",
            "active_app_mode",
        ]

    def validate_email(self, value):
        user = self.context["request"].user
        if (
            value
            and User.objects.filter(email=value).exclude(pk=user.pk).exists()
        ):
            raise serializers.ValidationError(
                "This email is already in use."
            )
        return value

    def validate_owner_type(self, value):
        user = self.context["request"].user
        if value and not (
            user.role == User.Role.LANDLORD
            or getattr(user, "landlord_eligible", False)
        ):
            raise serializers.ValidationError(
                "owner_type is only for property owner accounts."
            )
        return value

    def validate_active_app_mode(self, value):
        user = self.context["request"].user
        if value == User.AppMode.LANDLORD and not getattr(user, "can_access_owner_tools", lambda: False)():
            raise serializers.ValidationError(
                "Use ‘Become a property owner’ before switching to owner mode."
            )
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
    )
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        return attrs


class PropertyOwnerPublicProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "profile_image",
            "phone_verified",
            "id_verified",
            "owner_type",
            "city",
            "sub_city",
            "bio",
            "date_joined",
        ]


# Backward-compatible alias during transition.
class LandlordPublicProfileSerializer(PropertyOwnerPublicProfileSerializer):
    pass


class AdminUserSerializer(serializers.ModelSerializer):
    """Minimal user row for admin mobile/web moderation UIs."""

    class Meta:
        model = User
        fields = [
            "id",
            "phone_number",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "phone_verified",
            "id_verified",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields


class OwnerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerProfile
        fields = [
            "display_name",
            "company_legal_name",
            "trade_license_number",
            "license_expiry",
            "website",
            "logo",
            "verified_badge",
            "verified_at",
            "public_slug",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("verified_badge", "verified_at", "created_at", "updated_at")


class IdentityVerificationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentityVerificationSubmission
        fields = [
            "id",
            "status",
            "review_notes",
            "reviewed_at",
            "created_at",
            "updated_at",
            "id_document_front",
            "id_document_back",
            "selfie",
        ]
        read_only_fields = fields


class IdentityVerificationSubmitSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentityVerificationSubmission
        fields = [
            "id_document_front",
            "id_document_back",
            "selfie",
        ]

    def validate(self, attrs):
        if not attrs.get("id_document_front") and not attrs.get("selfie"):
            raise serializers.ValidationError(
                "Upload at least an ID document front photo and a selfie."
            )
        return attrs
