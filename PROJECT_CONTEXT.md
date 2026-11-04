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

### Frontend dependencies (installed)
| Package | Version | Purpose |
| --- | --- | --- |
| `next` | 16.4.5 | App Router, Turbopack, typed routes |
| `react` / `react-dom` | 19.3.0 | Server + client components |
| `tailwindcss` | ^4 | Utility CSS; `@theme inline` for custom tokens |
| `motion` | ^14.9.1 | Animation (`motion/react`); SSR-safe |
| `@phosphor-icons/react` | ^2.1.10 | UI icons via SSR entry (`/dist/ssr`) |

### Fonts (via `next/font/google`, loaded in `app/layout.tsx`)
| Variable | Font | Use |
| --- | --- | --- |
| `--font-fraunces` → `font-display` | **Fraunces** | Headlines, display text |
| `--font-hanken` → `font-body` | **Hanken Grotesk** | Body copy, UI text |
| `--font-jb-mono` → `font-mono` | **Geist Mono** | Data, labels, audit, code |

### Repo layout
- `frontend/` — Next.js 16 App Router. **Next 16 has breaking changes — consult `frontend/node_modules/next/dist/docs/` before non-trivial router work.** Package manager: **Bun** (`bun install`, `bun run dev`).
- `backend/` — Python service skeleton.
- `plans/` — execution plans (gitignored; local working docs).

## 7. Life Graph data model (spec §5, key tables)

`users` · `connected_sources` · `life_memories` (type, value_json, source, confidence, observed_at, sensitivity) · `subscriptions` · `purchases` · `calendar_events` · `routines` · `trigger_rules` · `autonomy_policies` · `action_intents` (idempotency_key, policy_result, status) · `transactions` (payment_ref, asset, shielded_status, reconciliation_status) · `audit_events`.

## 8. Frontend UI — implemented (mocked)

**Status: shipped.** Landing page + full dashboard, all data client-side mocked. No real backend calls.

### Design system — "Obsidian Signal"
| Token | Value | Tailwind class |
| --- | --- | --- |
| `--ink` | `#0A0B0D` | `bg-ink` |
| `--ink-2` | `#101217` | `bg-ink-2` |
| `--ink-3` | `#171A21` | `bg-ink-3` |
| `--mist` | `#E8E6DF` | `text-mist` |
| `--mist-dim` | `#8A8F99` | `text-mist-dim` |
| `--signal` | `#F4B728` | `text-signal` / `bg-signal` — live agent, triggers, Zcash nod |
| `--shielded` | `#35C9A5` | `text-shielded` — confirmed, privacy, settled |
| `--alert` | `#FF6B57` | `text-alert` — blocked, over-cap, error |
| `--line` | `rgba(232,230,223,0.08)` | `border-line` |

`globals.css` contains **only**: `@import`, `:root` tokens, `@theme inline` mapping, `html`/`::selection`/scrollbar pseudo-selectors. No `@utility`, no `@keyframes`, no authored SVGs.

### Icon system
- **Semantic/UI icons** → `@phosphor-icons/react/dist/ssr` (SSR-safe, no `'use client'` cost). Central registry at `app/lib/icons.tsx` exports `ICON` map (key → component). Components reference keys, never glyphs or emoji.
- **Brand/connector logos** → real downloaded favicons in `public/brands/*.png`. Component `app/components/ui/BrandIcon.tsx` maps brand slug → asset; `manual`/unknown → Phosphor `UserCircle`. **No authored SVGs.**
  - Brands with favicons: `gmail`, `googlecalendar`, `bitrefill`, `zcash`, `notion`, `spotify`, `netflix`, `github`, `amazonaws`, `amazon`, `airalo`, `singtel`, `bluebottle`.
- Seed data: `ConnectedSource.brand` (slug → `BrandIcon`), `TriggerRule.iconKey` (key → `ICON`).

