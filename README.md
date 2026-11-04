# Life OS

**The autonomous operating system for everyday life.**

Connect a person's digital life once → build a permissioned **Life Graph** → detect useful moments → let bounded, auditable agents take action (replenish, book, renew, buy digital goods) **within rules you control** — without re-prompting.

Built for the **Free Society Hack** (Zcash × Bitrefill, Mumbai, 4–5 Nov 2026). Life OS targets **both tracks**: *Agentic Commerce* (an agent that finds, buys and pays through Bitrefill on its own) and *Privacy* (payments that can be authorized but never seized, settled with shielded ZEC).

---

## The one idea that makes it safe

> The model **proposes**. Deterministic code **decides**. A wallet **executes**. A verifier **reconciles**.

The LLM never holds funds, keys, or spend limits. Every agent action runs through a deterministic policy engine (per-transaction cap, monthly budget, merchant/category allowlist, kill switch) enforced in **backend code, never in a prompt**. An allowed intent executes under an idempotency key (no duplicate orders); a separate verifier confirms fulfilment; and every step lands in an append-only audit log.

```mermaid
flowchart LR
    T[Trigger / signal] --> P[Agent proposes intent]
    P --> POL{Policy engine<br/>caps · allowlist · kill switch}
    POL -->|blocked + reason| X[Stop · audit]
    POL -->|allowed| EX[Execute: create & pay invoice]
    EX --> R[Reconcile each order<br/>paid ≠ delivered]
    R --> V[Redemption + verify]
    V --> A[(Audit ledger)]
```

---

## What's built

| Area | Notes |
| --- | --- |
| **Landing page** | "Obsidian Signal" theme, animated Life Graph constellation, scroll reveals |
| **Agentic chat** | Natural-language purchase flow — preset → propose → policy → execute → redemption code |
| **Dashboard** | Sources, Life Graph, Triggers, Policy, Commerce, Shielded Pay, Audit |
| **Bitrefill backend** | Real REST API v2: search → policy → invoice → reconcile → redemption → audit |
| **Zcash shielded payment** | Real testnet shielded leg — two independently-verified legs |

---

## Repository layout

```
lifeos/
├── frontend/              Next.js 16 · React 19 · Tailwind v4 · Bun · motion · Phosphor
│   └── app/
│       ├── page.tsx                  landing page
│       ├── dashboard/                dashboard route
│       ├── components/               ui · atmosphere · landing · dashboard
│       └── lib/
│           ├── api.ts                typed client for the backend
│           └── icons.tsx             Phosphor icon registry
├── backend/               FastAPI · httpx · SQLite (uv, Python 3.13)
│   ├── main.py            entrypoint — `uv run main.py`
│   ├── app.py            policy.py  audit.py  db.py  config.py  models.py
│   ├── bitrefill/        client.py (REST v2) + service.py (orchestration)
│   └── routers/          commerce.py · policy.py · webhooks.py
├── PROJECT_CONTEXT.md     deep context: spec, design system, data model
└── README.md             you are here
```

---

## Quickstart

Two processes: the backend (port 8000) and the frontend (port 3000). You need a **Bitrefill API key** (`bitrefill.com/account/developers`).

### 1 · Backend

```bash
cd backend
cp .env.example .env          # set BITREFILL_API_KEY=...
uv run main.py                # uvicorn on http://127.0.0.1:8000
```

Check it: `curl localhost:8000/health` → `{"status":"ok","bitrefill":{"ping":"pong",...}}`.

### 2 · Frontend

```bash
cd frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
bun install
bun run dev                    # http://localhost:3000
```

Open `http://localhost:3000` for the landing page, `http://localhost:3000/dashboard` for the app.

---

## The agent chat flow

The dashboard opens to the **Agent** tab. Click the preset pill — *"I'm travelling to Singapore, buy me an eSIM"* — and the agent runs the full autonomous purchase pipeline live:

1. **Propose** — agent selects a product and submits an intent to the backend
2. **Policy check** — deterministic engine checks category, merchant, per-transaction cap, monthly budget
3. **Execute** — creates a real Bitrefill invoice, pays it, polls each order to delivery
4. **Redemption** — returns the real code, invoice ID, and a **View Txn** link to `bitrefill.com/checkout/{invoice_id}`

Lowering the per-transaction cap in the **Policy** tab below the purchase price will block the same purchase — the policy engine returns a reason in code, not a prompt.

### Backend API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | self + Bitrefill ping + balance |
| GET | `/products/search?q=&country=&limit=` | live catalogue search |
| GET | `/products/{id}` | denominations (packages / range) |
| POST | `/intents` | propose → policy check → allowed/blocked |
| POST | `/intents/{id}/execute` | re-quote → invoice → reconcile → redemption |
| GET | `/intents/{id}` | intent + invoice + order + redemption status |
| GET / PUT | `/policy` | read / update autonomy policy |
| POST | `/kill-switch` | toggle global pause |
| GET | `/audit?limit=` | append-only audit ledger |

---

## Design system — "Obsidian Signal"

A nocturnal, instrument-grade "mission control for a life". Dark obsidian canvas, **signal gold** for live agent activity (a Zcash nod), **shielded jade** for confirmed/private states, **alert red** for blocked.

- **Fonts:** Fraunces (display) · Hanken Grotesk (body) · Geist Mono (data/labels/audit)
- **Icons:** Phosphor (`@phosphor-icons/react`) via a central registry; brand marks are real downloaded favicons in `public/brands/`
- **Motion:** `motion/react` — staggered hero reveal, scroll-triggered sections, animated constellation, live chat step reveals

---

## Tech stack

| Layer | Tech |
| --- | --- |
| Web dashboard | Next.js 16 (App Router) · React 19 · Tailwind v4 · Bun · motion · Phosphor |
| Backend | FastAPI · httpx · SQLite · uv · Python 3.13 |
| Commerce | Bitrefill eCommerce REST API v2 — `https://api.bitrefill.com/v2` |
| Payments | Zcash shielded testnet — ZPay / x402 path, two verified legs |

---

## Security notes

- The Bitrefill API key lives only in `backend/.env` (gitignored) — never in the repo or the frontend bundle.
- Spend caps, allowlists, and idempotency are enforced in backend code, not an LLM prompt.
- Shielded ZEC hides the sender and amount on-chain — it does not hide the order from the merchant or fulfilment partner.
