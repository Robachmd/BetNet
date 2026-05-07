"""LLM-backed rent/sale estimates anchored to aggregated listing stats.

Uses OpenAI or Gemini HTTP APIs (no extra Python deps). Keys stay server-side only.
"""

from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from decimal import Decimal
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_PRICE_ESTIMATE_DISCLAIMER = (
    "Estimate only — not a professional appraisal. "
    "BetNet does not guarantee accuracy; use alongside your own research."
)

_SCHEMA_INSTRUCTION = """
Return a single JSON object with these keys only (numbers in ETB):
{
  "suggested_low": <number>,
  "suggested_mid": <number>,
  "suggested_high": <number>,
  "confidence_0_to_100": <integer 0-100>,
  "summary": "<one short paragraph>",
  "factors": ["<short bullet>", ...],
  "caveats": ["<short caveat>", ...]
}
Rules:
- suggested_low <= suggested_mid <= suggested_high; all > 0.
- Ground your band in the market_stats provided; if listing_count is small, widen the band and lower confidence.
- If listing_count is 0, infer cautiously from Ethiopia context and use confidence <= 35.
- factors: concrete drivers (location tier, beds, furnishing, amenities, listing_type rent vs sale).
- caveats: data limits, sample size, or uncertainty.
"""


def estimate_disclaimer() -> str:
    return _PRICE_ESTIMATE_DISCLAIMER


def _prompt_for_estimate(
    aggregate: dict[str, Any],
    features: dict[str, Any],
) -> str:
    market = json.dumps(
        {
            "city": str(aggregate.get("city", "")),
            "sub_city": str(aggregate.get("sub_city", "")),
            "property_type": aggregate.get("property_type"),
            "listing_type": aggregate.get("listing_type"),
            "min_price_etb": str(aggregate.get("min_price", "0")),
            "avg_price_etb": str(aggregate.get("avg_price", "0")),
            "max_price_etb": str(aggregate.get("max_price", "0")),
            "listing_count": aggregate.get("listing_count", 0),
        },
        indent=2,
    )
    feat = json.dumps(features, indent=2, default=str)
    return f"""You help price residential and commercial listings in Ethiopia (ETB).

market_stats (from BetNet listings in the area, same filters as applicable):
{market}

subject_property (user-described unit / intent):
{feat}

{_SCHEMA_INSTRUCTION}
"""


def _parse_raw_json(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)


def _decimal(x: Any) -> Decimal:
    return Decimal(str(x))


def _clamp_band(
    low: Decimal,
    mid: Decimal,
    high: Decimal,
    agg_min: Decimal,
    agg_max: Decimal,
    listing_count: int,
) -> tuple[Decimal, Decimal, Decimal]:
    """Keep model output sane relative to observed min/max."""
    if low > high:
        low, high = high, low
    if mid < low:
        mid = low
    if mid > high:
        mid = high

    if listing_count <= 0 or agg_max <= 0:
        return max(low, Decimal("1")), max(mid, Decimal("1")), max(high, Decimal("1"))

    if listing_count < 5:
        expand = Decimal("0.45")
    elif listing_count < 15:
        expand = Decimal("0.28")
    elif listing_count < 40:
        expand = Decimal("0.18")
    else:
        expand = Decimal("0.12")

    floor_b = max(Decimal("1"), agg_min * (Decimal("1") - expand))
    ceil_b = max(floor_b + Decimal("1"), agg_max * (Decimal("1") + expand))

    def c(x: Decimal) -> Decimal:
        return max(floor_b, min(ceil_b, x))

    return c(low), c(mid), c(high)


def _normalize_parsed(
    parsed: dict[str, Any],
    aggregate: dict[str, Any],
) -> dict[str, Any]:
    lc = int(aggregate.get("listing_count") or 0)
    agg_min = _decimal(aggregate.get("min_price") or 0)
    agg_max = _decimal(aggregate.get("max_price") or 0)
    avg = _decimal(aggregate.get("avg_price") or 0)

    low = _decimal(parsed.get("suggested_low"))
    mid = _decimal(parsed.get("suggested_mid"))
    high = _decimal(parsed.get("suggested_high"))
    if avg > 0 and lc > 0 and (low <= 0 or mid <= 0 or high <= 0):
        low = avg * Decimal("0.85")
        mid = avg
        high = avg * Decimal("1.15")

    low, mid, high = _clamp_band(low, mid, high, agg_min, agg_max, lc)

    conf = int(parsed.get("confidence_0_to_100") or 0)
    conf = max(0, min(100, conf))
    if lc == 0:
        conf = min(conf, 35)
    elif lc < 5:
        conf = min(conf, 55)

    factors = parsed.get("factors")
    if not isinstance(factors, list):
        factors = []
    caveats = parsed.get("caveats")
    if not isinstance(caveats, list):
        caveats = []
    if lc < 8:
        caveats = list(caveats) + [f"Only {lc} comparable listings in this filter; range is less certain."]

    return {
        "suggested_low": str(low.quantize(Decimal("0.01"))),
        "suggested_mid": str(mid.quantize(Decimal("0.01"))),
        "suggested_high": str(high.quantize(Decimal("0.01"))),
        "confidence_0_to_100": conf,
        "summary": str(parsed.get("summary") or "").strip()[:1200],
        "factors": [str(x)[:300] for x in factors][:12],
        "caveats": [str(x)[:300] for x in caveats][:12],
    }