### Component tree
```
app/
├── page.tsx                      Landing (server component, assembles client sections)
├── dashboard/
│   ├── layout.tsx                Wraps in LifeOSProvider
│   └── page.tsx                  Renders AppShell
├── providers/LifeOSProvider.tsx  useReducer context — sources, graph, policy, triggers, payment
├── lib/
│   ├── icons.tsx                 Phosphor ICON registry
│   └── mock/                     types · seed · connectors · triggers · payment
├── components/
│   ├── atmosphere/               GrainOverlay · AuroraMesh (motion)
│   ├── ui/                       Badge · StatusPill · ConfidenceMeter · AnimatedCounter · Card · Modal · Toggle · BrandIcon
│   ├── Nav.tsx                   Landing nav (fixed, motion entrance)
│   ├── landing/                  Hero · LifeGraphConstellation · PipelineStrip · TriggerTaxonomy · AutonomyTiers · PrivacyZcash · DemoStory · CTA · Footer
│   └── dashboard/                AppShell · ConnectedSources · LifeGraphPanel · TriggerFeed · PolicyEditor · CommerceDrawer · ShieldedPaymentDemo · AuditLog
└── public/brands/                13 real brand favicons (PNG)
```

### Mocked demo path (verified end-to-end)
1. `/` landing — Fraunces hero, animated constellation, all scroll sections.
2. `/dashboard` → Sources tab → Connect Gmail → modal: Authorizing → Importing → Connected.
3. Life Graph tab → 5 subscriptions with renewal chips + confidence meters + brand logos.
4. Policy tab → per-tx slider drives "ESIM DEMO: $9 PASSES / BLOCKS" badge live.
5. Shielded Pay tab → Execute → 5-step animation (intent → broadcast → block #2847193 → confirmed → eSIM ready) → txId + ZIP-321 string. Always labelled **SIMULATED**.
6. Kill switch in top bar pauses the trigger clock globally.

## 9. Guardrails to honour even in mock

- Show **source + confidence** on every Life Graph record.
- Show the **propose → policy → authorize → verify** separation in the UI.
- Never imply the LLM holds keys or that shielded ZEC hides everything from all parties.
- Label any simulated leg as simulated.

## 10. Backend — live Bitrefill (implemented)

**Status: Phase A shipped.** Python **FastAPI** service at `backend/` (uv, Python 3.13) with a **real** Bitrefill REST API v2 integration. Connectors (Gmail/Calendar/OAuth) remain mocked — only commerce is live.

- Run: `cd backend && cp .env.example .env` (set `BITREFILL_API_KEY`) `&& uv run uvicorn backend.app:app --reload --port 8000`. See `backend/README.md`.
- **Agentic loop:** `propose → policy → re-quote → create invoice → reconcile (polling) → redemption → audit`. The agent proposes; `policy.py` decides (per-tx cap, monthly budget, merchant/category allowlist, kill switch) — caps in code, never a prompt. Idempotency key per intent → no duplicate orders. Paid ≠ delivered: polls each order to terminal state.
- **Dev uses Bitrefill test products** (`test-gift-card-code`) — free, real API, real redemption codes; swap `product_id` + account balance → real buy.
- Endpoints: `/health`, `/products/search`, `/products/{id}`, `/intents`, `/intents/{id}/execute`, `/orders/{id}`, `/policy`, `/kill-switch`, `/audit`. SQLite ledger (`backend/lifeos.db`, gitignored).
- **Frontend wiring:** `frontend/app/lib/api.ts` typed client; CommerceDrawer (live catalog + propose/execute), PolicyEditor (live policy), AuditLog (live ledger) hit the backend; "LIVE · BITREFILL" badges. `NEXT_PUBLIC_API_BASE` in `.env.local`. Sources/Graph/Triggers stay mocked.
- Verified end-to-end in-browser: real eSIM catalog search, policy allow/block, invoice → delivered order → **real redemption code**, live audit ledger.
- **Secrets:** `backend/.env` gitignored; key never in repo or frontend bundle.

## 11. Zcash — planned (Phase B, two-leg)
**Not yet built.** Real shielded ZEC testnet payment as a **separate verified leg** (Bitrefill doesn't accept ZEC directly; ZEC→USDC swap is mainnet-only). Recommended path: **ZPay** (x402 + spend-limited agent wallet); run target TBD (local Zakura vs public testnet). See `plans/03-backend-bitrefill-zcash.md` phase B.

## 12. Plans log
| Plan | File | Status |
| --- | --- | --- |
| Initial UI (mocked) | `plans/01-initial-ui.md` | ✅ done — merged to `main` |
| Phosphor + brand icons | `plans/02-phosphor-icons.md` | ✅ done — merged from `ui-deepseek` |
| Backend: Bitrefill + Zcash | `plans/03-backend-bitrefill-zcash.md` | 🟡 Phase A (Bitrefill) done · Phase B (Zcash) pending |
