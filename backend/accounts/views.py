import logging

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import OwnerProfile
from .serializers import (
    ChangePasswordSerializer,
    PropertyOwnerPublicProfileSerializer,
    OwnerProfileSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
    UserUpdateSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def _can_use_owner_profile(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.role == User.Role.LANDLORD:
        return True
    return bool(getattr(user, "landlord_eligible", False))


def _get_tokens_for_user(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# ──────────────────────────────────────────────
#  Registration
# ──────────────────────────────────────────────
class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = _get_tokens_for_user(user)
        return Response(
            {
                "detail": "Registration successful.",
                "user": UserProfileSerializer(user).data,
                "tokens": tokens,
            },
            status=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────
#  Login
# ──────────────────────────────────────────────
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = _get_tokens_for_user(user)
        return Response(
            {
                "detail": "Login successful.",
                "user": UserProfileSerializer(user).data,
                "tokens": tokens,
            },
            status=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────
#  OTP Request
# ──────────────────────────────────────────────
class RequestOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone_number = serializer.validated_data["phone_number"]

        try:
            user = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            return Response(
                {"detail": "No account with this phone number."},
                status=status.HTTP_404_NOT_FOUND,
            )

        otp_code = user.generate_otp()

        # TODO: integrate with an SMS gateway (e.g. Twilio, AfricasTalking)
        logger.info("OTP %s generated for %s", otp_code, phone_number)

        return Response(
            {"detail": "OTP sent to your phone number."},
            status=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────
#  OTP Verification
# ──────────────────────────────────────────────
class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone_number = serializer.validated_data["phone_number"]
        otp = serializer.validated_data["otp"]

        try:
            user = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            return Response(
                {"detail": "No account with this phone number."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.verify_otp(otp):
            tokens = _get_tokens_for_user(user)
            return Response(
                {
                    "detail": "Phone number verified successfully.",
                    "tokens": tokens,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Invalid or expired OTP."},
            status=status.HTTP_400_BAD_REQUEST,
        )


# ──────────────────────────────────────────────
#  User Profile (self)
# ──────────────────────────────────────────────
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserProfileSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance.refresh_from_db()
        return Response(
            UserProfileSerializer(instance, context={"request": request}).data
        )


# ──────────────────────────────────────────────
#  Property owner: owner / company profile
# ──────────────────────────────────────────────
class OwnerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = OwnerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if not _can_use_owner_profile(request.user):
            return Response(
                {"detail": "Only property owners can use the owner profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().get(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        if not _can_use_owner_profile(request.user):
            return Response(
                {"detail": "Only property owners can use the owner profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().put(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        if not _can_use_owner_profile(request.user):
            return Response(
                {"detail": "Only property owners can use the owner profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().patch(request, *args, **kwargs)

    def get_object(self):
        profile, _ = OwnerProfile.objects.get_or_create(
            user=self.request.user, defaults={}
        )
        return profile


# ──────────────────────────────────────────────
#  Public Property Owner Profile
# ──────────────────────────────────────────────
class PropertyOwnerProfileView(generics.RetrieveAPIView):
    serializer_class = PropertyOwnerPublicProfileSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        from django.db.models import Q

        return User.objects.filter(
            is_active=True,
        ).filter(
            Q(role=User.Role.LANDLORD) | Q(landlord_eligible=True)
        )


# ──────────────────────────────────────────────
#  Change Password
# ──────────────────────────────────────────────
class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response(
            {"detail": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────
#  Opt-in: renter can become a property owner (one account, switch modes)
# ──────────────────────────────────────────────
class EnablePropertyOwnerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.landlord_eligible:
            return Response(
                {
                    "detail": "You already have property owner access.",
                    "user": UserProfileSerializer(user).data,
                },
                status=status.HTTP_200_OK,
            )
        if user.role not in (User.Role.RENTER, User.Role.LANDLORD):
            return Response(
                {"detail": "This action is for renter or property owner accounts."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.landlord_eligible = True
        user.active_app_mode = User.AppMode.LANDLORD
        user.save(update_fields=["landlord_eligible", "active_app_mode"])
        OwnerProfile.objects.get_or_create(user=user, defaults={})
        return Response(
            {
                "detail": "You can now use owner tools, listing packages, and the owner dashboard. Switch any time in your profile.",
                "user": UserProfileSerializer(
                    user, context={"request": request}
                ).data,
            },
            status=status.HTTP_200_OK,
        )


# Backward-compatible aliases for old symbols and routes.
LandlordProfileView = PropertyOwnerProfileView
EnableLandlordView = EnablePropertyOwnerView


# ──────────────────────────────────────────────
#  Logout (blacklist refresh token)
# ──────────────────────────────────────────────
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {"detail": "Invalid or already blacklisted token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"detail": "Logged out successfully."},
            status=status.HTTP_205_RESET_CONTENT,
        )
