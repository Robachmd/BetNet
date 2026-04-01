from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "reviews"

router = DefaultRouter()
router.register(r"reviews", views.ReviewViewSet, basename="review")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "reviews/<int:review_pk>/respond/",
        views.ReviewResponseView.as_view(),
        name="review-respond",
    ),
    path(
        "properties/<int:property_pk>/reviews/summary/",
        views.PropertyReviewSummaryView.as_view(),
        name="property-review-summary",
    ),
    path(
        "users/<int:user_pk>/reviews/summary/",
        views.UserReviewSummaryView.as_view(),
        name="user-review-summary",
    ),
]
