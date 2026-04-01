import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebSocketConsumer
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken

from .models import Conversation, Message
from .serializers import MessageSerializer

logger = logging.getLogger(__name__)

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_str):
    try:
        token = AccessToken(token_str)
        return User.objects.get(pk=token["user_id"])
    except Exception:
        return AnonymousUser()


@database_sync_to_async
def get_conversation(conversation_id, user):
    try:
        conv = Conversation.objects.get(pk=conversation_id, is_active=True)
        if not conv.participants.filter(pk=user.pk).exists():
            return None
        return conv
    except Conversation.DoesNotExist:
        return None


@database_sync_to_async
def create_message(conversation, user, content, message_type="TEXT"):
    msg = Message.objects.create(
        conversation=conversation,
        sender=user,
        content=content,
        message_type=message_type,
    )
    conversation.save(update_fields=["updated_at"])
    return msg


@database_sync_to_async
def serialize_message(message, user=None):
    data = {
        "id": message.id,
        "conversation": message.conversation_id,
        "sender": {
            "id": message.sender.id,
            "first_name": message.sender.first_name,
            "last_name": message.sender.last_name,
            "profile_image": (
                message.sender.profile_image.url
                if message.sender.profile_image
                else None
            ),
        },
        "content": message.content,
        "message_type": message.message_type,
        "image": message.image.url if message.image else None,
        "is_read": message.is_read,
        "created_at": message.created_at.isoformat(),
    }
    return data


@database_sync_to_async
def mark_messages_read(conversation, user):
    return (
        Message.objects.filter(conversation=conversation, is_read=False)
        .exclude(sender=user)
        .update(is_read=True)
    )


class ChatConsumer(AsyncJsonWebSocketConsumer):
    """
    WebSocket consumer for real-time chat.

    Connect: ws/chat/<conversation_id>/?token=<jwt_access_token>
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = AnonymousUser()
        self.conversation = None
        self.room_group_name = None

    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.room_group_name = f"chat_{self.conversation_id}"

        query_string = self.scope.get("query_string", b"").decode("utf-8")
        token = self._extract_token(query_string)

        if not token:
            await self.close(code=4001)
            return

        self.user = await get_user_from_token(token)
        if isinstance(self.user, AnonymousUser):
            await self.close(code=4001)
            return

        self.conversation = await get_conversation(self.conversation_id, self.user)
        if not self.conversation:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

        await mark_messages_read(self.conversation, self.user)

    async def disconnect(self, close_code):
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

    async def receive_json(self, content, **kwargs):
        action = content.get("type", "message")

        if action == "message":
            await self._handle_message(content)
        elif action == "mark_read":
            await self._handle_mark_read()
        elif action == "typing":
            await self._handle_typing()

    async def _handle_message(self, content):
        text = content.get("content", "").strip()
        message_type = content.get("message_type", "TEXT")

        if not text:
            await self.send_json({"type": "error", "detail": "Empty message."})
            return

        if message_type not in ("TEXT", "SYSTEM"):
            message_type = "TEXT"

        message = await create_message(
            self.conversation, self.user, text, message_type
        )
        data = await serialize_message(message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "message": data,
            },
        )

    async def _handle_mark_read(self):
        count = await mark_messages_read(self.conversation, self.user)
        await self.send_json({"type": "read_receipt", "marked_read": count})

    async def _handle_typing(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.typing",
                "user_id": self.user.id,
            },
        )

    async def chat_message(self, event):
        """Broadcast incoming message to WebSocket clients."""
        await self.send_json({
            "type": "message",
            "message": event["message"],
        })

    async def chat_typing(self, event):
        """Broadcast typing indicator (skip sending back to the typer)."""
        if event["user_id"] != self.user.id:
            await self.send_json({
                "type": "typing",
                "user_id": event["user_id"],
            })

    async def chat_system(self, event):
        """Broadcast system messages (e.g. booking confirmed)."""
        await self.send_json({
            "type": "system",
            "message": event["message"],
        })

    @staticmethod
    def _extract_token(query_string: str) -> str | None:
        from urllib.parse import parse_qs

        params = parse_qs(query_string)
        tokens = params.get("token", [])
        return tokens[0] if tokens else None
