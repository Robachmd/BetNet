from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Payment, Subscription


class PaymentSerializer(serializers.ModelSerializer):
    payment_type_display = serializers.CharField(
        source="get_payment_type_display", read_only=True
    )
    payment_method_display = serializers.CharField(
        source="get_payment_method_display", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "user",
            "payment_type",
            "payment_type_display",
            "amount",
            "currency",
            "payment_method",
            "payment_method_display",
            "transaction_id",
            "status",
            "status_display",
            "property",
            "hall_booking",
            "description",
            "payment_data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "transaction_id",
            "status",
            "payment_data",
            "created_at",
            "updated_at",
        ]


class PaymentCreateSerializer(serializers.Serializer):
    payment_type = serializers.ChoiceField(choices=Payment.PaymentType.choices)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    currency = serializers.CharField(max_length=3, default="ETB")
    payment_method = serializers.ChoiceField(choices=Payment.PaymentMethod.choices)
    property_id = serializers.IntegerField(required=False, allow_null=True)
    hall_booking_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    callback_url = serializers.URLField(required=False, default="")
    return_url = serializers.URLField(required=False, default="")

    def validate(self, attrs):
        ptype = attrs["payment_type"]

        if ptype == Payment.PaymentType.FEATURED_LISTING and not attrs.get("property_id"):
            raise serializers.ValidationError(
                {"property_id": "Required for featured listing payments."}
            )
        if ptype == Payment.PaymentType.HALL_BOOKING and not attrs.get("hall_booking_id"):
            raise serializers.ValidationError(
                {"hall_booking_id": "Required for hall booking payments."}
            )
        return attrs


class ChapaPaymentInitSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100, required=False, default="")
    last_name = serializers.CharField(max_length=100, required=False, default="")
    phone_number = serializers.CharField(max_length=20, required=False, default="")
    callback_url = serializers.URLField()
    return_url = serializers.URLField(required=False, default="")


class TelebirrPaymentInitSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    phone = serializers.CharField(max_length=20)
    notify_url = serializers.URLField(required=False, default="")
    return_url = serializers.URLField(required=False, default="")


class StripePaymentInitSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=50, help_text="Amount in smallest currency unit (cents)")
    currency = serializers.CharField(max_length=3, default="usd")
    success_url = serializers.URLField()
    cancel_url = serializers.URLField()
    description = serializers.CharField(max_length=255, required=False, default="BetRent Payment")


class PaymentVerifySerializer(serializers.Serializer):
    transaction_id = serializers.CharField(max_length=100)
    payment_method = serializers.ChoiceField(choices=Payment.PaymentMethod.choices)


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_display = serializers.CharField(source="get_plan_display", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "user",
            "plan",
            "plan_display",
            "price",
            "start_date",
            "end_date",
            "is_active",
            "is_expired",
            "max_listings",
            "features",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "price",
            "start_date",
            "end_date",
            "is_active",
            "max_listings",
            "features",
            "created_at",
        ]


class SubscriptionCreateSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=Subscription.Plan.choices)
    duration_months = serializers.IntegerField(min_value=1, max_value=12, default=1)
    payment_method = serializers.ChoiceField(choices=Payment.PaymentMethod.choices)

    def validate_plan(self, value):
        if value == Subscription.Plan.BASIC:
            raise serializers.ValidationError(
                "The Basic plan is free and does not require a subscription purchase."
            )
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        plan = validated_data["plan"]
        duration = validated_data["duration_months"]
        defaults = Subscription.PLAN_DEFAULTS[plan]

        Subscription.objects.filter(user=user, is_active=True).update(is_active=False)

        start = timezone.now().date()
        end = start + timedelta(days=30 * duration)

        return Subscription.objects.create(
            user=user,
            plan=plan,
            price=defaults["price"] * duration,
            start_date=start,
            end_date=end,
            is_active=True,
            max_listings=defaults["max_listings"],
            features=defaults["features"],
        )
