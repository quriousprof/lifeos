"""Append-only audit ledger — a human-readable record for every agent action."""

import uuid
from datetime import datetime, timezone

import db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def record(
    action: str,
    reason: str,
    result: str,
    actor: str = "system::life-os-agent",
    intent_id: str | None = None,
    amount_usd: float | None = None,
    payment_ref: str | None = None,
    fulfillment_status: str | None = None,
) -> dict:
    event = {
        "id": str(uuid.uuid4()),
        "actor": actor,
        "action": action,
        "reason": reason,
        "intent_id": intent_id,
        "amount_usd": amount_usd,
        "payment_ref": payment_ref,
        "fulfillment_status": fulfillment_status,
        "result": result,
        "timestamp": _now(),
    }
    db.execute(
        """
        INSERT INTO audit (id, actor, action, reason, intent_id, amount_usd,
                           payment_ref, fulfillment_status, result, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event["id"],
            event["actor"],
            event["action"],
            event["reason"],
            event["intent_id"],
            event["amount_usd"],
            event["payment_ref"],
            event["fulfillment_status"],
            event["result"],
            event["timestamp"],
        ),
    )
    return event


def list_events(limit: int = 100) -> list[dict]:
    return db.query_all("SELECT * FROM audit ORDER BY timestamp DESC LIMIT ?", (limit,))
