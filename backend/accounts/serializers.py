import re

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from phonenumber_field.serializerfields import PhoneNumberField
from rest_framework import serializers

from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
    )
    password_confirm = serializers.CharField(write_only=True)
    phone_number = PhoneNumberField(region="ET")

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
            "preferred_language",
        ]

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
        return User.objects.create_user(**validated_data)


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


class UserProfileSerializer(serializers.ModelSerializer):
    phone_number = PhoneNumberField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "phone_number",
            "email",
            "first_name",
            "last_name",
            "role",
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


class LandlordPublicProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "profile_image",
            "phone_verified",
            "id_verified",
            "city",
            "sub_city",
            "bio",
            "date_joined",
        ]
