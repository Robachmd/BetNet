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


class ChapaService:
    BASE_URL = "https://api.chapa.co/v1"

    def __init__(self):
        self.secret_key = settings.CHAPA_SECRET_KEY
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

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
                )
            logger.warning("Chapa init failed: %s", data)
            return PaymentResult(
                success=False,
                data=data,
                error=data.get("message", "Payment initialization failed"),
            )
        except requests.RequestException as exc:
            logger.exception("Chapa request error")
            return PaymentResult(success=False, data={}, error=str(exc))

    def verify_payment(self, tx_ref: str) -> PaymentResult:
        try:
            resp = requests.get(
                f"{self.BASE_URL}/transaction/verify/{tx_ref}",
                headers=self.headers,
                timeout=30,
            )
            data = resp.json()

            if resp.status_code == 200 and data.get("status") == "success":
                return PaymentResult(success=True, data=data)
            return PaymentResult(
                success=False,
                data=data,
                error=data.get("message", "Verification failed"),
            )
        except requests.RequestException as exc:
            logger.exception("Chapa verify error")
            return PaymentResult(success=False, data={}, error=str(exc))


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
