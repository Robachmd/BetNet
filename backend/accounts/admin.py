from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    list_display = (
        "phone_number",
        "first_name",
        "last_name",
        "role",
        "phone_verified",
        "id_verified",
        "is_active",
        "date_joined",
    )
    list_filter = (
        "role",
        "is_active",
        "phone_verified",
        "id_verified",
        "preferred_language",
        "city",
    )
    search_fields = ("phone_number", "first_name", "last_name", "email")
    ordering = ("-date_joined",)

    fieldsets = (
        (None, {"fields": ("phone_number", "password")}),
        (
            "Personal Info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "profile_image",
                    "bio",
                )
            },
        ),
        (
            "Location",
            {"fields": ("city", "sub_city")},
        ),
        (
            "Roles & Verification",
            {
                "fields": (
                    "role",
                    "phone_verified",
                    "id_verified",
                    "preferred_language",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            "Important Dates",
            {"fields": ("last_login", "date_joined")},
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "phone_number",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )
