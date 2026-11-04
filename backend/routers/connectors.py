"""Gmail read-only connector endpoints: OAuth + fetch + trip extraction.

Connectors only read and extract typed events. They never buy — the existing
commerce loop (propose → policy → execute) authorizes and executes any purchase.
"""

from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse

import audit
import db
from config import settings
from connectors import gmail, trip
from models import GmailAuthUrl, GmailFetchResult, GmailStatus

router = APIRouter(prefix="/connectors/gmail", tags=["connectors"])


def _require_configured() -> None:
    if not gmail.is_configured():
        raise HTTPException(
            status_code=503,
            detail="google_oauth_not_configured: set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in backend/.env",
        )


@router.get("/auth", response_model=GmailAuthUrl)
async def auth(mode: str | None = Query(None)):
    """Build the Google consent URL. mode=redirect bounces the browser straight to Google."""
    _require_configured()
    url = gmail.build_auth_url()
    if mode == "redirect":
        return RedirectResponse(url)
    return GmailAuthUrl(auth_url=url)


@router.get("/callback")
async def callback(request: Request):
    """OAuth redirect target. Posts the result to the opener window, then closes."""
    _require_configured()
    params = request.query_params
    error = params.get("error")
    code = params.get("code")
    state = params.get("state")

    if error or not code or not state:
        return _callback_response(ok=False, email=None, error=error or "missing_code")

    try:
        result = gmail.exchange_code(code, state)
    except PermissionError as exc:
        return _callback_response(ok=False, email=None, error=str(exc))
    except Exception as exc:  # noqa: BLE001 — surface any Google error to the popup
        return _callback_response(ok=False, email=None, error=str(exc))

    audit.record(
        action="connect_source",
        reason=f"Gmail connected (read-only) for {result.get('email')}",
        result="success",
        actor="user",
        fulfillment_status="gmail",
    )
    return _callback_response(ok=True, email=result.get("email"), error=None)


def _callback_response(ok: bool, email: str | None, error: str | None):
    """postMessage to the opener (popup flow); fall back to a redirect (same-tab flow)."""
    payload_js = {
        "type": "gmail-oauth",
        "ok": ok,
        "email": email,
        "error": error,
    }
    import json

    data = json.dumps(payload_js)
    redirect = settings.google_post_auth_redirect
    sep = "&" if "?" in redirect else "?"
    fallback = f"{redirect}{sep}" + urlencode(
        {"gmail": "connected" if ok else "error", **({"email": email} if email else {})}
    )
    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Gmail connected</title></head>
<body style="font-family:system-ui;background:#0A0B0D;color:#E8E6DF;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center">
  <p style="font-size:14px">{'Gmail connected — you can close this window.' if ok else 'Connection failed.'}</p>
</div>
<script>
  try {{
    if (window.opener) {{
      window.opener.postMessage({data}, "*");
      window.close();
    }} else {{
      window.location.replace({json.dumps(fallback)});
    }}
  }} catch (e) {{
    window.location.replace({json.dumps(fallback)});
  }}
</script>
</body></html>"""
    return HTMLResponse(html)


@router.get("/status", response_model=GmailStatus)
async def status():
    return GmailStatus(
        connected=gmail.is_connected(),
        email=gmail.connected_email(),
        scopes=["gmail.readonly"] if gmail.is_connected() else [],
    )


@router.post("/fetch", response_model=GmailFetchResult)
async def fetch(limit: int = Query(5, ge=1, le=5), poll: bool = Query(False)):
    _require_configured()
    try:
        emails = gmail.fetch_latest(limit)
    except PermissionError:
        raise HTTPException(status_code=409, detail="gmail_not_connected")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"gmail_fetch_failed: {exc}")

    trip_dict = trip.extract_trip(emails)
    # Background polling (every few seconds) must not spam the ledger; only record
    # a routine fetch for explicit user-initiated calls.
    if not poll:
        audit.record(
            action="gmail_fetch",
            reason=f"Fetched {len(emails)} emails; trip={'yes' if trip_dict else 'no'}",
            result="success",
            actor="user",
            fulfillment_status="gmail",
        )
    # Fire the trigger (and audit it) exactly once per source email — otherwise a
    # 5s poller would re-detect the same booking forever and loop the ledger.
    src_id = trip_dict.get("source_email_id") if trip_dict else None
    if trip_dict and src_id and not db.is_email_processed(src_id):
        db.mark_email_processed(src_id)
        audit.record(
            action="trigger_detected",
            reason=(
                f"Trip {trip_dict.get('origin')} → {trip_dict.get('destination')} "
                f"on {trip_dict.get('date_raw')} · keywords: "
                f"{', '.join(trip_dict.get('matched_keywords', []))}"
            ),
            result="success" if trip_dict.get("actionable") else "blocked",
            actor="system::life-os-agent",
            fulfillment_status="esim" if trip_dict.get("actionable") else "unsupported",
        )
    return GmailFetchResult(emails=emails, trip=trip_dict)


@router.post("/disconnect", response_model=GmailStatus)
async def disconnect():
    gmail.disconnect()
    audit.record(
        action="revoke_source",
        reason="Gmail connection revoked by user",
        result="success",
        actor="user",
        fulfillment_status="gmail",
    )
    return GmailStatus(connected=False, email=None, scopes=[])
