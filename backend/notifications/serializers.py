from rest_framework import serializers

from .models import LocationAlert, Notification, NotificationPreference
from properties.models import Property


class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(
        source="get_notification_type_display", read_only=True
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "notification_type_display",
            "title",
            "message",
            "is_read",
            "data",
            "created_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "email_notifications",
            "sms_notifications",
            "push_notifications",
            "new_listing_alerts",
            "price_drop_alerts",
            "booking_updates",
            "message_notifications",
        ]


class LocationAlertSerializer(serializers.ModelSerializer):
    """Accepts `property_types` (list) and legacy `property_type` (single string)."""

    property_types = serializers.ListField(
        child=serializers.CharField(max_length=30),
        required=False,
        allow_empty=True,
    )
    property_type = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text="Deprecated: use property_types. If set, merged into property_types.",
    )

    class Meta:
        model = LocationAlert
        fields = [
            "id",
            "label",
            "city",
            "sub_city",
            "property_types",
            "property_type",
            "only_available_listings",
            "latitude",
            "longitude",
            "radius_km",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        lat = attrs.get("latitude", getattr(self.instance, "latitude", None))
        lon = attrs.get("longitude", getattr(self.instance, "longitude", None))
        if (lat is None) ^ (lon is None):
            raise serializers.ValidationError(
                "Set both latitude and longitude, or leave both empty for city-only matching."
            )

        allowed = {c[0] for c in Property.PropertyType.choices}
        raw_list = attrs.get("property_types", serializers.empty)
        legacy = (attrs.pop("property_type", None) or "").strip()

        if raw_list is serializers.empty:
            if self.instance is not None:
                types_list = list(getattr(self.instance, "property_types", None) or [])
            else:
                types_list = []
        else:
            types_list = list(raw_list or [])

        if legacy:
            types_list.append(legacy)

        seen = []
        for pt in types_list:
            u = str(pt).strip().upper()
            if not u:
                continue
            if u not in allowed:
                raise serializers.ValidationError(
                    {"property_types": f"Invalid property type: {pt}"}
                )
            if u not in seen:
                seen.append(u)

        attrs["property_types"] = seen
        return attrs
