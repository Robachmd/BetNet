"""Price estimate API + normalization helpers."""

from decimal import Decimal

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from properties.price_ai import _normalize_parsed


class NormalizeParsedTests(TestCase):
    def test_clamps_sorted_mid(self):
        agg = {
            "listing_count": 25,
            "min_price": Decimal("10000"),
            "max_price": Decimal("20000"),
            "avg_price": Decimal("15000"),
        }
        parsed = {
            "suggested_low": 500,
            "suggested_mid": 400,
            "suggested_high": 300,
            "confidence_0_to_100": 80,
            "summary": "x",
            "factors": ["a"],
            "caveats": [],
        }
        out = _normalize_parsed(parsed, agg)
        low = Decimal(out["suggested_low"])
        mid = Decimal(out["suggested_mid"])
        high = Decimal(out["suggested_high"])
        self.assertLessEqual(low, mid)
        self.assertLessEqual(mid, high)
        self.assertGreater(high, Decimal("0"))

    def test_low_listing_count_caps_confidence(self):
        agg = {
            "listing_count": 2,
            "min_price": Decimal("8000"),
            "max_price": Decimal("12000"),
            "avg_price": Decimal("10000"),
        }
        parsed = {
            "suggested_low": 9000,
            "suggested_mid": 10000,
            "suggested_high": 11000,
            "confidence_0_to_100": 99,
            "summary": "x",
            "factors": [],
            "caveats": [],
        }
        out = _normalize_parsed(parsed, agg)
        self.assertLessEqual(out["confidence_0_to_100"], 55)


class PriceEstimateApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_requires_sub_city(self):
        res = self.client.post(
            "/api/properties/price-estimate/",
            {"city": "Addis Ababa"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    @override_settings(
        PRICE_AI_PROVIDER="",
        OPENAI_API_KEY="",
        GEMINI_API_KEY="",
    )
    def test_returns_aggregate_and_disclaimer_without_ai_keys(self):
        res = self.client.post(
            "/api/properties/price-estimate/",
            {
                "sub_city": "Nonexistent Suburb XYZ",
                "city": "Addis Ababa",
                "property_type": "APARTMENT",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("disclaimer", res.data)
        self.assertIn("aggregate", res.data)
        self.assertIn("listing_count", res.data["aggregate"])
        self.assertIsNone(res.data["ai"])
        self.assertEqual(res.data["cached"], False)
