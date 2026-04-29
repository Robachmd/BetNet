from django.contrib.auth import get_user_model
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .serializers import (
    ConversationDetailSerializer,
    ConversationListSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    StartConversationSerializer,
)

User = get_user_model()


class IsConversationParticipant(permissions.BasePermission):
    """Only allow participants of the conversation to access it."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        # Create and some DRF paths invoke object checks with no instance yet.
        if obj is None:
            return True
        if isinstance(obj, Conversation):
            conversation = obj
        else:
            conversation = getattr(obj, "conversation", None)
        if conversation is None:
            return False
        return conversation.participants.filter(pk=request.user.pk).exists()


class ConversationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def get_serializer_class(self):
        if self.action == "create":
            return StartConversationSerializer
        if self.action == "retrieve":
            return ConversationDetailSerializer
        return ConversationListSerializer

    def get_queryset(self):
        # Avoid annotate+distinct+order_by combos that can trigger DB errors on some backends.
        return (
            Conversation.objects.filter(
                participants=self.request.user,
                is_active=True,
            )
            .order_by("-updated_at")
        )

    def check_object_permissions(self, request, obj):
        if isinstance(obj, Conversation):
            if not obj.participants.filter(pk=request.user.pk).exists():
                self.permission_denied(request)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        participant_id = serializer.validated_data["participant_id"]
        property_id = serializer.validated_data.get("property_id")
        initial_message = serializer.validated_data.get("initial_message", "")

        other_user = User.objects.get(pk=participant_id)

        existing = Conversation.objects.filter(
            participants=request.user,
            is_active=True,
        ).filter(
            participants=other_user,
        )
        if property_id:
            existing = existing.filter(property_id=property_id)
        else:
            existing = existing.filter(property__isnull=True)

        conversation = existing.first()
        if not conversation:
            conversation = Conversation.objects.create(
                property_id=property_id,
            )
            conversation.participants.add(request.user, other_user)

        if initial_message.strip():
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=initial_message,
                message_type=Message.MessageType.TEXT,
            )

        output = ConversationDetailSerializer(
            conversation, context={"request": request}
        )
        return Response(output.data, status=status.HTTP_201_CREATED)


class MessageViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer

    def get_conversation(self):
        conversation = Conversation.objects.filter(
            pk=self.kwargs["conversation_pk"],
            participants=self.request.user,
            is_active=True,
        ).first()
        if not conversation:
            from rest_framework.exceptions import NotFound
            raise NotFound("Conversation not found.")
        return conversation

    def get_queryset(self):
        return Message.objects.filter(
            conversation=self.get_conversation(),
        ).select_related("sender")

    def get_serializer_class(self):
        if self.action == "create":
            return MessageCreateSerializer
        return MessageSerializer

    def create(self, request, *args, **kwargs):
        conversation = self.get_conversation()
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            **serializer.validated_data,
        )
        conversation.save(update_fields=["updated_at"])

        output = MessageSerializer(message, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)


class MarkReadView(APIView):
    """Mark all messages in a conversation as read for the current user."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_pk):
        conversation = Conversation.objects.filter(
            pk=conversation_pk,
            participants=request.user,
            is_active=True,
        ).first()
        if not conversation:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        updated = (
            Message.objects.filter(conversation=conversation, is_read=False)
            .exclude(sender=request.user)
            .update(is_read=True)
        )
        return Response({"marked_read": updated})


class UnreadCountView(APIView):
    """Return total unread message count across all conversations."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(
            participants=request.user,
            is_active=True,
        )
        total = (
            Message.objects.filter(
                conversation__in=conversations,
                is_read=False,
            )
            .exclude(sender=request.user)
            .count()
        )
        return Response({"unread_count": total})
