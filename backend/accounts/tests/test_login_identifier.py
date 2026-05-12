from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User


class IdentifierLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            phone_number="+251955511122",
            email="user@example.com",
            password="Passw0rd123",
            first_name="Test",
            last_name="User",
        )

    def test_login_with_phone_identifier(self):
        res = self.client.post(
            "/api/accounts/login/",
            {"identifier": "0955511122", "password": "Passw0rd123"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("tokens", res.data)
        self.assertIn("access", res.data["tokens"])
        self.assertIn("refresh", res.data["tokens"])

    def test_login_with_email_identifier(self):
        res = self.client.post(
            "/api/accounts/login/",
            {"identifier": "user@example.com", "password": "Passw0rd123"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("tokens", res.data)

    def test_register_requires_email(self):
        res = self.client.post(
            "/api/accounts/register/",
            {
                "phone_number": "+251911234567",
                "password": "Passw0rd123",
                "password_confirm": "Passw0rd123",
                "first_name": "A",
                "last_name": "B",
                "role": "RENTER",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.data)

