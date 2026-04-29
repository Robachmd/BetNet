from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"properties", views.PropertyViewSet, basename="property")
router.register(r"favorites", views.FavoriteViewSet, basename="favorite")

urlpatterns = [
    path("cities/", views.CitySearchView.as_view(), name="cities"),
    path(
        "properties/admin/<int:pk>/verify/",
        views.AdminPropertyVerifyView.as_view(),
        name="admin-property-verify",
    ),
    path(
        "properties/admin/<int:pk>/reject/",
        views.AdminPropertyRejectView.as_view(),
        name="admin-property-reject",
    ),
    path("", include(router.urls)),
    path(
        "properties/<slug:property_slug>/images/",
        views.PropertyImageViewSet.as_view({"get": "list", "post": "create"}),
        name="property-images-list",
    ),
    path(
        "properties/<slug:property_slug>/images/<int:pk>/",
        views.PropertyImageViewSet.as_view({"delete": "destroy"}),
        name="property-images-detail",
    ),
    path("reports/", views.PropertyReportView.as_view(), name="property-report"),
    path("price-insights/", views.PriceInsightView.as_view(), name="price-insights"),
    path("featured/", views.FeaturedPropertiesView.as_view(), name="featured-properties"),
    path("nearby/", views.NearbyPropertiesView.as_view(), name="nearby-properties"),
    path("my-properties/", views.MyPropertiesView.as_view(), name="my-properties"),
    path("halls/", views.HallRentalListView.as_view(), name="hall-rentals"),
    path("search/", views.PropertySearchView.as_view(), name="property-search"),
]
