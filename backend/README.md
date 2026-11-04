# Life OS Backend

FastAPI backend for Life OS. Real **Bitrefill** agentic-commerce rails (live REST API v2).
**Gmail** is a live read-only connector (real Google OAuth, `gmail.readonly`). Other connectors
(Calendar) stay mocked in the frontend. Zcash shielded-payment leg is planned (plan 03, phase B).

## Setup

```bash
cd backend
cp .env.example .env     # then set BITREFILL_API_KEY (bitrefill.com/account/developers)
uv sync
uv run main.py           # starts uvicorn on :8000 (RELOAD=1 for autoreload)
```

`.env` is gitignored. The API key can spend on the account — never commit it or expose it to the frontend.


## Gmail connector (Google OAuth, read-only)

One-time Google Cloud setup:

1. https://console.cloud.google.com → create/select a project.
2. **APIs & Services → Library → Gmail API → Enable**.
3. **OAuth consent screen**: User type **External**; add your Google account under
   **Test users** (keeps the app in "Testing" — no verification needed). Add scope
   `.../auth/gmail.readonly`.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   Authorized redirect URI: `http://localhost:8000/connectors/gmail/callback`.
5. Copy the **Client ID** + **Client secret** into `backend/.env`
   (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

Scope is locked to `gmail.readonly` (no send/modify). Tokens persist server-side in
SQLite (`oauth_tokens`); only `{connected, email}` is ever returned to the frontend.
`/connectors/gmail/fetch` reads the 5 newest inbox emails and runs a deterministic
keyword/regex trip extractor (`connectors/trip.py`) — no LLM, and it never buys. A
detected Singapore trip hands a prompt to the existing commerce pipeline, which the
autonomy policy still gates.

## Deploy

Both entrypoints work from `backend/`:

```bash
uv run main.py                    # binds 0.0.0.0:$PORT (default 8000); HOST/RELOAD env
fastapi run --port "$PORT"        # same app; entrypoint pinned in pyproject.toml
```

`fastapi run` requires the `fastapi[standard]` extras (installed via `uv sync`). Set
`CORS_ORIGINS` to the deployed frontend origin, and keep `DATABASE_URL` on a persistent
volume — the default SQLite file is wiped when an ephemeral container is replaced.

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
| GET | `/` | service banner (cloud readiness) |
| GET | `/health` | liveness only — instant, no external I/O |
| GET | `/health/deep` | self + Bitrefill ping + balance |
| GET | `/products/search?q=&country=&limit=&include_test=` | live catalog search |
| GET | `/products/{id}` | denominations (packages/range) |
| POST | `/intents` | propose → runs policy, returns allowed/blocked |
| POST | `/intents/{id}/execute` | re-quote → create+pay invoice → reconcile → redemption |
| GET | `/intents/{id}` | intent + invoice + order + redemption status |
| GET | `/orders/{id}` | redemption info |
| GET/PUT | `/policy` | read/update autonomy policy |
| POST | `/kill-switch` | toggle global pause |
| GET | `/audit?limit=` | append-only audit ledger |
| GET | `/connectors/gmail/auth` | build Google consent URL (`?mode=redirect` to 302) |
| GET | `/connectors/gmail/callback` | OAuth redirect target; posts result to opener, then closes |
| GET | `/connectors/gmail/status` | `{connected, email, scopes}` |
| POST | `/connectors/gmail/fetch?limit=5` | 5 newest emails + extracted trip signal |
| POST | `/connectors/gmail/disconnect` | delete stored tokens |

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
├── connectors/       gmail.py (OAuth + fetch), trip.py (deterministic extractor)
└── routers/          commerce.py, policy.py, webhooks.py, connectors.py
```
