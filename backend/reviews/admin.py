from django.contrib import admin

from .models import Review, ReviewResponse


class ReviewResponseInline(admin.StackedInline):
    model = ReviewResponse
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reviewer",
        "review_type",
        "property",
        "reviewed_user",
        "rating",
        "is_approved",
        "created_at",
    )
    list_filter = ("review_type", "rating", "is_approved", "created_at")
    search_fields = (
        "title",
        "comment",
        "reviewer__phone_number",
        "reviewer__first_name",
        "reviewer__last_name",
    )
    list_editable = ("is_approved",)
    readonly_fields = ("created_at", "updated_at")
    raw_id_fields = ("reviewer", "property", "reviewed_user")
    inlines = [ReviewResponseInline]
    date_hierarchy = "created_at"


@admin.register(ReviewResponse)
class ReviewResponseAdmin(admin.ModelAdmin):
    list_display = ("id", "review", "responder", "created_at")
    search_fields = (
        "comment",
        "responder__phone_number",
        "responder__first_name",
    )
    readonly_fields = ("created_at",)
    raw_id_fields = ("review", "responder")
