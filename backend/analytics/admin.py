from django.contrib import admin

from .models import PropertyView, SearchLog


@admin.register(PropertyView)
class PropertyViewAdmin(admin.ModelAdmin):
    list_display = ["property", "viewer", "ip_address", "viewed_at"]
    list_filter = ["viewed_at"]
    search_fields = [
        "property__title",
        "ip_address",
        "viewer__phone_number",
    ]
    raw_id_fields = ["property", "viewer"]
    readonly_fields = ["viewed_at"]


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ["query", "user", "results_count", "searched_at"]
    list_filter = ["searched_at"]
    search_fields = ["query", "user__phone_number"]
    raw_id_fields = ["user"]
    readonly_fields = ["searched_at"]
