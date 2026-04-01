from django.contrib import admin

from .models import Booking, HallBooking, UnavailableDate


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "property",
        "renter",
        "booking_type",
        "visit_date",
        "visit_time",
        "status",
        "created_at",
    ]
    list_filter = ["status", "booking_type", "visit_date", "created_at"]
    search_fields = [
        "property__title",
        "renter__phone_number",
        "renter__first_name",
        "renter__last_name",
    ]
    list_select_related = ["property", "renter"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "visit_date"
    list_per_page = 30

    fieldsets = (
        (None, {
            "fields": ("property", "renter", "booking_type"),
        }),
        ("Schedule", {
            "fields": ("visit_date", "visit_time"),
        }),
        ("Status", {
            "fields": ("status", "message", "landlord_response"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


@admin.register(HallBooking)
class HallBookingAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "property",
        "renter",
        "event_type",
        "event_date",
        "event_end_date",
        "guest_count",
        "status",
        "total_price",
        "is_paid",
    ]
    list_filter = ["status", "is_paid", "event_date", "created_at"]
    search_fields = [
        "property__title",
        "renter__phone_number",
        "renter__first_name",
        "event_type",
    ]
    list_select_related = ["property", "renter"]
    readonly_fields = ["created_at", "updated_at", "total_price"]
    date_hierarchy = "event_date"
    list_per_page = 30

    fieldsets = (
        (None, {
            "fields": ("property", "renter", "event_type"),
        }),
        ("Event Details", {
            "fields": (
                "event_date",
                "event_end_date",
                "start_time",
                "end_time",
                "guest_count",
                "special_requests",
            ),
        }),
        ("Payment", {
            "fields": ("total_price", "is_paid"),
        }),
        ("Status", {
            "fields": ("status",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


@admin.register(UnavailableDate)
class UnavailableDateAdmin(admin.ModelAdmin):
    list_display = ["id", "property", "date", "reason", "created_at"]
    list_filter = ["date", "created_at"]
    search_fields = ["property__title", "reason"]
    list_select_related = ["property"]
    date_hierarchy = "date"
    list_per_page = 50
