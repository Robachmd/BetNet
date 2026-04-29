from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Conversation, Message

User = get_user_model()


class ParticipantSerializer(serializers.ModelSerializer):
    """Expose profile_image URL safely for JSON APIs."""

    profile_image = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "profile_image", "phone_number"]
        read_only_fields = fields

    def get_phone_number(self, obj):
        pn = getattr(obj, "phone_number", None)
        if pn is None:
            return ""
        try:
            return str(pn)
        except Exception:
            return ""

    def get_profile_image(self, obj):
        field = getattr(obj, "profile_image", None)
        if not field:
            return None
        try:
            url = field.url
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None


class MessageSerializer(serializers.ModelSerializer):
    sender = ParticipantSerializer(read_only=True)
    is_own = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "content",
            "message_type",
            "image",
            "is_read",
            "is_own",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "conversation",
            "sender",
            "is_read",
            "created_at",
        ]

    def get_image(self, obj):
        field = getattr(obj, "image", None)
        if not field:
            return None
        try:
            url = field.url
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None

    def get_is_own(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            return obj.sender_id == request.user.id
        return False


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["content", "message_type", "image"]

    def validate(self, attrs):
        msg_type = attrs.get("message_type", Message.MessageType.TEXT)
        if msg_type == Message.MessageType.TEXT and not attrs.get("content", "").strip():
            raise serializers.ValidationError(
                {"content": "Text messages must include content."}
            )
        if msg_type == Message.MessageType.IMAGE and not attrs.get("image"):
            raise serializers.ValidationError(
                {"image": "Image messages must include an image."}
            )
        return attrs


class LastMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "content", "message_type", "sender", "created_at"]


class ConversationPropertyBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    price_monthly = serializers.DecimalField(max_digits=12, decimal_places=2)
    primary_image_url = serializers.SerializerMethodField()

    def get_primary_image_url(self, obj):
        try:
            img = obj.primary_image
            if img and getattr(img, "image", None):
                url = img.image.url
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None


class ConversationListSerializer(serializers.ModelSerializer):
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    property = ConversationPropertyBriefSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "other_participant",
            "property",
            "last_message",
            "unread_count",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_other_participant(self, obj):
        user = self.context["request"].user
        other = obj.get_other_participant(user)
        if other:
            return ParticipantSerializer(other, context=self.context).data
        return None

    def get_last_message(self, obj):
        msg = obj.last_message
        if msg:
            return LastMessageSerializer(msg).data
        return None

    def get_unread_count(self, obj):
        user = self.context["request"].user
        return obj.unread_count_for(user)


class ConversationDetailSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    property = ConversationPropertyBriefSerializer(read_only=True, allow_null=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "participants",
            "property",
            "unread_count",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_unread_count(self, obj):
        user = self.context["request"].user
        return obj.unread_count_for(user)


class StartConversationSerializer(serializers.Serializer):
    participant_id = serializers.IntegerField(
        help_text="ID of the other user to start a conversation with.",
    )
    property_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Property this conversation is about (optional).",
    )
    initial_message = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="First message to send in the conversation.",
    )

    def validate_participant_id(self, value):
        request = self.context["request"]
        if value == request.user.id:
            raise serializers.ValidationError("You cannot start a conversation with yourself.")
        if not User.objects.filter(pk=value, is_active=True).exists():
            raise serializers.ValidationError("User not found.")
        return value

    def validate_property_id(self, value):
        if value is not None:
            from properties.models import Property

            if not Property.objects.filter(pk=value).exists():
                raise serializers.ValidationError("Property not found.")
        return value
