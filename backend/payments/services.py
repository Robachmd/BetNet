import hashlib
import hmac
import json
import logging
from dataclasses import dataclass

import requests
import stripe
from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class PaymentResult:
    success: bool
    data: dict
    checkout_url: str | None = None
    error: str | None = None
    provider: str | None = None
    reason: str | None = None
    hint: str | None = None
    provider_code: str | None = None


class ChapaService:
    BASE_URL = "https://api.chapa.co/v1"
    PUBLIC_KEY_PREFIXES = ("CHAPUBK_", "CHAPUBK-", "CHAPUBK")

    def __init__(self):
        self.secret_key = (settings.CHAPA_SECRET_KEY or "").strip()
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }
        self.key_fingerprint = self._fingerprint_key(self.secret_key)

    @staticmethod
    def _fingerprint_key(key: str) -> str:
        if not key:
            return "empty"
        digest = hashlib.sha256(key.encode()).hexdigest()[:10]
        return f"len={len(key)} sha256={digest}"

    @staticmethod
    def _extract_provider_code(payload: dict) -> str | None:
        code = payload.get("code")
        if code is None and isinstance(payload.get("data"), dict):
            code = payload["data"].get("code")
        if code is None:
            return None
        return str(code)

    @staticmethod
    def _classify_provider_failure(message: str) -> tuple[str, str]:
        msg = (message or "").lower()
        if "invalid api key" in msg or "api key" in msg:
            return (
                "invalid_api_key",
                "Server payment key is invalid. Set a valid CHAPA_SECRET_KEY for the active environment.",
            )
        if "can't accept payments" in msg or "cannot accept payments" in msg:
            return (
                "merchant_inactive",
                "Chapa merchant account is not active for collections. Activate business/account in Chapa dashboard.",
            )
        if "unauthorized" in msg or "forbidden" in msg:
            return (
                "auth_failed",
                "Payment gateway rejected credentials. Recheck CHAPA_SECRET_KEY and account mode (test/live).",
            )
        return (
            "provider_error",
            "Payment provider rejected initialization. Verify key/account status in Chapa dashboard.",
        )

    def _failure_result(
        self,
        *,
        error: str,
        reason: str,
        hint: str,
        data: dict | None = None,
        provider_code: str | None = None,
    ) -> PaymentResult:
        return PaymentResult(
            success=False,
            data=data or {},
            error=error,
            provider="CHAPA",
            reason=reason,
            hint=hint,
            provider_code=provider_code,
        )

    def _ensure_key(self) -> PaymentResult | None:
        if not self.secret_key:
            logger.error(
                "Chapa key validation failed: empty key (%s)",
                self.key_fingerprint,
            )
            return self._failure_result(
                error="CHAPA_SECRET_KEY is empty on the server.",
                reason="missing_server_key",
                hint="Set CHAPA_SECRET_KEY on the backend environment and restart the service.",
            )
        if self.secret_key.upper().startswith(self.PUBLIC_KEY_PREFIXES):
            logger.error(
                "Chapa key validation failed: public key used as secret (%s)",
                self.key_fingerprint,
            )
            return self._failure_result(
                error="CHAPA_SECRET_KEY appears to be a public key.",
                reason="wrong_key_type",
                hint="Use the Chapa SECRET key (not CHAPUBK public key) in CHAPA_SECRET_KEY.",
            )
        return None

    def initialize_payment(
        self,
        amount: str,
        email: str,
        tx_ref: str,
        callback_url: str,
        return_url: str = "",
        first_name: str = "",
        last_name: str = "",
        phone_number: str = "",
        currency: str = "ETB",
        customization: dict | None = None,
    ) -> PaymentResult:
        missing = self._ensure_key()
        if missing:
            return missing

        payload = {
            "amount": str(amount),
            "currency": currency,
            "email": email,
            "tx_ref": tx_ref,
            "callback_url": callback_url,
            "first_name": first_name,
            "last_name": last_name,
            "phone_number": phone_number,
        }
        if return_url:
            payload["return_url"] = return_url
        if customization:
            payload["customization"] = customization

        try:
            resp = requests.post(
                f"{self.BASE_URL}/transaction/initialize",
                json=payload,
                headers=self.headers,
                timeout=30,
            )
            data = resp.json()

            if resp.status_code == 200 and data.get("status") == "success":
                return PaymentResult(
                    success=True,
                    data=data,
                    checkout_url=data["data"]["checkout_url"],
                    provider="CHAPA",
                )
            message = data.get("message", "Payment initialization failed")
            reason, hint = self._classify_provider_failure(message)
            provider_code = self._extract_provider_code(data)
            logger.warning(
                "Chapa init failed (%s): code=%s msg=%s fingerprint=%s",
                reason,
                provider_code,
                message,
                self.key_fingerprint,
            )
            return self._failure_result(
                error=message,
                reason=reason,
                hint=hint,
                data=data,
                provider_code=provider_code,
            )
        except requests.RequestException as exc:
            logger.exception(
                "Chapa request error (%s) while initializing payment", self.key_fingerprint
            )
            return self._failure_result(
                error=str(exc),
                reason="provider_network_error",
                hint="Could not reach Chapa. Check network/connectivity and retry.",
            )

    def verify_payment(self, tx_ref: str) -> PaymentResult:
        missing = self._ensure_key()
        if missing:
            return missing

        try:
            resp = requests.get(
                f"{self.BASE_URL}/transaction/verify/{tx_ref}",
                headers=self.headers,
                timeout=30,
            )
            data = resp.json()

            if resp.status_code == 200 and data.get("status") == "success":
                return PaymentResult(success=True, data=data, provider="CHAPA")
            message = data.get("message", "Verification failed")
            reason, hint = self._classify_provider_failure(message)
            provider_code = self._extract_provider_code(data)
            logger.warning(
                "Chapa verify failed (%s): code=%s msg=%s fingerprint=%s",
                reason,
                provider_code,
                message,
                self.key_fingerprint,
            )
            return self._failure_result(
                error=message,
                reason=reason,
                hint=hint,
                data=data,
                provider_code=provider_code,
            )
        except requests.RequestException as exc:
            logger.exception(
                "Chapa request error (%s) while verifying payment", self.key_fingerprint
            )
            return self._failure_result(
                error=str(exc),
                reason="provider_network_error",
                hint="Could not reach Chapa while verifying payment.",
            )


