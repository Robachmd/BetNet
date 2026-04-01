from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from properties.models import Property

from .models import Booking, HallBooking, UnavailableDate
from .serializers import (
    AvailabilityCalendarSerializer,
    BookingCreateSerializer,
    BookingSerializer,
    BookingUpdateStatusSerializer,
    HallBookingCreateSerializer,
    HallBookingSerializer,
    UnavailableDateSerializer,
)


class BookingViewSet(viewsets.ModelViewSet):
    """
    Bookings for property visits / rental applications.

    - Renters see their own bookings.
    - Landlords see bookings made on their properties.
    - Admins see all bookings.
    """

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = Booking.objects.select_related(
            "property",
            "property__location",
            "renter",
        )

        if user.is_staff:
            return qs

        return qs.filter(
            Q(renter=user) | Q(property__owner=user)
        )

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        if self.action == "update_status":
            return BookingUpdateStatusSerializer
        return BookingSerializer

    def perform_create(self, serializer):
        if self.request.user.role != "RENTER":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Only renters can create bookings.")
        serializer.save()

    def perform_destroy(self, instance):
        """Soft-cancel instead of hard delete."""
        user = self.request.user
        if instance.renter != user and instance.property.owner != user and not user.is_staff:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You are not involved in this booking.")

        if not instance.can_transition_to(Booking.Status.CANCELLED):
            return Response(
                {"detail": f"Cannot cancel a booking with status '{instance.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.status = Booking.Status.CANCELLED
        instance.save(update_fields=["status", "updated_at"])

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """Landlord accepts or rejects a booking."""
        booking = self.get_object()

        if booking.property.owner != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Only the property owner can update booking status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = BookingUpdateStatusSerializer(
            instance=booking, data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(BookingSerializer(booking, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Renter or landlord cancels a booking."""
        booking = self.get_object()
        user = request.user

        if booking.renter != user and booking.property.owner != user and not user.is_staff:
            return Response(
                {"detail": "You are not involved in this booking."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not booking.can_transition_to(Booking.Status.CANCELLED):
            return Response(
                {"detail": f"Cannot cancel a booking with status '{booking.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=["status", "updated_at"])
        return Response(BookingSerializer(booking, context=self.get_serializer_context()).data)


class HallBookingViewSet(viewsets.ModelViewSet):
    """
    Hall / event space bookings with date-conflict checking.

    - Renters see their own hall bookings.
    - Landlords see hall bookings on their properties.
    """

    serializer_class = HallBookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = HallBooking.objects.select_related(
            "property",
            "property__location",
            "renter",
        )

        if user.is_staff:
            return qs

        return qs.filter(
            Q(renter=user) | Q(property__owner=user)
        )

    def get_serializer_class(self):
        if self.action == "create":
            return HallBookingCreateSerializer
        if self.action == "update_status":
            return BookingUpdateStatusSerializer
        return HallBookingSerializer

    def perform_create(self, serializer):
        if self.request.user.role != "RENTER":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Only renters can create hall bookings.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if instance.renter != user and instance.property.owner != user and not user.is_staff:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You are not involved in this booking.")

        if not instance.can_transition_to(HallBooking.Status.CANCELLED):
            return Response(
                {"detail": f"Cannot cancel a booking with status '{instance.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.status = HallBooking.Status.CANCELLED
        instance.save(update_fields=["status", "updated_at"])

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """Landlord accepts or rejects a hall booking."""
        booking = self.get_object()

        if booking.property.owner != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Only the property owner can update booking status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get("status")
        allowed = {HallBooking.Status.CONFIRMED, HallBooking.Status.CANCELLED}

        if new_status not in allowed:
            return Response(
                {"detail": f"Status must be one of: {', '.join(allowed)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not booking.can_transition_to(new_status):
            return Response(
                {"detail": f"Cannot change status from {booking.status} to {new_status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = new_status
        booking.save(update_fields=["status", "updated_at"])
        return Response(
            HallBookingSerializer(booking, context=self.get_serializer_context()).data
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        booking = self.get_object()
        user = request.user

        if booking.renter != user and booking.property.owner != user and not user.is_staff:
            return Response(
                {"detail": "You are not involved in this booking."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not booking.can_transition_to(HallBooking.Status.CANCELLED):
            return Response(
                {"detail": f"Cannot cancel a booking with status '{booking.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = HallBooking.Status.CANCELLED
        booking.save(update_fields=["status", "updated_at"])
        return Response(
            HallBookingSerializer(booking, context=self.get_serializer_context()).data
        )


class UnavailableDateViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    Manage unavailable dates for a property.

    - List is public (for calendar display).
    - Create/delete restricted to the property owner.
    """

    serializer_class = UnavailableDateSerializer

    def get_permissions(self):
        if self.action == "list":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = UnavailableDate.objects.select_related("property")
        property_id = self.request.query_params.get("property")
        if property_id:
            qs = qs.filter(property_id=property_id)
        return qs

    def perform_destroy(self, instance):
        if instance.property.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Only the property owner can remove unavailable dates."
            )
        instance.delete()


class PropertyAvailabilityView(APIView):
    """
    GET /api/bookings/availability/<property_id>/?year=2026&month=4

    Returns a month calendar with day-by-day availability status.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, property_id):
        property_obj = get_object_or_404(Property, pk=property_id)

        today = timezone.now().date()
        try:
            year = int(request.query_params.get("year", today.year))
            month = int(request.query_params.get("month", today.month))
            if not (1 <= month <= 12):
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid year or month parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = AvailabilityCalendarSerializer.build_calendar(property_obj, year, month)
        return Response(data)
