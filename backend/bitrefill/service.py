"""Agentic commerce orchestration over Bitrefill.

propose -> policy -> (re-quote) -> create invoice -> reconcile -> redemption -> audit.
Idempotent per intent; polling reconciliation (no webhook/tunnel required).
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any

import audit
import db
import policy as policy_mod
from config import settings
from .client import (
    TERMINAL_ORDER_STATUSES,
    BitrefillClient,
    BitrefillError,
)

client = BitrefillClient()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Product normalisation ──────────────────────────────────────────────────────
def normalise_product(raw: dict[str, Any]) -> dict[str, Any]:
    packages = [
        {
            "id": p.get("id"),
            "value": str(p.get("value")),
            "amount_usd": p.get("amount"),
            "price_sats": p.get("price"),
        }
        for p in raw.get("packages", [])
    ]
    return {
        "id": raw.get("id"),
        "name": raw.get("name"),
        "country_code": raw.get("country_code"),
        "currency": raw.get("currency"),
        "categories": raw.get("categories", []),
        "in_stock": raw.get("in_stock", True),
        "image": raw.get("image"),
        "packages": packages,
        "price_range": raw.get("range"),
    }


async def search(query: str, country: str | None, limit: int, include_test: bool) -> list[dict]:
    raw = await client.search_products(query, country, limit, include_test)
    return [normalise_product(p) for p in raw]


async def product(product_id: str) -> dict:
    return normalise_product(await client.get_product(product_id))


# ── Intent persistence ─────────────────────────────────────────────────────────
def _intent_row_to_view(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "product_id": row["product_id"],
        "package_id": row["package_id"],
        "value": row["value"],
        "quantity": row["quantity"],
        "merchant": row["merchant"],
        "category": row["category"],
        "amount_usd": row["amount_usd"],
        "trigger": row["trigger"],
        "policy_result": row["policy_result"],
        "policy_reason": row["policy_reason"],
        "status": row["status"],
        "invoice_id": row["invoice_id"],
        "created_at": row["created_at"],
    }


def get_intent(intent_id: str) -> dict[str, Any] | None:
    row = db.query_one("SELECT * FROM intents WHERE id = ?", (intent_id,))
    return _intent_row_to_view(row) if row else None


def propose(req: dict[str, Any]) -> dict[str, Any]:
    """Create an intent and run the deterministic policy. No purchase yet."""
    idem = req.get("idempotency_key") or str(uuid.uuid4())
    existing = db.query_one("SELECT * FROM intents WHERE idempotency_key = ?", (idem,))
    if existing:
        return _intent_row_to_view(existing)

    pol = db.get_policy()
    result, reason = policy_mod.evaluate(
        req["amount_usd"], req["merchant"], req["category"], pol
    )
    intent_id = str(uuid.uuid4())
    status = "proposed" if result == "allowed" else "blocked"
    value = None if req.get("value") is None else str(req["value"])

    db.execute(
        """
        INSERT INTO intents (id, idempotency_key, product_id, package_id, value, quantity,
                             merchant, category, amount_usd, trigger, reason,
                             policy_result, policy_reason, status, invoice_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            intent_id, idem, req["product_id"], req.get("package_id"), value, req.get("quantity", 1),
            req["merchant"], req["category"], req["amount_usd"], req.get("trigger"), req.get("intent"),
            result, reason, status, None, _now(),
        ),
    )
    audit.record(
        action="intent_proposed",
        reason=reason,
        result="success" if result == "allowed" else "blocked",
        intent_id=intent_id,
        amount_usd=req["amount_usd"],
        fulfillment_status=status,
    )
    return get_intent(intent_id)


# ── Invoice persistence ────────────────────────────────────────────────────────
def _save_invoice(invoice: dict[str, Any], intent_id: str | None) -> None:
    db.execute(
        """
        INSERT INTO invoices (id, intent_id, status, payment_status, raw, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            status=excluded.status,
            payment_status=excluded.payment_status,
            raw=excluded.raw,
            updated_at=excluded.updated_at
        """,
        (
            invoice.get("id"),
            intent_id,
            invoice.get("status"),
            (invoice.get("payment") or {}).get("status"),
            json.dumps(invoice),
            _now(),
        ),
    )


def _invoice_view(invoice: dict[str, Any]) -> dict[str, Any]:
    orders = []
    for o in invoice.get("orders", []):
        prod = o.get("product", {})
        orders.append(
            {
                "id": o.get("id"),
                "status": o.get("status"),
                "product_name": prod.get("name"),
                "value": str(prod.get("value")) if prod.get("value") is not None else None,
                "redemption_info": o.get("redemption_info"),
            }
        )
    return {
        "id": invoice.get("id"),
        "status": invoice.get("status"),
        "payment_status": (invoice.get("payment") or {}).get("status"),
        "orders": orders,
    }


