# Life OS — Project Context

> The autonomous operating system for everyday life.
> Connect a person's digital life once → build a permissioned **Life Graph** → detect useful moments → let bounded, auditable agents act (replenish, book, renew, buy digital goods) without re-prompting.

Source of truth: `Life_OS_Product_Build_Document.docx` (Build spec v1.0, Free Society Hack, 4 Nov 2026).

---

## 1. Core thesis & principles

- **Permissioned, not surveillance.** Data access is granular, visible, revocable, minimised.
- **Event-driven agent, not a chatbot.** Connectors emit typed events → rules engine → the agent proposes → deterministic policy decides → wallet executes → verifier reconciles.
- **The LLM never holds funds or credentials.** It *proposes*; deterministic policy code *authorizes*; a wallet/payment component *executes*; a verifier *reconciles*. Spend caps live in backend code, never in a prompt.
- **Bounded autonomy.** "Autonomous" = within user-set category/merchant/amount/frequency/budget policy, with a kill switch.
- **Privacy-preserving payments.** A genuine shielded ZEC testnet payment, not a wallet-connect logo.

## 2. Product modules (from spec §3)

| Module | Responsibility |
| --- | --- |
| Connectors | OAuth / APIs / imports / explicit browser permission. Gmail receipts, Calendar, Bitrefill, manual prefs. |
| Life Graph | Canonical records: subscriptions, purchases, events, interests, routines, budgets — with source + confidence. |
| Trigger Engine | Time / event / threshold / location / opportunity triggers. |
| Opportunity Engine | Decide if an event is relevant and useful; recommend one action with a reason. |
| Commerce Agent | Search / compare / create order (Bitrefill eCommerce MCP). |
| Autonomy Policy | Deterministic approval + spend rules (category cap, per-tx cap, monthly budget, merchant allowlist). |
| Payment Layer | Wallet authorisation + execution. Shielded ZEC testnet. Never expose seed to LLM. |
| Fulfilment & Audit | Confirm order, store receipt, dedupe, reconcile, human-readable audit log. |
| UI | Chrome extension + Telegram + **web dashboard** (Life Graph, connected sources, policy editor, activity log). |

## 3. Trigger taxonomy (spec §6)

Time-based · Calendar-based · Location-based · Behaviour-based · Opportunity-based · Threshold-based · Life-event. Pipeline: ingest → validate → dedupe → load graph+policy → deterministic check → AI ranks options → re-check price/stock/quote → idempotent intent → execute → verify payment + fulfilment separately → audit + notify.

## 4. Autonomy tiers (spec §7)

- **Autonomous** — pre-approved top-up/replenishment from allowlisted provider.
- **Conditional** — ticket / gift card, only if date/location/price/quantity/cancellation rules pass.
- **Approval required** — new merchant, expensive, non-refundable, unusual amount.
- **Never autonomous (MVP)** — loans, investments, legal commitments, sensitive account changes.

## 5. Flagship demo story (spec §12/§14)

User imports subscription receipts + calendar events → Life OS detects a **Singapore trip / connectivity need** → agent searches **Bitrefill** for an eligible eSIM, compares options → **policy engine** confirms category allowed, amount under cap, budget available → **shielded ZEC testnet payment** authorised → Bitrefill invoice/fulfilment verified (or clearly labelled settlement adapter) → **audit entry** shows what triggered, why allowed, amount, payment + fulfilment status.

## 6. Tech stack (spec §10 + repo reality)

| Layer | Tech |
| --- | --- |
| Web dashboard | **Next.js 16 (App Router) + React 19 + Tailwind v4**, Bun 1.3. `frontend/` |
| Backend | Python (`backend/`, `pyproject.toml`) — spec suggests Node/TS; repo is Python. |
| DB | PostgreSQL (canonical), optional pgvector. |
| Jobs/events | Redis + BullMQ or managed queue. |
| Agent orchestration | LangGraph / explicit state machine; typed tools, resumable. |
| Email / Calendar | Gmail API + Pub/Sub; Google Calendar API + watch. |
| Commerce | Bitrefill eCommerce MCP — https://api.bitrefill.com/mcp , https://github.com/bitrefill/agents |
| Zcash | Builder-Pack-approved wallet/SDK (WebZjs / ZIP-321 candidates). |
| Extension | Manifest V3 + React + TS. |
| Messaging | Telegram Bot API. |

### Repo layout
- `frontend/` — Next.js 16 app (App Router, typed routes: layouts use `LayoutProps<"/">`). **Next 16 has breaking changes — consult `frontend/node_modules/next/dist/docs/` before non-trivial router work.** Package manager: **Bun** (`bun install`, `bun run dev`).
- `backend/` — Python service skeleton.
- `plans/` — execution plans (gitignored; local working docs).

## 7. Life Graph data model (spec §5, key tables)

`users` · `connected_sources` · `life_memories` (type, value_json, source, confidence, observed_at, sensitivity) · `subscriptions` · `purchases` · `calendar_events` · `routines` · `trigger_rules` · `autonomy_policies` · `action_intents` (idempotency_key, policy_result, status) · `transactions` (payment_ref, asset, shielded_status, reconciliation_status) · `audit_events`.

## 8. Current milestone: **Initial UI (mocked)**

Build the **landing page + dashboard surface** with **all connections/data fully mocked client-side** (fake OAuth flows, seeded Life Graph, simulated trigger feed, mocked Bitrefill search, simulated shielded-payment demo). No real backend/API calls yet. Design per `plans/` using the `frontend-design` skill. See `plans/01-initial-ui.md`.

## 9. Guardrails to honour even in mock

- Show **source + confidence** on every Life Graph record.
- Show the **propose → policy → authorize → verify** separation in the UI.
- Never imply the LLM holds keys or that shielded ZEC hides everything from all parties.
- Label any simulated leg as simulated.
