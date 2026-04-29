from django.contrib import admin

from .models import LocationAlert, Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "recipient",
        "notification_type",
        "title",
        "is_read",
        "created_at",
    ]
    list_filter = ["notification_type", "is_read", "created_at"]
    search_fields = ["title", "message", "recipient__phone_number"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["recipient"]


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "email_notifications",
        "sms_notifications",
        "push_notifications",
    ]
    search_fields = ["user__phone_number"]
    raw_id_fields = ["user"]


@admin.register(LocationAlert)
class LocationAlertAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "label",
        "city",
        "sub_city",
        "radius_km",
        "is_active",
    ]
    list_filter = ["is_active", "city"]
    search_fields = ["user__phone_number", "city", "sub_city", "label"]
    raw_id_fields = ["user"]