class TelebirrService:
    BASE_URL = "https://api.ethiotelecom.et/v1"

    def __init__(self):
        self.app_id = settings.TELEBIRR_APP_ID
        self.app_key = settings.TELEBIRR_APP_KEY
        self.short_code = settings.TELEBIRR_SHORT_CODE
        self.public_key = settings.TELEBIRR_PUBLIC_KEY

    def _sign_payload(self, payload: dict) -> str:
        sorted_keys = sorted(payload.keys())
        sign_str = "&".join(f"{k}={payload[k]}" for k in sorted_keys)
        return hashlib.sha256(sign_str.encode()).hexdigest().upper()

    def initialize_payment(
        self,
        amount: str,
        phone: str,
        tx_ref: str,
        notify_url: str = "",
        return_url: str = "",
        subject: str = "BetNet Payment",
    ) -> PaymentResult:
        payload = {
            "appId": self.app_id,
            "appKey": self.app_key,
            "shortCode": self.short_code,
            "outTradeNo": tx_ref,
            "subject": subject,
            "totalAmount": str(amount),
            "receiveName": "BetNet",
            "notifyUrl": notify_url,
            "returnUrl": return_url,
            "timeoutExpress": "30",
        }
        payload["sign"] = self._sign_payload(payload)

        try:
            resp = requests.post(
                f"{self.BASE_URL}/payment/create",
                json=payload,
                timeout=30,
            )
            data = resp.json()

            if data.get("code") == "200":
                return PaymentResult(
                    success=True,
                    data=data,
                    checkout_url=data.get("data", {}).get("toPayUrl"),
                )
            logger.warning("Telebirr init failed: %s", data)
            return PaymentResult(
                success=False,
                data=data,
                error=data.get("msg", "Payment initialization failed"),
            )
        except requests.RequestException as exc:
            logger.exception("Telebirr request error")
            return PaymentResult(success=False, data={}, error=str(exc))

    def verify_payment(self, tx_ref: str) -> PaymentResult:
        payload = {
            "appId": self.app_id,
            "appKey": self.app_key,
            "outTradeNo": tx_ref,
        }
        payload["sign"] = self._sign_payload(payload)

        try:
            resp = requests.post(
                f"{self.BASE_URL}/payment/query",
                json=payload,
                timeout=30,
            )
            data = resp.json()

            if data.get("code") == "200" and data.get("data", {}).get("tradeStatus") == "Completed":
                return PaymentResult(success=True, data=data)
            return PaymentResult(
                success=False,
                data=data,
                error=data.get("msg", "Verification failed"),
            )
        except requests.RequestException as exc:
            logger.exception("Telebirr verify error")
            return PaymentResult(success=False, data={}, error=str(exc))


class StripeService:
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    def create_checkout_session(
        self,
        amount: int,
        currency: str,
        metadata: dict,
        success_url: str,
        cancel_url: str,
        customer_email: str = "",
    ) -> PaymentResult:
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": currency.lower(),
                            "unit_amount": amount,
                            "product_data": {
                                "name": metadata.get("description", "BetNet Payment"),
                            },
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
                customer_email=customer_email or None,
            )
            return PaymentResult(
                success=True,
                data={"session_id": session.id},
                checkout_url=session.url,
            )
        except stripe.error.StripeError as exc:
            logger.exception("Stripe session error")
            return PaymentResult(success=False, data={}, error=str(exc))

    def verify_webhook(self, payload: bytes, sig_header: str) -> dict | None:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return event
        except (ValueError, stripe.error.SignatureVerificationError):
            logger.warning("Invalid Stripe webhook signature")
            return None

    @staticmethod
    def retrieve_session(session_id: str) -> dict | None:
        try:
            return stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError:
            logger.exception("Stripe retrieve error")
            return None
