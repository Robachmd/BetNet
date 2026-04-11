from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Location,
    Amenities,
    Property,
    HallDetail,
    PropertyImage,
    PropertyVideo,
    FavoriteProperty,
    PropertyReport,
)


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1
    readonly_fields = ["image_preview", "uploaded_at"]

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height:80px;" />', obj.image.url
            )
        return "-"

    image_preview.short_description = "Preview"


class PropertyVideoInline(admin.TabularInline):
    model = PropertyVideo
    extra = 0


class HallDetailInline(admin.StackedInline):
    model = HallDetail
    extra = 0
    max_num = 1


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["city", "sub_city", "woreda", "kebele", "created_at"]
    list_filter = ["city", "sub_city"]
    search_fields = ["city", "sub_city", "specific_location"]


@admin.register(Amenities)
class AmenitiesAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "water_availability",
        "electricity_stability",
        "has_parking",
        "has_wifi",
        "is_furnished",
    ]
    list_filter = [
        "water_availability",
        "electricity_stability",
        "has_parking",
        "is_furnished",
    ]


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "property_type",
        "listing_type",
        "owner",
        "price_display",
        "city_display",
        "is_verified",
        "is_featured",
        "is_available",
        "total_views",
        "created_at",
    ]
    list_filter = [
        "property_type",
        "listing_type",
        "bedrooms",
        "is_verified",
        "is_featured",
        "is_available",
        "location__city",
    ]
    search_fields = [
        "title",
        "description",
        "slug",
        "owner__first_name",
        "owner__last_name",
        "location__city",
        "location__sub_city",
    ]
    readonly_fields = ["slug", "total_views", "created_at", "updated_at"]
    prepopulated_fields = {"slug": ("title",)}
    list_editable = ["is_verified", "is_featured", "is_available"]
    inlines = [PropertyImageInline, PropertyVideoInline, HallDetailInline]
    raw_id_fields = ["owner", "location", "amenities"]

    def price_display(self, obj):
        return f"{obj.price_currency} {obj.price_monthly:,.2f}"

    price_display.short_description = "Monthly Price"

    def city_display(self, obj):
        return f"{obj.location.city}, {obj.location.sub_city}"

    city_display.short_description = "Location"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("location", "amenities", "owner")
        )


@admin.register(HallDetail)
class HallDetailAdmin(admin.ModelAdmin):
    list_display = [
        "property",
        "hall_type",
        "capacity",
        "price_per_hour",
        "price_per_day",
        "is_indoor",
    ]
    list_filter = ["hall_type", "is_indoor", "has_sound_system", "catering_available"]
    raw_id_fields = ["property"]


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ["property", "is_primary", "caption", "uploaded_at"]
    list_filter = ["is_primary"]
    raw_id_fields = ["property"]


@admin.register(PropertyVideo)
class PropertyVideoAdmin(admin.ModelAdmin):
    list_display = ["property", "video", "video_url", "uploaded_at"]
    search_fields = ["property__title", "video_url"]
    raw_id_fields = ["property"]


@admin.register(FavoriteProperty)
class FavoritePropertyAdmin(admin.ModelAdmin):
    list_display = ["user", "property", "created_at"]
    raw_id_fields = ["user", "property"]


@admin.register(PropertyReport)
class PropertyReportAdmin(admin.ModelAdmin):
    list_display = ["property", "reporter", "reason", "status", "created_at"]
    list_filter = ["reason", "status"]
    list_editable = ["status"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["reporter", "property"]
