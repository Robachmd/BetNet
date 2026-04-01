from rest_framework import serializers

from .models import PropertyView, SearchLog


class PropertyViewSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(
        source="property.title", read_only=True
    )

    class Meta:
        model = PropertyView
        fields = [
            "id",
            "property",
            "property_title",
            "viewer",
            "ip_address",
            "session_id",
            "viewed_at",
        ]
        read_only_fields = fields


class SearchLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchLog
        fields = [
            "id",
            "user",
            "query",
            "filters",
            "results_count",
            "searched_at",
        ]
        read_only_fields = fields
