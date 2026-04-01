from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "bookings"

router = DefaultRouter()
router.register(r"bookings", views.BookingViewSet, basename="booking")
router.register(r"hall-bookings", views.HallBookingViewSet, basename="hall-booking")
router.register(
    r"unavailable-dates", views.UnavailableDateViewSet, basename="unavailable-date"
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "availability/<int:property_id>/",
        views.PropertyAvailabilityView.as_view(),
        name="property-availability",
    ),
]
