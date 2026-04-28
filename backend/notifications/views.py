from rest_framework import generics, permissions, status, viewsets
from rest_framework.routers import DefaultRouter
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LocationAlert, Notification, NotificationPreference
from .serializers import (
    LocationAlertSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
)


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        notification_type = self.request.query_params.get("type")
        if notification_type:
            qs = qs.filter(notification_type=notification_type)
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == "true")
        return qs


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        notification_id = request.data.get("notification_id")
        if notification_id:
            updated = Notification.objects.filter(
                id=notification_id, recipient=request.user, is_read=False
            ).update(is_read=True)
            if not updated:
                return Response(
                    {"detail": "Notification not found or already read."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response({"detail": "Notification marked as read."})

        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"detail": f"{count} notifications marked as read."})


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj, _ = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return obj


class UnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"unread_count": count})


class LocationAlertViewSet(viewsets.ModelViewSet):
    """
    Create and manage area watches: get notified when a new listing is published
    in the chosen city/area (and optional radius if coordinates are set).
    """

    serializer_class = LocationAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return LocationAlert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


location_alert_router = DefaultRouter()
location_alert_router.register(
    r"", LocationAlertViewSet, basename="location-alert"
)
