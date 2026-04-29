from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import admin_views
from . import views

app_name = "accounts"

urlpatterns = [
    # Mobile clients: refresh short-lived access tokens (see SIMPLE_JWT in settings).
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("otp/request/", views.RequestOTPView.as_view(), name="otp-request"),
    path("otp/verify/", views.VerifyOTPView.as_view(), name="otp-verify"),
    path("profile/", views.UserProfileView.as_view(), name="profile"),
    path(
        "enable-property-owner/",
        views.EnablePropertyOwnerView.as_view(),
        name="enable-property-owner",
    ),
    path(
        "enable-landlord/",
        views.EnableLandlordView.as_view(),
        name="enable-landlord",
    ),
    path(
        "owner-profile/",
        views.OwnerProfileView.as_view(),
        name="owner-profile",
    ),
    path(
        "property-owner/<int:pk>/",
        views.PropertyOwnerProfileView.as_view(),
        name="property-owner-profile",
    ),
    path(
        "landlord/<int:pk>/",
        views.LandlordProfileView.as_view(),
        name="landlord-profile",
    ),
    path(
        "change-password/",
        views.ChangePasswordView.as_view(),
        name="change-password",
    ),
    path(
        "admin/users/",
        admin_views.AdminUserListView.as_view(),
        name="admin-users-list",
    ),
    path(
        "admin/users/<int:pk>/status/",
        admin_views.AdminUserStatusView.as_view(),
        name="admin-users-status",
    ),
]
