"""
Automated checks for listing packages + management command.
Run: python manage.py test payments.tests.test_listing_package_verification

Manual E2E (staging/production) when payment gateways are configured:
- Buy a listing package (Chapa/Telebirr), confirm `slots/summary/` shows `can_publish`.
- Create a property and publish: second publish with remaining credits should not start checkout.
- Use slots until one remains: expect LISTING_PACKAGE_LOW; at zero: LISTING_PACKAGE_DEPLETED.
- Set a location alert; publish another user's listing in that city: expect NEW_LISTING.
- With Celery beat + worker, LISTING_PACKAGE_EXPIRING fires for packages expiring within 7 days
  (or run `python manage.py warn_listing_package_expiry` once).
"""

from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User


class WarnListingPackageExpiryCommandTests(TestCase):
    def test_command_runs_without_error(self):
        out = StringIO()
        call_command("warn_listing_package_expiry", stdout=out)
        self.assertIn("Listing package expiry warnings sent", out.getvalue())


class ListingSlotsSummaryApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            phone_number="+251911111111",
            password="testpass123",
            email="owner@test.local",
            role=User.Role.LANDLORD,
            landlord_eligible=True,
        )

    def test_slots_summary_requires_auth(self):
        res = self.client.get("/api/payments/listing-packages/slots/summary/")
        self.assertEqual(res.status_code, 401)

    def test_slots_summary_shape(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/payments/listing-packages/slots/summary/")
        self.assertEqual(res.status_code, 200)
        for key in (
            "package_slots_remaining",
            "legacy_subscription_slots_remaining",
            "published_listings_count",
            "can_publish",
        ):
            self.assertIn(key, res.data, msg=f"missing {key}")

    def test_slots_summary_forbidden_for_non_landlord_user(self):
        self.client.force_authenticate(self.user)
        self.user.landlord_eligible = False
        self.user.role = User.Role.RENTER
        self.user.save(update_fields=["landlord_eligible", "role"])
        res = self.client.get("/api/payments/listing-packages/slots/summary/")
        self.assertEqual(res.status_code, 403)

    def test_purchase_forbidden_for_non_landlord_user(self):
        from payments.models import ListingPackage

        self.client.force_authenticate(self.user)
        self.user.landlord_eligible = False
        self.user.role = User.Role.RENTER
        self.user.save(update_fields=["landlord_eligible", "role"])
        package = ListingPackage.objects.create(
            code="TEST-PKG",
            name="Test Package",
            listing_quota=1,
            price="100.00",
            currency="ETB",
            validity_days=30,
            is_active=True,
        )
        res = self.client.post(
            f"/api/payments/listing-packages/{package.id}/purchase/",
            {"payment_method": "CHAPA"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)


class PropertyCreateGatingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.landlord = User.objects.create_user(
            phone_number="+251922222222",
            password="testpass123",
            email="landlord@test.local",
            role=User.Role.LANDLORD,
            landlord_eligible=True,
        )

    def test_create_property_requires_listing_capacity(self):
        self.client.force_authenticate(self.landlord)
        res = self.client.post("/api/properties/properties/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get("code"), "no_listing_slots")
