from django.urls import path

from . import views

app_name = "analytics"

urlpatterns = [
    path("dashboard/", views.DashboardOverviewView.as_view(), name="dashboard"),
    path("popular-areas/", views.PopularAreasView.as_view(), name="popular-areas"),
    path("revenue/", views.RevenueAnalyticsView.as_view(), name="revenue"),
    path("users/", views.UserAnalyticsView.as_view(), name="users"),
    path("listings/", views.ListingAnalyticsView.as_view(), name="listings"),
    path("property-views/", views.PropertyViewAnalyticsView.as_view(), name="property-views"),
]
