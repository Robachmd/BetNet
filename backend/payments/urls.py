from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "payments"

router = DefaultRouter()
router.register(r"subscriptions", views.SubscriptionViewSet, basename="subscription")

urlpatterns = [
    path(
        "listing-packages/slots/summary/",
        views.ListingSlotSummaryView.as_view(),
        name="listing-slots-summary",
    ),
    path(
        "listing-packages/my-purchases/",
        views.MyListingPackagePurchasesView.as_view(),
        name="my-listing-purchases",
    ),
    path(
        "listing-packages/my-active/",
        views.MyActiveListingPackagePurchaseView.as_view(),
        name="my-active-listing-purchase",
    ),
    path(
        "listing-packages/<int:package_id>/purchase/",
        views.InitiateListingPackagePurchaseView.as_view(),
        name="listing-package-purchase",
    ),
    path(
        "listing-packages/",
        views.ListingPackageListView.as_view(),
        name="listing-packages",
    ),
    path("initiate/", views.InitiatePaymentView.as_view(), name="initiate"),
    path("verify/", views.VerifyPaymentView.as_view(), name="verify"),
    path("history/", views.PaymentHistoryView.as_view(), name="history"),
    path("earnings/", views.PropertyOwnerEarningsView.as_view(), name="earnings"),
    path(
        "feature/<int:property_id>/",
        views.FeatureListingView.as_view(),
        name="feature-listing",
    ),
    # Provider webhooks (csrf-exempt, no auth)
    path("webhooks/chapa/", views.ChapaWebhookView.as_view(), name="webhook-chapa"),
    path("webhooks/telebirr/", views.TelebirrWebhookView.as_view(), name="webhook-telebirr"),
    path("webhooks/stripe/", views.StripeWebhookView.as_view(), name="webhook-stripe"),
    # Router URLs
    path("", include(router.urls)),
]
