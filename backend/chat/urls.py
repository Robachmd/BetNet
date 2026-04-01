from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ConversationViewSet,
    MarkReadView,
    MessageViewSet,
    UnreadCountView,
)

app_name = "chat"

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet, basename="conversation")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "conversations/<int:conversation_pk>/messages/",
        MessageViewSet.as_view({"get": "list", "post": "create"}),
        name="conversation-messages",
    ),
    path(
        "conversations/<int:conversation_pk>/read/",
        MarkReadView.as_view(),
        name="mark-read",
    ),
    path(
        "unread-count/",
        UnreadCountView.as_view(),
        name="unread-count",
    ),
]
