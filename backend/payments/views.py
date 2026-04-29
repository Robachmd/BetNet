import json
import logging

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .listing_package_services import (
    activate_listing_package_purchase,
    cancel_pending_purchase,
)
from .models import (
    ListingPackage,
    ListingPackagePurchase,
    Payment,
    Subscription,
)
from .serializers import (
    ListingPackagePurchaseSerializer,
    ListingPackageSerializer,
    PaymentCreateSerializer,
    PaymentSerializer,
    PaymentVerifySerializer,
    SubscriptionCreateSerializer,
    SubscriptionSerializer,
)
from .services import ChapaService, StripeService, TelebirrService
from properties.permissions import IsPropertyOwner

logger = logging.getLogger(__name__)


class InitiatePaymentView(APIView):
    """Create a Payment record and redirect the client to the provider checkout."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payment = Payment.objects.create(
            user=request.user,
            payment_type=data["payment_type"],
            amount=data["amount"],
            currency=data["currency"],
            payment_method=data["payment_method"],
            property_id=data.get("property_id"),
            hall_booking_id=data.get("hall_booking_id"),
            description=data.get("description", ""),
        )

        checkout_url = None
        error = None

        if data["payment_method"] == Payment.PaymentMethod.CHAPA:
            result = ChapaService().initialize_payment(
                amount=str(payment.amount),
                email=request.user.email,
                tx_ref=payment.transaction_id,
                callback_url=data.get("callback_url", ""),
                return_url=data.get("return_url", ""),
                first_name=getattr(request.user, "first_name", ""),
                last_name=getattr(request.user, "last_name", ""),
            )
            if result.success:
                checkout_url = result.checkout_url
                payment.payment_data = result.data
                payment.save(update_fields=["payment_data"])
            else:
                error = result.error

        elif data["payment_method"] == Payment.PaymentMethod.TELEBIRR:
            result = TelebirrService().initialize_payment(
                amount=str(payment.amount),
                phone=request.data.get("phone", ""),
                tx_ref=payment.transaction_id,
                notify_url=data.get("callback_url", ""),
                return_url=data.get("return_url", ""),
            )
            if result.success:
                checkout_url = result.checkout_url
                payment.payment_data = result.data
                payment.save(update_fields=["payment_data"])
            else:
                error = result.error

        elif data["payment_method"] == Payment.PaymentMethod.STRIPE:
            amount_cents = int(payment.amount * 100)
            result = StripeService().create_checkout_session(
                amount=amount_cents,
                currency=payment.currency,
                metadata={
                    "payment_id": str(payment.id),
                    "tx_ref": payment.transaction_id,
                    "description": payment.description,
                },
                success_url=data.get("return_url", ""),
                cancel_url=data.get("callback_url", ""),
                customer_email=request.user.email,
            )
            if result.success:
                checkout_url = result.checkout_url
                payment.payment_data = result.data
                payment.save(update_fields=["payment_data"])
            else:
                error = result.error

        elif data["payment_method"] == Payment.PaymentMethod.BANK_TRANSFER:
            checkout_url = None

        if error:
            payment.mark_failed({"error": error})
            return Response(
                {"error": error, "transaction_id": payment.transaction_id},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "transaction_id": payment.transaction_id,
                "checkout_url": checkout_url,
                "payment": PaymentSerializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )


def _apply_post_payment_effects(payment: Payment):
    """Side effects after a payment is successfully completed."""
    if (
        payment.payment_type == Payment.PaymentType.FEATURED_LISTING
        and payment.property_id
    ):
        from properties.models import Property

        Property.objects.filter(pk=payment.property_id).update(is_featured=True)
        logger.info("Property %s marked as featured", payment.property_id)

    if payment.payment_type == Payment.PaymentType.HALL_BOOKING and payment.hall_booking_id:
        try:
            from bookings.models import HallBooking

            booking = HallBooking.objects.get(pk=payment.hall_booking_id)
            booking.is_paid = True
            booking.save(update_fields=["is_paid"])
            logger.info("HallBooking %s marked as paid", payment.hall_booking_id)
        except Exception:
            logger.exception("Failed to update hall booking %s", payment.hall_booking_id)

    if payment.payment_type == Payment.PaymentType.LISTING_PACKAGE:
        try:
            activate_listing_package_purchase(payment)
        except Exception:
            logger.exception("Failed to activate listing package for payment %s", payment.pk)


@method_decorator(csrf_exempt, name="dispatch")
class ChapaWebhookView(APIView):
    """Handle Chapa payment callback / webhook."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        body = request.data
        tx_ref = body.get("tx_ref") or body.get("trx_ref", "")

        if not tx_ref:
            return Response({"error": "Missing tx_ref"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(transaction_id=tx_ref)
        except Payment.DoesNotExist:
            logger.warning("Chapa webhook: unknown tx_ref %s", tx_ref)
            return Response(status=status.HTTP_404_NOT_FOUND)

        if payment.status == Payment.Status.COMPLETED:
            return Response({"status": "already_completed"})

        result = ChapaService().verify_payment(tx_ref)
        if result.success:
            payment.mark_completed(result.data)
            _apply_post_payment_effects(payment)
            return Response({"status": "completed"})

        payment.mark_failed(result.data)
        return Response({"status": "failed"}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        tx_ref = request.query_params.get("trx_ref", "")
        if not tx_ref:
            return Response({"error": "Missing trx_ref"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(transaction_id=tx_ref)
        except Payment.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if payment.status != Payment.Status.COMPLETED:
            result = ChapaService().verify_payment(tx_ref)
            if result.success:
                payment.mark_completed(result.data)
                _apply_post_payment_effects(payment)

        return Response(PaymentSerializer(payment).data)


@method_decorator(csrf_exempt, name="dispatch")
class TelebirrWebhookView(APIView):
    """Handle Telebirr payment notification."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        body = request.data
        tx_ref = body.get("outTradeNo", "")

        if not tx_ref:
            return Response({"error": "Missing outTradeNo"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(transaction_id=tx_ref)
        except Payment.DoesNotExist:
            logger.warning("Telebirr webhook: unknown tx_ref %s", tx_ref)
            return Response(status=status.HTTP_404_NOT_FOUND)

        if payment.status == Payment.Status.COMPLETED:
            return Response({"status": "already_completed"})

        result = TelebirrService().verify_payment(tx_ref)
        if result.success:
            payment.mark_completed(result.data)
            _apply_post_payment_effects(payment)
            return Response({"status": "completed"})

        payment.mark_failed(result.data)
        return Response({"status": "failed"}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """Handle Stripe webhook events."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        service = StripeService()
        event = service.verify_webhook(payload, sig_header)
        if event is None:
            return Response(
                {"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST
            )

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            tx_ref = session.get("metadata", {}).get("tx_ref", "")

            if not tx_ref:
                logger.warning("Stripe webhook: no tx_ref in metadata")
                return Response(status=status.HTTP_400_BAD_REQUEST)

            try:
                payment = Payment.objects.get(transaction_id=tx_ref)
            except Payment.DoesNotExist:
                logger.warning("Stripe webhook: unknown tx_ref %s", tx_ref)
                return Response(status=status.HTTP_404_NOT_FOUND)

            if payment.status != Payment.Status.COMPLETED:
                payment.mark_completed(session)
                _apply_post_payment_effects(payment)

        return Response({"status": "ok"})


class VerifyPaymentView(APIView):
    """Manually verify / check a payment status with the provider."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaymentVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            payment = Payment.objects.get(
                transaction_id=data["transaction_id"], user=request.user
            )
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if payment.status == Payment.Status.COMPLETED:
            return Response(PaymentSerializer(payment).data)

        result = None
        method = data["payment_method"]

        if method == Payment.PaymentMethod.CHAPA:
            result = ChapaService().verify_payment(payment.transaction_id)
        elif method == Payment.PaymentMethod.TELEBIRR:
            result = TelebirrService().verify_payment(payment.transaction_id)
        elif method == Payment.PaymentMethod.STRIPE:
            session_id = payment.payment_data.get("session_id")
            if session_id:
                session = StripeService.retrieve_session(session_id)
                if session and session.get("payment_status") == "paid":
                    result = type("R", (), {"success": True, "data": dict(session)})()
                else:
                    result = type("R", (), {"success": False, "data": {}})()

        if result and result.success:
            payment.mark_completed(result.data)
            _apply_post_payment_effects(payment)
            return Response(PaymentSerializer(payment).data)

        return Response(
            {"status": payment.status, "message": "Payment not yet confirmed."},
            status=status.HTTP_200_OK,
        )


class PaymentHistoryView(generics.ListAPIView):
    """List the authenticated user's payment history."""

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).select_related(
            "property", "hall_booking", "listing_package"
        )


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return SubscriptionCreateSerializer
        return SubscriptionSerializer

    def perform_create(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.deactivate()


def _initiate_listing_package_checkout(
    request,
    payment: Payment,
) -> tuple[str | None, str | None]:
    """
    Return (checkout_url, error_message) for Chapa / Telebirr / Stripe, or (None, None) for bank.
    """
    payment_method = request.data.get("payment_method", Payment.PaymentMethod.CHAPA)
    if payment_method not in Payment.PaymentMethod.values:
        return None, "Invalid payment method."
    if payment_method == Payment.PaymentMethod.CHAPA:
        result = ChapaService().initialize_payment(
            amount=str(payment.amount),
            email=request.user.email,
            tx_ref=payment.transaction_id,
            callback_url=request.data.get("callback_url", ""),
            return_url=request.data.get("return_url", ""),
            first_name=getattr(request.user, "first_name", ""),
            last_name=getattr(request.user, "last_name", ""),
        )
        if result.success:
            payment.payment_data = result.data
            payment.save(update_fields=["payment_data"])
            return result.checkout_url, None
        return None, result.error

    if payment_method == Payment.PaymentMethod.TELEBIRR:
        result = TelebirrService().initialize_payment(
            amount=str(payment.amount),
            phone=request.data.get("phone", ""),
            tx_ref=payment.transaction_id,
            notify_url=request.data.get("callback_url", ""),
            return_url=request.data.get("return_url", ""),
        )
        if result.success:
            payment.payment_data = result.data
            payment.save(update_fields=["payment_data"])
            return result.checkout_url, None
        return None, result.error

    if payment_method == Payment.PaymentMethod.STRIPE:
        amount_cents = int(payment.amount * 100)
        result = StripeService().create_checkout_session(
            amount=amount_cents,
            currency=payment.currency.lower() if payment.currency else "etb",
            metadata={
                "payment_id": str(payment.id),
                "tx_ref": payment.transaction_id,
                "description": payment.description,
            },
            success_url=request.data.get("return_url", ""),
            cancel_url=request.data.get("callback_url", ""),
            customer_email=request.user.email,
        )
        if result.success:
            payment.payment_data = result.data
            payment.save(update_fields=["payment_data"])
            return result.checkout_url, None
        return None, result.error

    return None, None  # bank transfer — no redirect


class ListingPackageListView(generics.ListAPIView):
    """Active listing packages (public catalog for UI pricing)."""

    permission_classes = [permissions.AllowAny]
    serializer_class = ListingPackageSerializer
    queryset = ListingPackage.objects.filter(is_active=True)
    filter_backends: list = []  # no filter class required


class MyListingPackagePurchasesView(generics.ListAPIView):
    """List current user's package purchases and slot balance."""

    permission_classes = [permissions.IsAuthenticated, IsPropertyOwner]
    serializer_class = ListingPackagePurchaseSerializer

    def get_queryset(self):
        return (
            ListingPackagePurchase.objects.filter(user=self.request.user)
            .select_related("package", "payment")
            .order_by("-created_at")
        )


class ListingSlotSummaryView(APIView):
    """
    How many publish slots the user has (packages + optional legacy subscription).
    """

    permission_classes = [permissions.IsAuthenticated, IsPropertyOwner]

    def get(self, request):
        from .listing_package_services import total_slot_remaining_from_packages
        from .models import Subscription
        from properties.models import Property

        slots_packages = total_slot_remaining_from_packages(request.user)
        published = Property.objects.filter(
            owner=request.user, is_published=True
        ).count()
        sub = (
            Subscription.objects.filter(user=request.user, is_active=True)
            .order_by("-created_at")
            .first()
        )
        legacy_remaining = 0
        if sub and not sub.is_expired:
            legacy_remaining = max(0, sub.max_listings - published)

        can_pub = (slots_packages > 0) or (legacy_remaining > 0)
        return Response(
            {
                "package_slots_remaining": slots_packages,
                "legacy_subscription_slots_remaining": legacy_remaining
                if sub and not sub.is_expired
                else 0,
                "published_listings_count": published,
                "can_publish": can_pub,
            }
        )


class InitiateListingPackagePurchaseView(APIView):
    """
    Buy a listing slot bundle. Creates a pending purchase + payment, returns checkout_url.
    """

    permission_classes = [permissions.IsAuthenticated, IsPropertyOwner]

    def post(self, request, package_id: int):
        try:
            pkg = ListingPackage.objects.get(pk=package_id, is_active=True)
        except ListingPackage.DoesNotExist:
            return Response(
                {"error": "Package not found or inactive."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payment_method = request.data.get("payment_method", Payment.PaymentMethod.CHAPA)
        if payment_method not in Payment.PaymentMethod.values:
            return Response(
                {"error": "Invalid payment method."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.create(
            user=request.user,
            payment_type=Payment.PaymentType.LISTING_PACKAGE,
            amount=pkg.price,
            currency=pkg.currency,
            payment_method=payment_method,
            listing_package=pkg,
            description=f"Listing package: {pkg.name}",
        )
        purchase = ListingPackagePurchase.objects.create(
            user=request.user,
            package=pkg,
            status=ListingPackagePurchase.Status.PENDING,
            slots_total=pkg.listing_quota,
            slots_used=0,
            payment=payment,
        )

        checkout_url, error = _initiate_listing_package_checkout(request, payment)
        if error:
            payment.mark_failed({"error": error})
            cancel_pending_purchase(purchase)
            return Response(
                {"error": error, "transaction_id": payment.transaction_id},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "transaction_id": payment.transaction_id,
                "purchase_id": purchase.id,
                "checkout_url": checkout_url,
                "payment": PaymentSerializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )


class FeatureListingView(APIView):
    """Initiate payment to boost / feature a specific property listing."""

    permission_classes = [permissions.IsAuthenticated]
    FEATURE_PRICE = 500  # ETB

    def post(self, request, property_id):
        from properties.models import Property

        try:
            prop = Property.objects.get(pk=property_id, owner=request.user)
        except Property.DoesNotExist:
            return Response(
                {"error": "Property not found or you are not the owner."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if prop.is_featured:
            return Response(
                {"error": "Property is already featured."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = request.data.get("payment_method", Payment.PaymentMethod.CHAPA)
        if payment_method not in Payment.PaymentMethod.values:
            return Response(
                {"error": "Invalid payment method."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.create(
            user=request.user,
            payment_type=Payment.PaymentType.FEATURED_LISTING,
            amount=self.FEATURE_PRICE,
            currency="ETB",
            payment_method=payment_method,
            property=prop,
            description=f"Feature listing: {prop.title}",
        )

        checkout_url = None
        error = None

        if payment_method == Payment.PaymentMethod.CHAPA:
            result = ChapaService().initialize_payment(
                amount=str(payment.amount),
                email=request.user.email,
                tx_ref=payment.transaction_id,
                callback_url=request.data.get("callback_url", ""),
                return_url=request.data.get("return_url", ""),
                first_name=getattr(request.user, "first_name", ""),
                last_name=getattr(request.user, "last_name", ""),
            )
            if result.success:
                checkout_url = result.checkout_url
                payment.payment_data = result.data
                payment.save(update_fields=["payment_data"])
            else:
                error = result.error

        elif payment_method == Payment.PaymentMethod.TELEBIRR:
            result = TelebirrService().initialize_payment(
                amount=str(payment.amount),
                phone=request.data.get("phone", ""),
                tx_ref=payment.transaction_id,
                notify_url=request.data.get("callback_url", ""),
                return_url=request.data.get("return_url", ""),
            )
            if result.success:
                checkout_url = result.checkout_url
                payment.payment_data = result.data
                payment.save(update_fields=["payment_data"])
            else:
                error = result.error

        elif payment_method == Payment.PaymentMethod.STRIPE:
            amount_cents = int(payment.amount * 100)
            result = StripeService().create_checkout_session(
                amount=amount_cents,
                currency="etb",
                metadata={
                    "payment_id": str(payment.id),
                    "tx_ref": payment.transaction_id,
                    "description": payment.description,
                },
                success_url=request.data.get("return_url", ""),
                cancel_url=request.data.get("callback_url", ""),
                customer_email=request.user.email,
            )
            if result.success:
                checkout_url = result.checkout_url
                payment.payment_data = result.data
                payment.save(update_fields=["payment_data"])
            else:
                error = result.error

        if error:
            payment.mark_failed({"error": error})
            return Response(
                {"error": error, "transaction_id": payment.transaction_id},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "transaction_id": payment.transaction_id,
                "checkout_url": checkout_url,
                "payment": PaymentSerializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )
