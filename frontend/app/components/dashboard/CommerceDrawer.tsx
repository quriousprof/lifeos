'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'
import { StatusPill } from '@/app/components/ui/StatusPill'
import { ICON } from '@/app/lib/icons'
import { api, ApiError } from '@/app/lib/api'
import type { Product, IntentView, IntentResult } from '@/app/lib/api'

const DEMO = {
  product_id: 'test-gift-card-code',
  value: 10,
  quantity: 1,
  merchant: 'bitrefill',
  category: 'gift_card',
  amount_usd: 10,
  trigger: 'commerce-demo',
  intent: 'agentic demo purchase',
} as const

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return String(err)
}

function LiveCatalog() {
  const [q, setQ] = useState('esim')
  const [country, setCountry] = useState('SG')
  const [intentText, setIntentText] = useState('travel connectivity')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    try {
      const results = await api.searchProducts(
        { q, country: country || undefined, limit: 8 },
        ctrl.signal,
      )
      setProducts(results.slice(0, 8))
    } catch (err) {
      if (ctrl.signal.aborted) return
      setError(errorMessage(err))
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [q, country])

  useEffect(() => {
    void runSearch()
    return () => abortRef.current?.abort()
    // Run once on mount with the default query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ICON.commerce size={18} className="text-signal" />
          <h2 className="font-display text-lg text-mist">Live catalog</h2>
        </div>
        <Badge variant="shielded" size="sm">
          LIVE · BITREFILL
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mist-dim">
            Query
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
            className="bg-ink-3 border border-line rounded-lg px-3 py-2 font-mono text-sm text-mist focus:border-signal/50 focus:outline-none"
            placeholder="esim"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mist-dim">
            Country
          </span>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
            className="bg-ink-3 border border-line rounded-lg px-3 py-2 font-mono text-sm text-mist focus:border-signal/50 focus:outline-none"
            placeholder="SG"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mist-dim">
            Intent
          </span>
          <input
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
            className="bg-ink-3 border border-line rounded-lg px-3 py-2 font-body text-sm text-mist focus:border-signal/50 focus:outline-none"
            placeholder="travel connectivity"
          />
        </label>
      </div>

      <button
        onClick={() => void runSearch()}
        disabled={loading}
        className="w-full mb-4 bg-signal/10 border border-signal/30 text-signal rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-signal/20 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Searching live…' : 'Search live catalog'}
      </button>

      {error && (
        <div className="bg-alert/5 border border-alert/20 rounded-lg p-3 font-mono text-xs text-alert mb-2">
          {error}
        </div>
      )}

      {!error && !loading && products.length === 0 && (
        <div className="text-center py-8 font-mono text-xs text-mist-dim">
          No products returned for this query.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {products.map((p) => {
          const pkg = p.packages[0]
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 bg-ink-3/60 border border-line rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-body text-sm text-mist truncate">{p.name}</div>
                <div className="font-mono text-[11px] text-mist-dim">
                  {p.country_code ?? '—'}
                  {pkg ? ` · ${pkg.value}` : ''}
                  {pkg && pkg.amount_usd != null ? ` · $${pkg.amount_usd}` : ''}
                </div>
              </div>
              <StatusPill status={p.in_stock ? 'confirmed' : 'idle'} />
            </div>
          )
        })}
      </div>

      <p className="mt-4 font-mono text-[11px] text-mist-dim leading-relaxed">
        Catalog is live Bitrefill data (real names and prices). The executed demo purchase
        below uses a Bitrefill test product because the hackathon account balance is $0 —
        swapping <span className="text-mist">product_id</span> to one of these eSIMs (no code
        change) makes it a real buy.
      </p>
    </Card>
  )
}

function RedemptionBox({ result }: { result: IntentResult }) {
  const invoice = result.invoice
  if (!invoice) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-mist-dim">
          invoice {invoice.id}
        </span>
        <StatusPill status={invoice.payment_status ?? invoice.status} />
      </div>

      {invoice.orders.map((order) => {
        const info = order.redemption_info
        return (
          <div
            key={order.id}
            className="bg-shielded/[0.04] border border-shielded/20 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-body text-sm text-mist">
                {order.product_name ?? 'Order'}
                {order.value ? ` · ${order.value}` : ''}
              </span>
              <StatusPill status={order.status} />
            </div>
            {info?.code && (
              <div className="mb-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-mist-dim mb-1">
                  Redemption code
                </div>
                <div className="bg-ink border border-shielded/30 rounded-md px-3 py-2 font-mono text-sm text-shielded break-all">
                  {info.code}
                </div>
              </div>
            )}
            {info?.pin && (
              <div className="font-mono text-[11px] text-mist-dim mb-1">
                PIN: <span className="text-mist break-all">{info.pin}</span>
              </div>
            )}
            {info?.link && (
              <div className="font-mono text-[11px] text-mist-dim mb-1 break-all">
                Link: <span className="text-signal">{info.link}</span>
              </div>
            )}
            {info?.instructions && (
              <p className="font-body text-[12px] text-mist-dim leading-relaxed">
                {info.instructions}
              </p>
            )}
          </div>
        )
      })}
    </motion.div>
  )
}

const EXECUTE_STEPS = [
  'Opening shielded channel',
  'Creating Bitrefill invoice',
  'Settling payment',
  'Fetching redemption',
]

function ExecuteProgress() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(
      () => setStep((s) => Math.min(s + 1, EXECUTE_STEPS.length - 1)),
      600,
    )
    return () => clearInterval(t)
  }, [])
  return (
    <div className="mt-4 flex flex-col gap-2">
      {EXECUTE_STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          {i < step ? (
            <ICON.checkCircle size={14} weight="fill" className="text-shielded" />
          ) : i === step ? (
            <ICON.simulated size={14} className="text-signal animate-pulse" />
          ) : (
            <ICON.simulated size={14} className="text-mist-dim/40" />
          )}
          <span
            className={[
              'font-mono text-[11px]',
              i <= step ? 'text-mist' : 'text-mist-dim/50',
            ].join(' ')}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

function AgenticPurchase() {
  const [intent, setIntent] = useState<IntentView | null>(null)
  const [result, setResult] = useState<IntentResult | null>(null)
  const [proposing, setProposing] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function propose() {
    setProposing(true)
    setError(null)
    setResult(null)
    try {
      const view = await api.proposeIntent({ ...DEMO })
      setIntent(view)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setProposing(false)
    }
  }

  async function execute() {
    if (!intent) return
    setExecuting(true)
    setError(null)
    try {
      const res = await api.executeIntent(intent.id)
      setResult(res)
      setIntent(res.intent)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setExecuting(false)
    }
  }

  const blocked = intent?.policy_result === 'blocked'
  const allowed = intent?.policy_result === 'allowed'

  return (
    <Card glow={blocked ? 'none' : 'shielded'}>
      <div className="flex items-center gap-2 mb-1">
        <ICON.propose size={18} className="text-signal" />
        <h2 className="font-display text-lg text-mist">Run the agent</h2>
      </div>
      <p className="font-body text-sm text-mist-dim mb-4">
        The agent proposes an intent, the backend policy engine decides, and only an
        allowed intent can be executed against the live Bitrefill API.
      </p>

      <div className="bg-ink-3/60 border border-line rounded-lg px-4 py-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="font-body text-sm text-mist">
            Test Gift Card · $10 · via Bitrefill
          </span>
          <Badge variant="mist" size="sm">
            test product — free
          </Badge>
        </div>
        <p className="mt-2 font-mono text-[11px] text-mist-dim leading-relaxed">
          A test product is used because the account balance is $0, so a real eSIM would fail
          at payment. This exercises the real API end-to-end (real invoice, real delivery,
          real redemption code). Swapping product_id to a catalogue eSIM makes it a real buy.
        </p>
      </div>

      <button
        onClick={() => void propose()}
        disabled={proposing}
        className="w-full bg-signal/10 border border-signal/30 text-signal rounded-lg px-4 py-2.5 font-mono text-xs uppercase tracking-wider hover:bg-signal/20 disabled:opacity-50 transition-colors"
      >
        {proposing ? 'Proposing…' : 'Propose → Policy → Buy'}
      </button>

      {error && (
        <div className="mt-3 bg-alert/5 border border-alert/20 rounded-lg p-3 font-mono text-xs text-alert">
          {error}
        </div>
      )}

      <AnimatePresence>
        {intent && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-mist-dim">
                Policy result
              </span>
              <StatusPill status={intent.policy_result} />
            </div>
            {intent.policy_reason && (
              <div
                className={[
                  'rounded-lg px-3 py-2 font-mono text-xs break-words',
                  blocked
                    ? 'bg-alert/5 border border-alert/20 text-alert'
                    : 'bg-shielded/5 border border-shielded/20 text-shielded',
                ].join(' ')}
              >
                {intent.policy_reason}
              </div>
            )}

            {blocked && (
              <p className="mt-2 font-body text-[12px] text-mist-dim">
                The policy engine blocked this intent — the caps are enforced in backend code.
                Raise the per-transaction cap to $10+ in the Policy tab, then propose again.
              </p>
            )}

            {allowed && (
              <button
                onClick={() => void execute()}
                disabled={executing}
                className="mt-3 w-full bg-shielded/10 border border-shielded/30 text-shielded rounded-lg px-4 py-2.5 font-mono text-xs uppercase tracking-wider hover:bg-shielded/20 disabled:opacity-50 transition-colors"
              >
                {executing ? 'Executing…' : 'Execute shielded order'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {executing && !result && <ExecuteProgress />}
      {result && <RedemptionBox result={result} />}
    </Card>
  )
}

export function CommerceDrawer() {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-3xl text-mist">Commerce Agent</h1>
            <Badge variant="shielded">LIVE · BITREFILL</Badge>
          </div>
          <p className="font-body text-sm text-mist-dim max-w-2xl">
            The agent searches the live Bitrefill catalog, submits an intent to the backend
            policy engine, and executes an allowed purchase against the real API — returning a
            real redemption code.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <LiveCatalog />
        <AgenticPurchase />
      </div>
    </div>
  )
}

export default CommerceDrawer
