"""Deterministic trip-signal extraction from fetched emails.

No LLM. Keyword + regex only: connectors emit typed events; the policy engine
(not this module) authorizes any purchase. `extract_trip` returns the first
actionable trip found among the given emails, else the best non-actionable one,
else None.
"""

from __future__ import annotations

import re
from datetime import date, datetime

# Words that mark an email as a flight/travel booking.
FLIGHT_KEYWORDS = {
    "flight",
    "booking",
    "boarding",
    "itinerary",
    "pnr",
    "departure",
    "airlines",
    "e-ticket",
    "eticket",
}

# city (lowercase) -> (display country, ISO-3166 alpha-2)
CITY_COUNTRY: dict[str, tuple[str, str]] = {
    "singapore": ("Singapore", "SG"),
    "mumbai": ("India", "IN"),
    "delhi": ("India", "IN"),
    "bangalore": ("India", "IN"),
    "bengaluru": ("India", "IN"),
    "london": ("United Kingdom", "GB"),
    "dubai": ("United Arab Emirates", "AE"),
    "tokyo": ("Japan", "JP"),
    "bangkok": ("Thailand", "TH"),
    "new york": ("United States", "US"),
    "san francisco": ("United States", "US"),
    "paris": ("France", "FR"),
}

# Destinations we can actually buy an eSIM for in this demo (reuse Airalo SG path).
ESIM_SUPPORTED = {"SG"}

_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

# "29th November", "29 Nov", "November 29"
_DATE_DM = re.compile(
    r"\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\b", re.IGNORECASE
)
_DATE_MD = re.compile(r"\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?\b", re.IGNORECASE)
_DATE_ISO = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
_DATE_SLASH = re.compile(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b")

# "from Mumbai to Singapore"
_FROM_TO = re.compile(r"\bfrom\s+(.+?)\s+to\s+(.+?)[\s.,!?]", re.IGNORECASE)


def _resolve_year(month: int, day: int) -> int:
    """Pick the soonest future year for a month/day with no year given."""
    today = date.today()
    year = today.year
    try:
        if date(year, month, day) < today:
            year += 1
    except ValueError:
        pass
    return year


def _parse_date(text: str) -> tuple[str | None, str | None]:
    """Return (iso, raw) for the first parseable date, else (None, None)."""
    m = _DATE_ISO.search(text)
    if m:
        y, mo, d = (int(x) for x in m.groups())
        try:
            return datetime(y, mo, d).date().isoformat(), m.group(0)
        except ValueError:
            pass

    m = _DATE_DM.search(text)
    if m and m.group(2).lower() in _MONTHS:
        day = int(m.group(1))
        month = _MONTHS[m.group(2).lower()]
        try:
            return date(_resolve_year(month, day), month, day).isoformat(), m.group(0)
        except ValueError:
            pass

    m = _DATE_MD.search(text)
    if m and m.group(1).lower() in _MONTHS:
        month = _MONTHS[m.group(1).lower()]
        day = int(m.group(2))
        try:
            return date(_resolve_year(month, day), month, day).isoformat(), m.group(0)
        except ValueError:
            pass

    m = _DATE_SLASH.search(text)
    if m:
        day, month = int(m.group(1)), int(m.group(2))
        year = m.group(3)
        y = int(year) + (2000 if year and len(year) == 2 else 0) if year else _resolve_year(month, day)
        try:
            return date(y, month, day).isoformat(), m.group(0)
        except ValueError:
            pass

    return None, None


def _find_cities(text: str) -> list[str]:
    """City keys appearing in text, in order of first appearance."""
    lower = text.lower()
    hits: list[tuple[int, str]] = []
    for city in CITY_COUNTRY:
        idx = lower.find(city)
        if idx != -1:
            hits.append((idx, city))
    hits.sort()
    # de-dup while keeping order
    seen: set[str] = set()
    ordered: list[str] = []
    for _, city in hits:
        if city not in seen:
            seen.add(city)
            ordered.append(city)
    return ordered


def _origin_destination(text: str, cities: list[str]) -> tuple[str | None, str | None]:
    """Prefer an explicit 'from X to Y'; else first=origin, last=destination."""
    m = _FROM_TO.search(text + " ")
    if m:
        frm = _match_city(m.group(1))
        to = _match_city(m.group(2))
        if frm or to:
            return frm or (cities[0] if cities else None), to or (cities[-1] if cities else None)
    if len(cities) >= 2:
        return cities[0], cities[-1]
    if len(cities) == 1:
        return None, cities[0]
    return None, None


def _match_city(fragment: str) -> str | None:
    lower = fragment.lower()
    for city in CITY_COUNTRY:
        if city in lower:
            return city
    return None


def _matched_keywords(text: str) -> list[str]:
    lower = text.lower()
    return sorted(k for k in FLIGHT_KEYWORDS if k in lower)


def extract_trip(emails: list[dict]) -> dict | None:
    """Scan emails for a flight booking and return a trip dict (see models.Trip)."""
    best: dict | None = None
    for email in emails:
        text = f"{email.get('subject', '')}\n{email.get('body', '')}"
        kws = _matched_keywords(text)
        if not kws:
            continue
        cities = _find_cities(text)
        origin_key, dest_key = _origin_destination(text, cities)
        dest_country = CITY_COUNTRY.get(dest_key or "", (None, None))
        date_iso, date_raw = _parse_date(text)

        trip = {
            "origin": _titleize(origin_key),
            "destination": _titleize(dest_key),
            "destination_country_code": dest_country[1],
            "date_iso": date_iso,
            "date_raw": date_raw,
            "source_email_id": email.get("id"),
            "matched_keywords": kws,
            "actionable": bool(dest_country[1] and dest_country[1] in ESIM_SUPPORTED),
        }
        if trip["actionable"]:
            return trip
        if best is None:
            best = trip
    return best


def _titleize(city_key: str | None) -> str | None:
    return city_key.title() if city_key else None
