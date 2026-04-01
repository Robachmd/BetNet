from django.contrib import admin

from .models import Payment, Subscription


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "transaction_id",
        "user",
        "payment_type",
        "amount",
        "currency",
        "payment_method",
        "status",
        "created_at",
    ]
    list_filter = ["status", "payment_type", "payment_method", "currency", "created_at"]
    search_fields = ["transaction_id", "user__email", "user__first_name", "description"]
    readonly_fields = ["transaction_id", "payment_data", "created_at", "updated_at"]
    date_hierarchy = "created_at"
    raw_id_fields = ["user", "property", "hall_booking"]
    list_per_page = 30

    fieldsets = (
        (None, {"fields": ("user", "payment_type", "status")}),
        ("Amount", {"fields": ("amount", "currency")}),
        ("Payment details", {"fields": ("payment_method", "transaction_id", "description")}),
        ("Related objects", {"fields": ("property", "hall_booking")}),
        ("Provider data", {"fields": ("payment_data",), "classes": ("collapse",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "plan",
        "price",
        "start_date",
        "end_date",
        "is_active",
        "max_listings",
        "created_at",
    ]
    list_filter = ["plan", "is_active", "start_date"]
    search_fields = ["user__email", "user__first_name"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["user"]
    list_per_page = 30
