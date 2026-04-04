from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

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
        "landlord/<int:pk>/",
        views.LandlordProfileView.as_view(),
        name="landlord-profile",
    ),
    path(
        "change-password/",
        views.ChangePasswordView.as_view(),
        name="change-password",
    ),
]
