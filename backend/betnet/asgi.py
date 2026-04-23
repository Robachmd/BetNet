"""
ASGI config for betnet project.

Supports HTTP and WebSocket protocols via Django Channels.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'betnet.settings')

django_asgi_app = get_asgi_application()

from chat.routing import websocket_urlpatterns as chat_ws
from notifications.routing import websocket_urlpatterns as notification_ws

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                chat_ws + notification_ws
            )
        )
    ),
})
