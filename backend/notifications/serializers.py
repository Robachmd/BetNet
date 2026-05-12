from rest_framework import serializers

from .models import LocationAlert, Notification, NotificationPreference


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
    class Meta:
        model = LocationAlert
        fields = [
            "id",
            "label",
            "city",
            "sub_city",
            "property_type",
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
        pt = attrs.get("property_type", getattr(self.instance, "property_type", ""))
        if pt:
            from properties.models import Property

            allowed = {c[0] for c in Property.PropertyType.choices}
            if str(pt).upper() not in allowed:
                raise serializers.ValidationError(
                    {"property_type": "Invalid property type."}
                )
        return attrs
