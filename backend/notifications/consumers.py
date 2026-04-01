import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebSocketConsumer


class NotificationConsumer(AsyncJsonWebSocketConsumer):
    """WebSocket consumer that streams real-time notifications to authenticated users."""

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        self.group_name = f"notifications_{self.user.pk}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        unread = await self._unread_count()
        await self.send_json({"type": "unread_count", "count": unread})

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    async def receive_json(self, content, **kwargs):
        action = content.get("action")
        if action == "mark_read":
            notification_id = content.get("notification_id")
            await self._mark_read(notification_id)
            unread = await self._unread_count()
            await self.send_json({"type": "unread_count", "count": unread})

    async def send_notification(self, event):
        """Handler called by the channel layer when a notification is created."""
        await self.send_json(
            {
                "type": "new_notification",
                "notification": event["notification"],
            }
        )

    @database_sync_to_async
    def _unread_count(self):
        from .models import Notification

        return Notification.objects.filter(
            recipient=self.user, is_read=False
        ).count()

    @database_sync_to_async
    def _mark_read(self, notification_id=None):
        from .models import Notification

        qs = Notification.objects.filter(recipient=self.user, is_read=False)
        if notification_id:
            qs = qs.filter(pk=notification_id)
        qs.update(is_read=True)
