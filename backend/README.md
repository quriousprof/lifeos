# Life OS Backend

FastAPI backend for Life OS. Real **Bitrefill** agentic-commerce rails (live REST API v2).
Connectors (Gmail/Calendar/OAuth) stay mocked in the frontend; this service is the live
commerce layer, with a deterministic autonomy policy enforced in code. Zcash shielded-payment
leg is planned (plan 03, phase B).

## Setup

```bash
cd backend
cp .env.example .env     # then set BITREFILL_API_KEY (bitrefill.com/account/developers)
uv sync
uv run main.py           # starts uvicorn on :8000 (RELOAD=1 for autoreload)
```

`.env` is gitignored. The API key can spend on the account — never commit it or expose it to the frontend.

## The agentic loop

`propose → policy → (re-quote) → create invoice → reconcile → redemption → audit`

- The agent **proposes**; `policy.py` **decides** (per-tx cap, monthly budget, merchant/category
  allowlist, kill switch) — spend caps live in code, never in a prompt.
- Only an **allowed** intent can execute. One idempotency key per intent → no duplicate orders.
- Reconciliation is **polling** by default (no tunnel). Set `PUBLIC_WEBHOOK_URL` to use the
  idempotent webhook instead. **Paid ≠ delivered** — we poll each order to a terminal state.
- Development uses Bitrefill **test products** (`test-gift-card-code`, etc.) — free, real API,
  real redemption codes. Swap `product_id` to a real product (with account balance) for a live buy.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | self + Bitrefill ping + balance |
| GET | `/products/search?q=&country=&limit=&include_test=` | live catalog search |
| GET | `/products/{id}` | denominations (packages/range) |
| POST | `/intents` | propose → runs policy, returns allowed/blocked |
| POST | `/intents/{id}/execute` | re-quote → create+pay invoice → reconcile → redemption |
| GET | `/intents/{id}` | intent + invoice + order + redemption status |
| GET | `/orders/{id}` | redemption info |
| GET/PUT | `/policy` | read/update autonomy policy |
| POST | `/kill-switch` | toggle global pause |
| GET | `/audit?limit=` | append-only audit ledger |

## Notes on the live API (verified 2026-11-04)

The live v2 API differs from the public docs in places (encoded in `bitrefill/client.py`):
product packages use `id` (not `package_id`), `value` is a string, `amount` is USD face value,
`price` is cost in the invoice currency base unit; terminal invoice status is `all_delivered`
(not `complete`); reconciliation keys on **order** status (`delivered`/`failed`/`refunded`).

## Layout

```
backend/
├── main.py           entrypoint — `uv run main.py`
├── app.py            FastAPI app, CORS, /health, lifespan
├── config.py         settings (.env)
├── db.py             SQLite: policy, intents, invoices, audit
├── models.py         pydantic request/response models
├── policy.py         deterministic autonomy engine
├── audit.py          append-only ledger
├── bitrefill/        client.py (REST v2) + service.py (orchestration)
└── routers/          commerce.py, policy.py, webhooks.py
```
