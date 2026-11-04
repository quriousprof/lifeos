"""Bitrefill webhook — optional (we default to polling). Idempotent by invoice id.

Set PUBLIC_WEBHOOK_URL in .env (behind a tunnel) to use push instead of polling.
"""

import json

from fastapi import APIRouter, Request

import audit
import db
from bitrefill import service

router = APIRouter(tags=["webhooks"])


@router.post("/webhooks/bitrefill")
async def bitrefill_webhook(request: Request):
    invoice = await request.json()
    invoice_id = invoice.get("id")
    if not invoice_id:
        return {"ok": True}

    # Idempotent: skip if we already recorded this invoice as terminal.
    row = db.query_one("SELECT raw FROM invoices WHERE id = ?", (invoice_id,))
    already = False
    if row:
        prev = json.loads(row["raw"])
        already = service._orders_terminal(prev)

    intent_row = db.query_one("SELECT id FROM intents WHERE invoice_id = ?", (invoice_id,))
    intent_id = intent_row["id"] if intent_row else None
    service._save_invoice(invoice, intent_id)

    if not already and service._orders_terminal(invoice):
        view = service._invoice_view(invoice)
        delivered = [o for o in view["orders"] if o["status"] == "delivered"]
        audit.record(
            action="order_fulfilled" if delivered else "order_failed",
            reason=f'webhook: {len(delivered)}/{len(view["orders"])} orders delivered',
            result="success" if delivered else "blocked",
            intent_id=intent_id,
            payment_ref=invoice_id,
            fulfillment_status=view["status"],
        )
        if intent_id:
            db.execute(
                "UPDATE intents SET status = ? WHERE id = ?",
                ("executed" if delivered else "failed", intent_id),
            )
    return {"ok": True}
