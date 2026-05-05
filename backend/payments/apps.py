from django.apps import AppConfig
from django.core.exceptions import ImproperlyConfigured


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "payments"
    verbose_name = "Payments & Subscriptions"

    def ready(self) -> None:
        """
        Fail fast (prod) / warn (dev) when payment provider secrets are missing.
        This avoids confusing runtime failures when initiating payments.
        """
        from django.conf import settings
        import logging

        logger = logging.getLogger(__name__)

        if not (getattr(settings, "CHAPA_SECRET_KEY", "") or "").strip():
            msg = (
                "CHAPA_SECRET_KEY is not set. Add it to backend/.env (or as an "
                "environment variable) to enable Chapa payments."
            )
            if getattr(settings, "DEBUG", False):
                logger.warning(msg)
            else:
                raise ImproperlyConfigured(msg)
