from rest_framework import serializers
from django.db import transaction

from .models import (
    City,
    Location,
    Amenities,
    Property,
    HallDetail,
    PropertyImage,
    PropertyVideo,
    FavoriteProperty,
    PropertyReport,
)


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ["id", "name", "region", "slug", "sort_order"]


class LocationSerializer(serializers.ModelSerializer):
    city_ref = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Location
        fields = [
            "id",
            "city",
            "city_ref",
            "sub_city",
            "woreda",
            "kebele",
            "specific_location",
            "maps_url",
            "latitude",
            "longitude",
        ]


class AmenitiesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenities
        fields = [
            "id",
            "water_availability",
            "electricity_stability",
            "has_parking",
            "has_wifi",
            "has_security",
            "has_generator",
            "is_furnished",
            "has_elevator",
            "has_balcony",
            "has_garden",
            "has_cctv",
            "pets_allowed",
        ]


class HallDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = HallDetail
        fields = [
            "capacity",
            "price_per_hour",
            "price_per_day",
            "has_sound_system",
            "has_stage",
            "decoration_allowed",
            "catering_available",
            "is_indoor",
            "hall_type",
        ]


class PropertyImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyImage
        fields = ["id", "image", "is_primary", "caption", "uploaded_at"]
        read_only_fields = ["uploaded_at"]


class PropertyVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyVideo
        fields = ["id", "video", "video_url", "uploaded_at"]
        read_only_fields = ["uploaded_at"]


class OwnerSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    phone_number = serializers.CharField(required=False, allow_blank=True)


# ── List serializer (lightweight) ────────────────────────────────────────────

