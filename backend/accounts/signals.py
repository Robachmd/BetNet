import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """Handle side-effects after a new user is created."""
    if not created:
        return

    logger.info("New user created: %s (%s)", instance.phone_number, instance.role)

    # Create default notification preferences when the notifications app is
    # installed.  Wrapped in try/except so the accounts app stays
    # self-contained even if the notifications app isn't ready yet.
    try:
        from notifications.models import NotificationPreference

        NotificationPreference.objects.get_or_create(user=instance)
    except Exception:
        pass
