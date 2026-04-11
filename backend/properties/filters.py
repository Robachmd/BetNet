import django_filters
from django.db.models import Q

from .models import Property, HallDetail


class PropertyFilter(django_filters.FilterSet):
    property_type = django_filters.ChoiceFilter(
        choices=Property.PropertyType.choices,
    )
    listing_type = django_filters.ChoiceFilter(
        choices=Property.ListingType.choices,
    )
    bedrooms = django_filters.ChoiceFilter(
        choices=Property.BedroomCount.choices,
    )
    price_min = django_filters.NumberFilter(
        field_name="price_monthly", lookup_expr="gte"
    )
    price_max = django_filters.NumberFilter(
        field_name="price_monthly", lookup_expr="lte"
    )
    city = django_filters.CharFilter(
        field_name="location__city", lookup_expr="iexact"
    )
    sub_city = django_filters.CharFilter(
        field_name="location__sub_city", lookup_expr="iexact"
    )
    is_verified = django_filters.BooleanFilter()
    is_available = django_filters.BooleanFilter()
    is_featured = django_filters.BooleanFilter()

    has_parking = django_filters.BooleanFilter(field_name="amenities__has_parking")
    has_wifi = django_filters.BooleanFilter(field_name="amenities__has_wifi")
    has_security = django_filters.BooleanFilter(field_name="amenities__has_security")
    has_generator = django_filters.BooleanFilter(field_name="amenities__has_generator")
    is_furnished = django_filters.BooleanFilter(field_name="amenities__is_furnished")
    has_elevator = django_filters.BooleanFilter(field_name="amenities__has_elevator")
    pets_allowed = django_filters.BooleanFilter(field_name="amenities__pets_allowed")
    water_availability = django_filters.ChoiceFilter(
        field_name="amenities__water_availability",
        choices=[("ALWAYS", "Always"), ("SOMETIMES", "Sometimes"), ("RARELY", "Rarely")],
    )

    keyword = django_filters.CharFilter(method="filter_keyword")

    class Meta:
        model = Property
        fields = [
            "property_type",
            "listing_type",
            "bedrooms",
            "is_verified",
            "is_available",
            "is_featured",
        ]

    def filter_keyword(self, queryset, name, value):
        return queryset.filter(
            Q(title__icontains=value)
            | Q(description__icontains=value)
            | Q(location__city__icontains=value)
            | Q(location__sub_city__icontains=value)
            | Q(location__specific_location__icontains=value)
        )


class HallFilter(django_filters.FilterSet):
    hall_type = django_filters.ChoiceFilter(
        choices=HallDetail.HallType.choices,
    )
    capacity_min = django_filters.NumberFilter(
        field_name="capacity", lookup_expr="gte"
    )
    capacity_max = django_filters.NumberFilter(
        field_name="capacity", lookup_expr="lte"
    )
    price_per_hour_min = django_filters.NumberFilter(
        field_name="price_per_hour", lookup_expr="gte"
    )
    price_per_hour_max = django_filters.NumberFilter(
        field_name="price_per_hour", lookup_expr="lte"
    )
    price_per_day_min = django_filters.NumberFilter(
        field_name="price_per_day", lookup_expr="gte"
    )
    price_per_day_max = django_filters.NumberFilter(
        field_name="price_per_day", lookup_expr="lte"
    )
    has_sound_system = django_filters.BooleanFilter()
    has_stage = django_filters.BooleanFilter()
    catering_available = django_filters.BooleanFilter()
    is_indoor = django_filters.BooleanFilter()

    city = django_filters.CharFilter(
        field_name="property__location__city", lookup_expr="iexact"
    )
    sub_city = django_filters.CharFilter(
        field_name="property__location__sub_city", lookup_expr="iexact"
    )

    class Meta:
        model = HallDetail
        fields = [
            "hall_type",
            "has_sound_system",
            "has_stage",
            "catering_available",
            "is_indoor",
        ]