def _orders_terminal(invoice: dict[str, Any]) -> bool:
    orders = invoice.get("orders", [])
    if not orders:
        return False
    return all(o.get("status") in TERMINAL_ORDER_STATUSES for o in orders)


async def _reconcile(invoice_id: str, intent_id: str | None, attempts: int = 24, delay: float = 2.5) -> dict[str, Any]:
    """Poll the invoice until every order reaches a terminal state."""
    invoice = await client.get_invoice(invoice_id)
    for _ in range(attempts):
        _save_invoice(invoice, intent_id)
        if _orders_terminal(invoice):
            break
        await asyncio.sleep(delay)
        invoice = await client.get_invoice(invoice_id)
    _save_invoice(invoice, intent_id)
    return invoice


async def execute(intent_id: str) -> dict[str, Any]:
    """Re-quote, create+pay the invoice, reconcile, and audit. Idempotent."""
    intent = get_intent(intent_id)
    if intent is None:
        raise ValueError("intent not found")
    if intent["policy_result"] != "allowed":
        raise PermissionError(intent["policy_reason"] or "blocked by policy")

    # Idempotent: if already executed, just re-reconcile the existing invoice.
    if intent["invoice_id"]:
        invoice = await _reconcile(intent["invoice_id"], intent_id)
        return {"intent": get_intent(intent_id), "invoice": _invoice_view(invoice)}

    # Re-check kill switch / policy immediately before spending.
    pol = db.get_policy()
    result, reason = policy_mod.evaluate(
        intent["amount_usd"], intent["merchant"], intent["category"], pol
    )
    if result != "allowed":
        db.execute("UPDATE intents SET status = ?, policy_result = ?, policy_reason = ? WHERE id = ?",
                   ("blocked", "blocked", reason, intent_id))
        audit.record("execute_blocked", reason, "blocked", intent_id=intent_id, amount_usd=intent["amount_usd"])
        return {"intent": get_intent(intent_id), "invoice": None}

    product_line: dict[str, Any] = {"product_id": intent["product_id"], "quantity": intent["quantity"]}
    if intent["package_id"]:
        product_line["package_id"] = intent["package_id"]
    elif intent["value"] is not None:
        product_line["value"] = intent["value"]

    webhook = settings.public_webhook_url or None
    try:
        invoice = await client.create_invoice([product_line], "balance", True, webhook)
    except BitrefillError as exc:
        db.execute("UPDATE intents SET status = ? WHERE id = ?", ("failed", intent_id))
        audit.record("execute_failed", str(exc), "blocked", intent_id=intent_id, amount_usd=intent["amount_usd"])
        raise

    invoice_id = invoice.get("id")
    db.execute("UPDATE intents SET status = ?, invoice_id = ? WHERE id = ?",
               ("authorized", invoice_id, intent_id))
    _save_invoice(invoice, intent_id)
    audit.record(
        action="order_created",
        reason=f'invoice {invoice_id} created for {intent["product_id"]}',
        result="success",
        intent_id=intent_id,
        amount_usd=intent["amount_usd"],
        payment_ref=invoice_id,
        fulfillment_status=invoice.get("status"),
    )

    invoice = await _reconcile(invoice_id, intent_id)
    view = _invoice_view(invoice)
    delivered = [o for o in view["orders"] if o["status"] == "delivered"]
    final_status = "executed" if delivered else "failed"
    db.execute("UPDATE intents SET status = ? WHERE id = ?", (final_status, intent_id))

    if delivered:
        # Count the spend against the monthly budget.
        pol = db.get_policy()
        pol["monthly_spent"] = round(float(pol["monthly_spent"]) + float(intent["amount_usd"]), 2)
        db.save_policy(pol)
    audit.record(
        action="order_fulfilled" if delivered else "order_failed",
        reason=f'{len(delivered)}/{len(view["orders"])} orders delivered',
        result="success" if delivered else "blocked",
        intent_id=intent_id,
        amount_usd=intent["amount_usd"],
        payment_ref=invoice_id,
        fulfillment_status=view["status"],
    )
    return {"intent": get_intent(intent_id), "invoice": view}


async def intent_status(intent_id: str) -> dict[str, Any]:
    intent = get_intent(intent_id)
    if intent is None:
        raise ValueError("intent not found")
    invoice_view = None
    if intent["invoice_id"]:
        row = db.query_one("SELECT raw FROM invoices WHERE id = ?", (intent["invoice_id"],))
        if row:
            invoice_view = _invoice_view(json.loads(row["raw"]))
    return {"intent": intent, "invoice": invoice_view}
