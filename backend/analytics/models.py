from django.conf import settings
from django.db import models


class PropertyView(models.Model):
    property = models.ForeignKey(
        "properties.Property",
        on_delete=models.CASCADE,
        related_name="view_logs",
    )
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="property_views",
    )
    ip_address = models.GenericIPAddressField()
    session_id = models.CharField(max_length=255, blank=True, default="")
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-viewed_at"]
        indexes = [
            models.Index(fields=["property", "-viewed_at"]),
            models.Index(fields=["-viewed_at"]),
        ]

    def __str__(self):
        viewer = self.viewer or self.ip_address
        return f"{viewer} viewed {self.property} at {self.viewed_at}"


class SearchLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="search_logs",
    )
    query = models.CharField(max_length=255)
    filters = models.JSONField(default=dict, blank=True)
    results_count = models.IntegerField(default=0)
    searched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-searched_at"]
        indexes = [
            models.Index(fields=["-searched_at"]),
        ]

    def __str__(self):
        return f'"{self.query}" ({self.results_count} results)'