def _openai_completion(prompt: str) -> str:
    key = settings.OPENAI_API_KEY
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    model = settings.PRICE_AI_MODEL or "gpt-4o-mini"
    body = {
        "model": model,
        "temperature": 0.25,
        "max_tokens": 1200,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You output only valid JSON for property pricing assists in Ethiopia.",
            },
            {"role": "user", "content": prompt},
        ],
    }
    res = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=22,
    )
    res.raise_for_status()
    data = res.json()
    return data["choices"][0]["message"]["content"]


def _gemini_completion(prompt: str) -> str:
    key = settings.GEMINI_API_KEY
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    model = (settings.PRICE_AI_MODEL or "gemini-1.5-flash").strip()
    model = model.removeprefix("models/")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.25,
            "maxOutputTokens": 1200,
            "responseMimeType": "application/json",
        },
    }
    res = requests.post(url, params={"key": key}, json=body, timeout=22)
    res.raise_for_status()
    data = res.json()
    parts = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    if not parts:
        raise RuntimeError("Gemini returned no candidates")
    return parts[0].get("text") or "{}"


_cache_lock = threading.Lock()
_estimate_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_CACHE_MAX = 192


def _cache_key(payload: dict[str, Any], aggregate: dict[str, Any]) -> str:
    h = hashlib.sha256()
    blob = json.dumps({"p": payload, "a": aggregate}, sort_keys=True, default=str)
    h.update(blob.encode("utf-8"))
    return h.hexdigest()


def get_cached_estimate(cache_key: str) -> dict[str, Any] | None:
    ttl = getattr(settings, "PRICE_ESTIMATE_CACHE_TTL", 300) or 300
    now = time.time()
    with _cache_lock:
        row = _estimate_cache.get(cache_key)
        if not row:
            return None
        ts, payload = row
        if now - ts > ttl:
            del _estimate_cache[cache_key]
            return None
        return payload


def set_cached_estimate(cache_key: str, value: dict[str, Any]) -> None:
    with _cache_lock:
        if len(_estimate_cache) >= _CACHE_MAX:
            oldest = sorted(_estimate_cache.items(), key=lambda kv: kv[1][0])[:48]
            for k, _ in oldest:
                del _estimate_cache[k]
        _estimate_cache[cache_key] = (time.time(), value)


def compute_price_estimate(
    aggregate: dict[str, Any],
    features: dict[str, Any],
) -> tuple[dict[str, Any] | None, str]:
    """Return (ai_payload or None if disabled/failed, error_note)."""

    provider = getattr(settings, "PRICE_AI_PROVIDER", "") or ""
    if provider not in ("openai", "gemini"):
        return None, "ai_disabled"

    prompt = _prompt_for_estimate(aggregate, features)
    try:
        if provider == "openai":
            raw_txt = _openai_completion(prompt)
            model_name = settings.PRICE_AI_MODEL or "gpt-4o-mini"
            vendor = "openai"
        else:
            raw_txt = _gemini_completion(prompt)
            model_name = settings.PRICE_AI_MODEL or "gemini-1.5-flash"
            vendor = "gemini"
        parsed = _parse_raw_json(raw_txt)
        normalized = _normalize_parsed(parsed, aggregate)
        normalized["provider"] = vendor
        normalized["model"] = model_name
        return normalized, ""
    except Exception as exc:
        logger.warning("price AI estimate failed: %s", exc, exc_info=True)
        return None, str(exc)


def build_estimate_response_bundle(
    aggregate: dict[str, Any],
    features: dict[str, Any],
) -> dict[str, Any]:
    """Full API shape: disclaimer, aggregate, ai, cached flag."""
    ck = _cache_key(features, aggregate)
    hit = get_cached_estimate(ck)
    if hit is not None:
        out = dict(hit)
        out["cached"] = True
        return out

    ai_payload, err = compute_price_estimate(aggregate, features)
    body = {
        "disclaimer": estimate_disclaimer(),
        "aggregate": aggregate,
        "ai": ai_payload,
        "ai_error": err or None,
        "cached": False,
    }
    if ai_payload is not None:
        set_cached_estimate(ck, body)
    return body
