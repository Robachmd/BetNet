"""Resolve City FK + display name from POST (city_id preferred, city string fallback)."""

from __future__ import annotations

from typing import Optional, Tuple

from django.http import QueryDict

from .models import City


def resolve_city_from_post(post: QueryDict) -> Tuple[Optional[City], str]:
    """
    Returns (City instance or None, canonical city name string for Location.city).

    - If city_id is a valid PK, use that City.
    - Else if city matches a City name (case-insensitive), use it.
    - Else use raw city string (legacy / free text) with city_ref=None.
    """
    raw_id = (post.get("city_id") or "").strip()
    raw_name = (post.get("city") or "").strip()

    if raw_id.isdigit():
        c = City.objects.filter(pk=int(raw_id), is_active=True).first()
        if c:
            return c, c.name

    if raw_name:
        c = City.objects.filter(name__iexact=raw_name, is_active=True).first()
        if c:
            return c, c.name
        return None, raw_name

    return None, ""
