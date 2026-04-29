from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from properties.models import Property


@receiver(pre_save, sender=Property)
def _cache_property_published_flag(sender, instance, **kwargs):
    if not instance.pk:
        instance._was_is_published = False
        return
    from properties.models import Property

    try:
        old = Property.objects.only("is_published").get(pk=instance.pk).is_published
    except Property.DoesNotExist:
        old = False
    instance._was_is_published = bool(old)


@receiver(post_save, sender=Property)
def _on_property_first_publish_notify_area_watchers(sender, instance, **kwargs):
    if not instance.is_published:
        return
    if getattr(instance, "_was_is_published", False):
        return

    def _send():
        from .services import notify_subscribers_of_new_listing

        notify_subscribers_of_new_listing(instance)

    transaction.on_commit(_send)
