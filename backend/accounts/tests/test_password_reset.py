from django.contrib.auth import authenticate
from rest_framework.test import APIClient

from accounts.models import User
from django.test import TestCase


class PasswordResetConfirmApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone_number="+251955511122",
            password="Oldpass123",
        )
        self.client = APIClient()

    def test_confirm_resets_password_and_returns_tokens(self):
        otp = self.user.generate_otp()
        res = self.client.post(
            "/api/accounts/password-reset/confirm/",
            {
                "phone_number": "+251955511122",
                "otp": otp,
                "new_password": "Newpass456",
                "new_password_confirm": "Newpass456",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("tokens", res.data)
        self.assertIn("access", res.data["tokens"])
        self.assertIn("user", res.data)

        self.user.refresh_from_db()
        self.assertEqual(self.user.otp, "")
        self.assertIsNone(self.user.otp_created_at)

        u = authenticate(phone_number="+251955511122", password="Newpass456")
        self.assertIsNotNone(u)
        fail = authenticate(phone_number="+251955511122", password="Oldpass123")
        self.assertIsNone(fail)

    def test_confirm_wrong_otp_returns_400(self):
        self.user.generate_otp()
        res = self.client.post(
            "/api/accounts/password-reset/confirm/",
            {
                "phone_number": "+251955511122",
                "otp": "000000",
                "new_password": "Newpass456",
                "new_password_confirm": "Newpass456",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_password_reset_request_alias_matches_otp_request(self):
        res = self.client.post(
            "/api/accounts/password-reset/request/",
            {"phone_number": "+251955511122"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
