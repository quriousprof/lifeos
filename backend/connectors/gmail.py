"""Gmail read-only connector: OAuth 2.0 auth-code flow + fetch latest emails.

Tokens persist server-side in SQLite (`oauth_tokens`). Only `{connected, email}`
ever leaves the backend. Scope is locked to gmail.readonly.
"""

from __future__ import annotations

import base64
import secrets
from email.utils import parseaddr
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

import db
from config import settings

PROVIDER = "gmail"


# ── OAuth client config ─────────────────────────────────────────────────────────
def _client_config() -> dict[str, Any]:
    return {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_oauth_redirect_uri],
        }
    }


def is_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def _new_flow(state: str | None = None) -> Flow:
    return Flow.from_client_config(
        _client_config(),
        scopes=settings.google_scopes,
        redirect_uri=settings.google_oauth_redirect_uri,
        state=state,
    )


def build_auth_url() -> str:
    """Return the Google consent URL; store CSRF state for callback verification."""
    state = secrets.token_urlsafe(24)
    db.set_oauth_state(PROVIDER, state)
    flow = _new_flow(state=state)
    auth_url, _ = flow.authorization_url(
        access_type="offline",      # request a refresh token
        include_granted_scopes="true",
        prompt="consent",           # force refresh-token issuance on re-consent
    )
    return auth_url


def exchange_code(code: str, state: str) -> dict[str, Any]:
    """Validate state, exchange code for tokens, persist, return {email}."""
    expected = db.get_oauth_state(PROVIDER)
    if not expected or not secrets.compare_digest(expected, state):
        raise PermissionError("oauth_state_mismatch")

    flow = _new_flow(state=state)
    flow.fetch_token(code=code)
    creds = flow.credentials
    email = _profile_email(creds)
    _persist(creds, email)
    return {"email": email}


def _persist(creds: Credentials, email: str | None) -> None:
    db.save_tokens(
        PROVIDER,
        {
            "email": email,
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "scopes": " ".join(creds.scopes or settings.google_scopes),
            "expiry": creds.expiry.isoformat() if creds.expiry else None,
        },
    )


def load_credentials() -> Credentials | None:
    """Load stored creds, refreshing (and re-persisting) if expired."""
    row = db.get_tokens(PROVIDER)
    if not row or not row.get("access_token"):
        return None
    creds = Credentials(
        token=row["access_token"],
        refresh_token=row.get("refresh_token"),
        token_uri=row.get("token_uri") or "https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=(row.get("scopes") or "").split() or settings.google_scopes,
    )
    if not creds.valid and creds.refresh_token:
        creds.refresh(Request())
        _persist(creds, row.get("email"))
    return creds


def _profile_email(creds: Credentials) -> str | None:
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    profile = service.users().getProfile(userId="me").execute()
    return profile.get("emailAddress")


def is_connected() -> bool:
    row = db.get_tokens(PROVIDER)
    return bool(row and row.get("access_token"))


def connected_email() -> str | None:
    row = db.get_tokens(PROVIDER)
    return row.get("email") if row else None


def disconnect() -> None:
    db.delete_tokens(PROVIDER)


# ── Fetch ───────────────────────────────────────────────────────────────────────
def _decode_part(data: str) -> str:
    return base64.urlsafe_b64decode(data.encode("utf-8")).decode("utf-8", errors="replace")


def _extract_body(payload: dict[str, Any]) -> str:
    """Walk the MIME tree; prefer text/plain, fall back to text/html stripped."""
    plain, html = _walk_parts(payload)
    if plain:
        return plain.strip()
    if html:
        return _strip_html(html).strip()
    return ""


def _walk_parts(part: dict[str, Any]) -> tuple[str, str]:
    mime = part.get("mimeType", "")
    body = part.get("body", {})
    data = body.get("data")
    plain = html = ""
    if data:
        decoded = _decode_part(data)
        if mime == "text/plain":
            plain = decoded
        elif mime == "text/html":
            html = decoded
    for sub in part.get("parts", []) or []:
        sp, sh = _walk_parts(sub)
        plain = plain or sp
        html = html or sh
    return plain, html


def _strip_html(html: str) -> str:
    import re

    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def _header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def fetch_latest(limit: int = 5) -> list[dict[str, Any]]:
    """Return the newest `limit` emails (id, sender, subject, date, snippet, body)."""
    creds = load_credentials()
    if creds is None:
        raise PermissionError("gmail_not_connected")
    limit = max(1, min(limit, 5))

    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    listing = (
        service.users()
        .messages()
        .list(userId="me", maxResults=limit, labelIds=["INBOX"])
        .execute()
    )
    out: list[dict[str, Any]] = []
    for ref in listing.get("messages", [])[:limit]:
        msg = (
            service.users()
            .messages()
            .get(userId="me", id=ref["id"], format="full")
            .execute()
        )
        payload = msg.get("payload", {})
        headers = payload.get("headers", [])
        sender = parseaddr(_header(headers, "From"))
        out.append(
            {
                "id": msg["id"],
                "sender": sender[1] or sender[0] or _header(headers, "From"),
                "subject": _header(headers, "Subject"),
                "date": _header(headers, "Date"),
                "snippet": msg.get("snippet", ""),
                "body": _extract_body(payload),
            }
        )
    return out
