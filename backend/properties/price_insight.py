"""Aggregated listing prices for a neighborhood (used by price-insights API and AI estimate)."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Avg, Count, Max, Min

from .models import Property


def get_price_insight_aggregate(
    *,
    city: str,
    sub_city: str,
    property_type: str | None = None,
    listing_type: str | None = None,
) -> dict:
    """
    Return min/avg/max monthly (or sale) price and count for available listings
    in the given city + sub_city, optionally filtered by property and listing type.
    """
    qs = Property.objects.filter(
        location__sub_city__iexact=sub_city.strip(),
        location__city__iexact=city.strip(),
        is_available=True,
    )
    if property_type:
        qs = qs.filter(property_type=property_type)
    if listing_type:
        qs = qs.filter(listing_type=listing_type)

    stats = qs.aggregate(
        avg_price=Avg("price_monthly"),
        min_price=Min("price_monthly"),
        max_price=Max("price_monthly"),
        listing_count=Count("id"),
    )

    out: dict = {
        "sub_city": sub_city.strip(),
        "city": city.strip(),
        "avg_price": stats["avg_price"] or Decimal("0.00"),
        "min_price": stats["min_price"] or Decimal("0.00"),
        "max_price": stats["max_price"] or Decimal("0.00"),
        "listing_count": int(stats["listing_count"] or 0),
    }
    if property_type:
        out["property_type"] = property_type
    if listing_type:
        out["listing_type"] = listing_type
    return out
