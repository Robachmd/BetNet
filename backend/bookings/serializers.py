import calendar
from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from properties.models import Property

from .models import Booking, HallBooking, UnavailableDate


# ── Inline property summary (avoids circular imports) ─────────────────────────

class _PropertySummarySerializer(serializers.ModelSerializer):
    city = serializers.CharField(source="location.city", read_only=True)
    sub_city = serializers.CharField(source="location.sub_city", read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id",
            "slug",
            "title",
            "property_type",
            "listing_type",
            "price_monthly",
            "price_currency",
            "city",
            "sub_city",
            "primary_image",
        ]

    def get_primary_image(self, obj):
        img = obj.primary_image
        if img and img.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None


class _RenterSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    phone_number = serializers.CharField()


# ── Booking serializers ───────────────────────────────────────────────────────

class BookingSerializer(serializers.ModelSerializer):
    property_detail = _PropertySummarySerializer(source="property", read_only=True)
    renter_detail = _RenterSummarySerializer(source="renter", read_only=True)
    booking_type_display = serializers.CharField(
        source="get_booking_type_display", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "property",
            "property_detail",
            "renter",
            "renter_detail",
            "booking_type",
            "booking_type_display",
            "visit_date",
            "visit_time",
            "status",
            "status_display",
            "message",
            "landlord_response",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "renter",
            "status",
            "landlord_response",
            "created_at",
            "updated_at",
        ]


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            "property",
            "booking_type",
            "visit_date",
            "visit_time",
            "message",
        ]

    def validate_property(self, value):
        if not value.is_available:
            raise serializers.ValidationError("This property is not currently available.")
        return value

    def validate_visit_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Visit date cannot be in the past.")
        return value

    def validate(self, attrs):
        prop = attrs["property"]
        renter = self.context["request"].user

        if prop.owner == renter:
            raise serializers.ValidationError(
                {"property": "You cannot book your own property."}
            )

        existing = Booking.objects.filter(
            property=prop,
            renter=renter,
            visit_date=attrs["visit_date"],
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
        ).exists()
        if existing:
            raise serializers.ValidationError(
                "You already have an active booking for this property on this date."
            )

        return attrs

    def create(self, validated_data):
        validated_data["renter"] = self.context["request"].user
        return super().create(validated_data)


class BookingUpdateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            Booking.Status.CONFIRMED,
            Booking.Status.REJECTED,
        ]
    )
    landlord_response = serializers.CharField(required=False, allow_blank=True)

    def validate_status(self, value):
        booking = self.instance
        if not booking.can_transition_to(value):
            raise serializers.ValidationError(
                f"Cannot change status from {booking.status} to {value}."
            )
        return value

    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        if "landlord_response" in validated_data:
            instance.landlord_response = validated_data["landlord_response"]
        instance.save(update_fields=["status", "landlord_response", "updated_at"])
        return instance


# ── Hall booking serializers ──────────────────────────────────────────────────

class HallBookingSerializer(serializers.ModelSerializer):
    property_detail = _PropertySummarySerializer(source="property", read_only=True)
    renter_detail = _RenterSummarySerializer(source="renter", read_only=True)
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    duration_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = HallBooking
        fields = [
            "id",
            "property",
            "property_detail",
            "renter",
            "renter_detail",
            "event_date",
            "event_end_date",
            "start_time",
            "end_time",
            "guest_count",
            "event_type",
            "special_requests",
            "status",
            "status_display",
            "total_price",
            "is_paid",
            "duration_days",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "renter",
            "status",
            "total_price",
            "is_paid",
            "created_at",
            "updated_at",
        ]


class HallBookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = HallBooking
        fields = [
            "property",
            "event_date",
            "event_end_date",
            "start_time",
            "end_time",
            "guest_count",
            "event_type",
            "special_requests",
        ]

    def validate_property(self, value):
        if value.property_type != Property.PropertyType.HALL_RENTAL:
            raise serializers.ValidationError("This property is not a hall rental.")
        if not value.is_available:
            raise serializers.ValidationError("This hall is not currently available.")
        return value

    def validate_event_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Event date cannot be in the past.")
        return value

    def validate(self, attrs):
        prop = attrs["property"]
        renter = self.context["request"].user
        event_date = attrs["event_date"]
        event_end_date = attrs.get("event_end_date") or event_date

        if prop.owner == renter:
            raise serializers.ValidationError(
                {"property": "You cannot book your own hall."}
            )

        if event_end_date < event_date:
            raise serializers.ValidationError(
                {"event_end_date": "End date cannot be before start date."}
            )

        start_time = attrs["start_time"]
        end_time = attrs["end_time"]
        if event_date == event_end_date and start_time >= end_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time for same-day events."}
            )

        booking_dates = []
        current = event_date
        while current <= event_end_date:
            booking_dates.append(current)
            current += timedelta(days=1)

        unavailable = UnavailableDate.objects.filter(
            property=prop,
            date__in=booking_dates,
        ).values_list("date", flat=True)
        if unavailable:
            formatted = ", ".join(d.isoformat() for d in unavailable)
            raise serializers.ValidationError(
                f"The following dates are unavailable: {formatted}"
            )

        conflicting = HallBooking.objects.filter(
            property=prop,
            status__in=[HallBooking.Status.PENDING, HallBooking.Status.CONFIRMED],
        ).filter(
            event_date__lte=event_end_date,
        ).exclude(
            event_end_date__isnull=False,
            event_end_date__lt=event_date,
        )
        same_day_conflicts = [
            b for b in conflicting
            if (b.event_end_date or b.event_date) >= event_date
        ]
        if same_day_conflicts:
            raise serializers.ValidationError(
                "This hall already has a booking that overlaps with your requested dates."
            )

        if hasattr(prop, "hall_detail"):
            attrs["_hall_detail"] = prop.hall_detail
        else:
            raise serializers.ValidationError(
                {"property": "Hall details are not configured for this property."}
            )

        guest_count = attrs["guest_count"]
        if guest_count > prop.hall_detail.capacity:
            raise serializers.ValidationError(
                {
                    "guest_count": (
                        f"Guest count exceeds hall capacity of "
                        f"{prop.hall_detail.capacity}."
                    )
                }
            )

        return attrs

    def _calculate_total_price(self, validated_data) -> Decimal:
        hall_detail = validated_data.pop("_hall_detail", None)
        if not hall_detail:
            return Decimal("0")

        event_date = validated_data["event_date"]
        event_end_date = validated_data.get("event_end_date") or event_date
        num_days = (event_end_date - event_date).days + 1

        if num_days > 1 and hall_detail.price_per_day:
            return hall_detail.price_per_day * num_days

        if hall_detail.price_per_hour:
            start = validated_data["start_time"]
            end = validated_data["end_time"]
            from datetime import datetime

            start_dt = datetime.combine(event_date, start)
            end_dt = datetime.combine(event_date, end)
            hours = Decimal(str((end_dt - start_dt).total_seconds() / 3600))
            per_day_price = hall_detail.price_per_hour * hours
            return per_day_price * num_days

        if hall_detail.price_per_day:
            return hall_detail.price_per_day * num_days

        return Decimal("0")

    def create(self, validated_data):
        validated_data["renter"] = self.context["request"].user
        validated_data["total_price"] = self._calculate_total_price(validated_data)
        return super().create(validated_data)


# ── Unavailable date serializers ──────────────────────────────────────────────

class UnavailableDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnavailableDate
        fields = ["id", "property", "date", "reason", "created_at"]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        prop = attrs["property"]
        request = self.context["request"]
        if prop.owner != request.user and not request.user.is_staff:
            raise serializers.ValidationError(
                {"property": "You can only manage dates for your own properties."}
            )
        return attrs


# ── Availability calendar serializer ──────────────────────────────────────────

class AvailabilityCalendarSerializer(serializers.Serializer):
    """Returns day-by-day availability for a property in a given month."""

    property_id = serializers.IntegerField(read_only=True)
    year = serializers.IntegerField(read_only=True)
    month = serializers.IntegerField(read_only=True)
    dates = serializers.ListField(read_only=True)

    @staticmethod
    def build_calendar(property_obj, year: int, month: int) -> dict:
        _, num_days = calendar.monthrange(year, month)
        month_start = date(year, month, 1)
        month_end = date(year, month, num_days)

        unavailable_qs = UnavailableDate.objects.filter(
            property=property_obj,
            date__gte=month_start,
            date__lte=month_end,
        ).values_list("date", flat=True)
        unavailable_set = set(unavailable_qs)

        booked_dates = set()
        hall_bookings = HallBooking.objects.filter(
            property=property_obj,
            status__in=[HallBooking.Status.PENDING, HallBooking.Status.CONFIRMED],
            event_date__lte=month_end,
        )
        for hb in hall_bookings:
            end = hb.event_end_date or hb.event_date
            if end < month_start:
                continue
            for d in hb.booked_dates:
                if month_start <= d <= month_end:
                    booked_dates.add(d)

        visit_dates = set()
        bookings = Booking.objects.filter(
            property=property_obj,
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
            visit_date__gte=month_start,
            visit_date__lte=month_end,
        ).values_list("visit_date", flat=True)
        visit_dates = set(bookings)

        today = timezone.now().date()
        dates = []
        for day in range(1, num_days + 1):
            d = date(year, month, day)
            if d < today:
                status = "past"
            elif d in unavailable_set:
                status = "unavailable"
            elif d in booked_dates:
                status = "booked"
            elif d in visit_dates:
                status = "has_visits"
            else:
                status = "available"
            dates.append({"date": d.isoformat(), "status": status})

        return {
            "property_id": property_obj.pk,
            "year": year,
            "month": month,
            "dates": dates,
        }
