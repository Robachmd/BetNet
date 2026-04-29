from django.urls import include, path

from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="list"),
    path("mark-read/", views.MarkNotificationReadView.as_view(), name="mark-read"),
    path("preferences/", views.NotificationPreferenceView.as_view(), name="preferences"),
    path("unread-count/", views.UnreadCountView.as_view(), name="unread-count"),
    path("location-alerts/", include(views.location_alert_router.urls)),
]
