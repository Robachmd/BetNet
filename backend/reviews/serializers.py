from django.db.models import Avg, Count, Q
from rest_framework import serializers

from .models import Review, ReviewResponse


class ReviewResponseSerializer(serializers.ModelSerializer):
    responder_name = serializers.SerializerMethodField()

    class Meta:
        model = ReviewResponse
        fields = [
            "id",
            "review",
            "responder",
            "responder_name",
            "comment",
            "created_at",
        ]
        read_only_fields = ["id", "responder", "created_at"]

    def get_responder_name(self, obj) -> str:
        return obj.responder.get_full_name() or str(obj.responder.phone_number)


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    reviewer_image = serializers.SerializerMethodField()
    response = ReviewResponseSerializer(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "reviewer",
            "reviewer_name",
            "reviewer_image",
            "review_type",
            "property",
            "reviewed_user",
            "rating",
            "title",
            "comment",
            "is_approved",
            "response",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "reviewer",
            "is_approved",
            "created_at",
            "updated_at",
        ]

    def get_reviewer_name(self, obj) -> str:
        return obj.reviewer.get_full_name() or str(obj.reviewer.phone_number)

    def get_reviewer_image(self, obj) -> str | None:
        if obj.reviewer.profile_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.reviewer.profile_image.url)
            return obj.reviewer.profile_image.url
        return None


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            "id",
            "review_type",
            "property",
            "reviewed_user",
            "rating",
            "title",
            "comment",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        reviewer = request.user
        review_type = attrs.get("review_type")
        prop = attrs.get("property")
        reviewed_user = attrs.get("reviewed_user")

        if review_type == Review.ReviewType.PROPERTY_REVIEW:
            if not prop:
                raise serializers.ValidationError(
                    {"property": "Property is required for property reviews."}
                )
            self._validate_booking_exists(reviewer, prop)
            self._validate_unique_property_review(reviewer, prop)

        elif review_type == Review.ReviewType.LANDLORD_REVIEW:
            if not reviewed_user:
                raise serializers.ValidationError(
                    {"reviewed_user": "Reviewed user is required for property owner reviews."}
                )
            if reviewed_user == reviewer:
                raise serializers.ValidationError(
                    {"reviewed_user": "You cannot review yourself."}
                )

        elif review_type == Review.ReviewType.TENANT_REVIEW:
            if not reviewed_user:
                raise serializers.ValidationError(
                    {"reviewed_user": "Reviewed user is required for tenant reviews."}
                )
            if reviewed_user == reviewer:
                raise serializers.ValidationError(
                    {"reviewed_user": "You cannot review yourself."}
                )

        return attrs

    @staticmethod
    def _validate_booking_exists(reviewer, prop):
        try:
            from django.apps import apps

            Booking = apps.get_model("bookings", "Booking")
        except LookupError:
            return

        has_booking = Booking.objects.filter(
            Q(tenant=reviewer) | Q(user=reviewer),
            Q(property=prop),
            Q(status__in=["COMPLETED", "CHECKED_OUT", "CONFIRMED"]),
        ).exists()

        if not has_booking:
            raise serializers.ValidationError(
                {
                    "property": (
                        "You can only review properties you have booked."
                    )
                }
            )

    @staticmethod
    def _validate_unique_property_review(reviewer, prop):
        if Review.objects.filter(reviewer=reviewer, property=prop).exists():
            raise serializers.ValidationError(
                {"property": "You have already reviewed this property."}
            )

    def create(self, validated_data):
        validated_data["reviewer"] = self.context["request"].user
        return super().create(validated_data)


class ReviewSummarySerializer(serializers.Serializer):
    average_rating = serializers.FloatField()
    total_reviews = serializers.IntegerField()
    rating_distribution = serializers.DictField(child=serializers.IntegerField())

    @staticmethod
    def build_summary(queryset) -> dict:
        aggregated = queryset.filter(is_approved=True).aggregate(
            average_rating=Avg("rating"),
            total_reviews=Count("id"),
        )
        distribution = {}
        for star in range(1, 6):
            distribution[str(star)] = queryset.filter(
                is_approved=True, rating=star
            ).count()

        return {
            "average_rating": round(aggregated["average_rating"] or 0, 2),
            "total_reviews": aggregated["total_reviews"],
            "rating_distribution": distribution,
        }
