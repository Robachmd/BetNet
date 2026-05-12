"""
Smoke tests for notification list + types used by packages and area alerts.
Manual E2E (payments + webhooks + map): see test_listing_package_verification module docstring.
"""

from rest_framework.test import APIClient

from accounts.models import User
from django.test import TestCase

from notifications.models import Notification
from notifications.services import create_notification


class NotificationListTypeFieldsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone_number="+251922222222",
            password="testpass123",
            email="notif@test.local",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_list_returns_paginated_results_with_notification_type(self):
        create_notification(
            self.user,
            Notification.NotificationType.LISTING_PACKAGE_LOW,
            "Credits low",
            "One publish left in your bundle.",
        )
        create_notification(
            self.user,
            Notification.NotificationType.NEW_LISTING,
            "New near you",
            "A new listing matches Addis Ababa.",
        )
        res = self.client.get("/api/notifications/", {"page_size": 10})
        self.assertEqual(res.status_code, 200)
        self.assertIn("results", res.data)
        self.assertEqual(len(res.data["results"]), 2)
        types = {row["notification_type"] for row in res.data["results"]}
        self.assertIn("LISTING_PACKAGE_LOW", types)
        self.assertIn("NEW_LISTING", types)
        for row in res.data["results"]:
            self.assertIn("is_read", row)
            self.assertIn("notification_type_display", row)


class LocationAlertApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone_number="+251933333333",
            password="testpass123",
            email="renter1@test.local",
        )
        self.other = User.objects.create_user(
            phone_number="+251944444444",
            password="testpass123",
            email="renter2@test.local",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_and_list_location_alerts_only_for_current_user(self):
        create_res = self.client.post(
            "/api/notifications/location-alerts/",
            {
                "label": "Near office",
                "city": "Addis Ababa",
                "sub_city": "Bole",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, 201)
        self.assertEqual(create_res.data["city"], "Addis Ababa")
        self.assertEqual(create_res.data.get("property_types"), [])
        self.assertTrue(create_res.data.get("only_available_listings", True))

        multi_res = self.client.post(
            "/api/notifications/location-alerts/",
            {
                "label": "Apt + condo",
                "city": "Addis Ababa",
                "sub_city": "",
                "property_types": ["APARTMENT", "CONDOMINIUM"],
                "only_available_listings": True,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(multi_res.status_code, 201)
        self.assertEqual(multi_res.data["property_types"], ["APARTMENT", "CONDOMINIUM"])

        self.other.location_alerts.create(
            label="Other area",
            city="Adama",
            sub_city="",
            is_active=True,
        )

        list_res = self.client.get("/api/notifications/location-alerts/")
        self.assertEqual(list_res.status_code, 200)
        rows = list_res.data if isinstance(list_res.data, list) else list_res.data.get("results", [])
        self.assertEqual(len(rows), 2)
        labels = {r["label"] for r in rows}
        self.assertIn("Near office", labels)
        self.assertIn("Apt + condo", labels)
