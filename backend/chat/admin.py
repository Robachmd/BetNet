from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["sender", "content", "message_type", "is_read", "created_at"]
    ordering = ["-created_at"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "get_participants", "property", "is_active", "created_at", "updated_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = [
        "participants__first_name",
        "participants__last_name",
        "participants__phone_number",
        "property__title",
    ]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [MessageInline]

    def get_participants(self, obj):
        return ", ".join(str(u) for u in obj.participants.all())

    get_participants.short_description = "Participants"


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "conversation",
        "sender",
        "short_content",
        "message_type",
        "is_read",
        "created_at",
    ]
    list_filter = ["message_type", "is_read", "created_at"]
    search_fields = ["content", "sender__first_name", "sender__phone_number"]
    readonly_fields = ["conversation", "sender", "created_at"]
    list_select_related = ["conversation", "sender"]

    def short_content(self, obj):
        return obj.content[:60] if obj.content else f"[{obj.message_type}]"

    short_content.short_description = "Content"