class PropertyListSerializer(serializers.ModelSerializer):
    city = serializers.CharField(source="location.city", read_only=True)
    sub_city = serializers.CharField(source="location.sub_city", read_only=True)
    specific_location = serializers.CharField(
        source="location.specific_location", read_only=True
    )
    maps_url = serializers.URLField(
        source="location.maps_url", read_only=True, allow_blank=True
    )
    primary_image = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    favorite_id = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id",
            "slug",
            "title",
            "property_type",
            "listing_type",
            "bedrooms",
            "bathrooms",
            "shop_class_count",
            "floor_number",
            "price_monthly",
            "price_currency",
            "city",
            "sub_city",
            "specific_location",
            "maps_url",
            "primary_image",
            "is_verified",
            "is_featured",
            "is_available",
            "total_views",
            "is_favorited",
            "favorite_id",
            "created_at",
        ]

    def get_primary_image(self, obj):
        img = obj.primary_image
        if img and img.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None

    def get_is_favorited(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return FavoriteProperty.objects.filter(
                user=request.user, property=obj
            ).exists()
        return False

    def get_favorite_id(self, obj):
        """PK of FavoriteProperty row for DELETE /favorites/{id}/ (mobile clients)."""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            fav = FavoriteProperty.objects.filter(
                user=request.user, property=obj
            ).values_list("pk", flat=True).first()
            return fav
        return None


# ── Detail serializer (full payload) ─────────────────────────────────────────

class PropertyDetailSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    amenities = AmenitiesSerializer(read_only=True)
    images = PropertyImageSerializer(many=True, read_only=True)
    videos = PropertyVideoSerializer(many=True, read_only=True)
    owner = OwnerSummarySerializer(read_only=True)
    hall_detail = HallDetailSerializer(read_only=True)
    is_favorited = serializers.SerializerMethodField()
    favorite_id = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "property_type",
            "listing_type",
            "bedrooms",
            "bathrooms",
            "shop_class_count",
            "floor_number",
            "area_sqm",
            "price_monthly",
            "price_currency",
            "location",
            "amenities",
            "images",
            "videos",
            "owner",
            "hall_detail",
            "is_verified",
            "is_featured",
            "is_available",
            "is_published",
            "verification_date",
            "total_views",
            "is_favorited",
            "favorite_id",
            "created_at",
            "updated_at",
        ]

    def get_is_favorited(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return FavoriteProperty.objects.filter(
                user=request.user, property=obj
            ).exists()
        return False

    def get_favorite_id(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return FavoriteProperty.objects.filter(
                user=request.user, property=obj
            ).values_list("pk", flat=True).first()
        return None


# Types that may carry a floor (aligned with betnet.views._floor_number_from_post).
_FLOOR_RELEVANT_PROPERTY_TYPES = frozenset(
    {
        Property.PropertyType.APARTMENT,
        Property.PropertyType.CONDOMINIUM,
        Property.PropertyType.REAL_ESTATE,
        Property.PropertyType.BUSINESS_SHOP,
    }
)


# ── Create / Update serializer ───────────────────────────────────────────────

class PropertyCreateUpdateSerializer(serializers.ModelSerializer):
    location = LocationSerializer()
    amenities = AmenitiesSerializer()
    hall_detail = HallDetailSerializer(required=False, allow_null=True)

    class Meta:
        model = Property
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "property_type",
            "listing_type",
            "bedrooms",
            "bathrooms",
            "shop_class_count",
            "floor_number",
            "area_sqm",
            "price_monthly",
            "price_currency",
            "location",
            "amenities",
            "hall_detail",
        ]
        read_only_fields = ["id", "slug"]

    def validate(self, attrs):
        if attrs.get("property_type") == Property.PropertyType.HALL_RENTAL:
            if not attrs.get("hall_detail"):
                raise serializers.ValidationError(
                    {"hall_detail": "Hall details are required for hall rentals."}
                )

        instance = getattr(self, "instance", None)
        ptype = attrs.get("property_type")
        if ptype is None and instance is not None:
            ptype = instance.property_type

        shop_c = attrs.get("shop_class_count")
        if shop_c is None and instance is not None:
            shop_c = instance.shop_class_count

        if ptype == Property.PropertyType.BUSINESS_SHOP:
            if shop_c is None or shop_c < 1:
                raise serializers.ValidationError(
                    {
                        "shop_class_count": (
                            "Number of classes is required for business shops (minimum 1)."
                        )
                    }
                )

        if ptype not in _FLOOR_RELEVANT_PROPERTY_TYPES:
            attrs["floor_number"] = None
        elif "floor_number" in attrs and attrs["floor_number"] is not None:
            fn = attrs["floor_number"]
            if fn < 0 or fn > 200:
                raise serializers.ValidationError(
                    {"floor_number": "Floor number must be between 0 and 200."}
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        location_data = validated_data.pop("location")
        amenities_data = validated_data.pop("amenities")
        hall_data = validated_data.pop("hall_detail", None)

        location = Location.objects.create(**location_data)
        amenities = Amenities.objects.create(**amenities_data)

        prop = Property.objects.create(
            location=location,
            amenities=amenities,
            owner=self.context["request"].user,
            **validated_data,
        )

        if hall_data and prop.property_type == Property.PropertyType.HALL_RENTAL:
            HallDetail.objects.create(property=prop, **hall_data)

        return prop

    @transaction.atomic
    def update(self, instance, validated_data):
        location_data = validated_data.pop("location", None)
        amenities_data = validated_data.pop("amenities", None)
        hall_data = validated_data.pop("hall_detail", None)

        if location_data:
            for attr, value in location_data.items():
                setattr(instance.location, attr, value)
            instance.location.save()

        if amenities_data:
            for attr, value in amenities_data.items():
                setattr(instance.amenities, attr, value)
            instance.amenities.save()

        if hall_data is not None:
            if instance.property_type == Property.PropertyType.HALL_RENTAL:
                hall, created = HallDetail.objects.get_or_create(
                    property=instance
                )
                for attr, value in hall_data.items():
                    setattr(hall, attr, value)
                hall.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance


# ── Favorites ─────────────────────────────────────────────────────────────────

class FavoritePropertySerializer(serializers.ModelSerializer):
    property_detail = PropertyListSerializer(source="property", read_only=True)

    class Meta:
        model = FavoriteProperty
        fields = ["id", "property", "property_detail", "created_at"]
        read_only_fields = ["created_at"]

    def validate_property(self, value):
        request = self.context["request"]
        if FavoriteProperty.objects.filter(user=request.user, property=value).exists():
            raise serializers.ValidationError("Property is already in your favorites.")
        return value

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


# ── Reports ───────────────────────────────────────────────────────────────────

class PropertyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyReport
        fields = ["id", "property", "reason", "description", "status", "created_at"]
        read_only_fields = ["status", "created_at"]

    def create(self, validated_data):
        validated_data["reporter"] = self.context["request"].user
        return super().create(validated_data)


# ── Price Insight ─────────────────────────────────────────────────────────────

class PriceInsightSerializer(serializers.Serializer):
    sub_city = serializers.CharField()
    city = serializers.CharField(required=False, default="Addis Ababa")
    property_type = serializers.ChoiceField(
        choices=Property.PropertyType.choices, required=False
    )
    avg_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    min_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    max_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    listing_count = serializers.IntegerField(read_only=True)


# ── Hall rental filter (query param validation) ──────────────────────────────

class HallRentalFilterSerializer(serializers.Serializer):
    hall_type = serializers.ChoiceField(
        choices=HallDetail.HallType.choices, required=False
    )
    capacity_min = serializers.IntegerField(required=False, min_value=1)
    capacity_max = serializers.IntegerField(required=False)
    price_per_hour_min = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False
    )
    price_per_hour_max = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False
    )
    city = serializers.CharField(required=False)
    sub_city = serializers.CharField(required=False)
