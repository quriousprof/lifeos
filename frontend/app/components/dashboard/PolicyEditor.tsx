'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'
import { ICON } from '@/app/lib/icons'
import { api, ApiError } from '@/app/lib/api'
import type { Policy } from '@/app/lib/api'

const CATEGORIES = ['esim', 'gift_card', 'phone_refill', 'subscription', 'media']
const APPROVAL_MODES: Policy['approval_mode'][] = ['auto', 'conditional', 'manual']

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return String(err)
}

export function PolicyEditor() {
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newMerchant, setNewMerchant] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inflightRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    api
      .getPolicy(ctrl.signal)
      .then(setPolicy)
      .catch((err) => {
        if (!ctrl.signal.aborted) setError(errorMessage(err))
      })
    return () => ctrl.abort()
  }, [])

  const flush = useCallback(async (patch: Partial<Policy>) => {
    inflightRef.current?.abort()
    const ctrl = new AbortController()
    inflightRef.current = ctrl
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updatePolicy(patch, ctrl.signal)
      setPolicy(updated)
    } catch (err) {
      if (!ctrl.signal.aborted) setError(errorMessage(err))
    } finally {
      if (!ctrl.signal.aborted) setSaving(false)
    }
  }, [])

  // Optimistic local update + debounced PUT.
  const commit = useCallback(
    (patch: Partial<Policy>) => {
      setPolicy((prev) => (prev ? { ...prev, ...patch } : prev))
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void flush(patch), 400)
    },
    [flush],
  )

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      inflightRef.current?.abort()
    }
  }, [])

  if (!policy) {
    return (
      <div>
        <h1 className="font-display text-3xl text-mist mb-2">Autonomy Policy</h1>
        {error ? (
          <div className="bg-alert/5 border border-alert/20 rounded-lg p-3 font-mono text-xs text-alert">
            {error}
          </div>
        ) : (
          <div className="font-mono text-xs text-mist-dim py-8">Loading live policy…</div>
        )}
      </div>
    )
  }

  const demoPasses = policy.per_tx_limit >= 10
  const spentPct =
    policy.monthly_budget > 0 ? (policy.monthly_spent / policy.monthly_budget) * 100 : 0
  const progressColor =
    spentPct > 95 ? 'bg-alert' : spentPct > 80 ? 'bg-signal' : 'bg-shielded'

  function removeMerchant(m: string) {
    if (!policy) return
    commit({ merchant_allowlist: policy.merchant_allowlist.filter((x) => x !== m) })
  }

  function addMerchant() {
    if (!policy) return
    const m = newMerchant.trim().toLowerCase()
    if (!m || policy.merchant_allowlist.includes(m)) {
      setNewMerchant('')
      return
    }
    commit({ merchant_allowlist: [...policy.merchant_allowlist, m] })
    setNewMerchant('')
  }

  function toggleCategory(cat: string) {
    if (!policy) return
    const next = policy.category_allowlist.includes(cat)
      ? policy.category_allowlist.filter((c) => c !== cat)
      : [...policy.category_allowlist, cat]
    commit({ category_allowlist: next })
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-3xl text-mist">Autonomy Policy</h1>
            <Badge variant="shielded">LIVE</Badge>
          </div>
          <p className="font-body text-sm text-mist-dim max-w-2xl">
            These caps are enforced by the backend before any purchase. Edits save to the live
            policy immediately.
          </p>
        </div>
        {saving && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-signal mt-2">
            saving…
          </span>
        )}
      </div>

      <div className="bg-signal/5 border border-signal/20 rounded-xl p-4 mb-6 font-mono text-xs text-mist-dim leading-relaxed">
        Caps are enforced in backend code, not a prompt. Changes apply immediately to the next
        agent purchase.
      </div>

      {error && (
        <div className="bg-alert/5 border border-alert/20 rounded-lg p-3 font-mono text-xs text-alert mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Spending limits */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ICON.threshold size={18} className="text-signal" />
            <h2 className="font-display text-lg text-mist">Spending limits</h2>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-mist-dim">
                Per-transaction limit
              </span>
              {demoPasses ? (
                <Badge variant="signal" size="sm">
                  $10 demo passes
                </Badge>
              ) : (
                <Badge variant="alert" size="sm">
                  Will block the $10 demo buy
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-mist">$</span>
              <input
                type="number"
                min={0}
                max={100}
                value={policy.per_tx_limit}
                onChange={(e) => commit({ per_tx_limit: Number(e.target.value) })}
                className="w-24 bg-ink-3 border border-line rounded-lg px-3 py-2 font-mono text-sm text-mist focus:border-signal/50 focus:outline-none"
              />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={policy.per_tx_limit}
                onChange={(e) => commit({ per_tx_limit: Number(e.target.value) })}
                className="flex-1 accent-signal"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-mist-dim">
                Monthly budget
              </span>
              <span className="font-mono text-[11px] text-mist-dim">
                ${policy.monthly_spent} of ${policy.monthly_budget}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-mist">$</span>
              <input
                type="number"
                min={0}
                value={policy.monthly_budget}
                onChange={(e) => commit({ monthly_budget: Number(e.target.value) })}
                className="w-28 bg-ink-3 border border-line rounded-lg px-3 py-2 font-mono text-sm text-mist focus:border-signal/50 focus:outline-none"
              />
            </div>
            <div className="h-2 bg-ink-3 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressColor} transition-all`}
                style={{ width: `${Math.min(spentPct, 100)}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Merchant allowlist */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ICON.commerce size={18} className="text-signal" />
            <h2 className="font-display text-lg text-mist">Merchant allowlist</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {policy.merchant_allowlist.map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1.5 bg-ink-3 border border-line rounded-full pl-3 pr-1.5 py-1 font-mono text-xs text-mist"
              >
                {m}
                <button
                  onClick={() => removeMerchant(m)}
                  className="text-mist-dim hover:text-alert transition-colors"
                  aria-label={`Remove ${m}`}
                >
                  <ICON.cross size={12} />
                </button>
              </span>
            ))}
            {policy.merchant_allowlist.length === 0 && (
              <span className="font-mono text-xs text-mist-dim">No merchants allowed</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newMerchant}
              onChange={(e) => setNewMerchant(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMerchant()}
              placeholder="add merchant"
              className="flex-1 bg-ink-3 border border-line rounded-lg px-3 py-2 font-mono text-sm text-mist focus:border-signal/50 focus:outline-none"
            />
            <button
              onClick={addMerchant}
              className="bg-signal/10 border border-signal/30 text-signal rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-signal/20 transition-colors"
            >
              Add
            </button>
          </div>
        </Card>

        {/* Category allowlist */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ICON.audit size={18} className="text-signal" />
            <h2 className="font-display text-lg text-mist">Category allowlist</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const on = policy.category_allowlist.includes(cat)
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={[
                    'flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs transition-colors border',
                    on
                      ? 'bg-shielded/10 border-shielded/30 text-shielded'
                      : 'bg-ink-3 border-line text-mist-dim hover:text-mist',
                  ].join(' ')}
                >
                  {on ? (
                    <ICON.checkCircle size={14} weight="fill" />
                  ) : (
                    <ICON.simulated size={14} />
                  )}
                  {cat}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Approval mode */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ICON.policy size={18} className="text-signal" />
            <h2 className="font-display text-lg text-mist">Approval mode</h2>
          </div>
          <div className="flex flex-col gap-2">
            {APPROVAL_MODES.map((mode) => {
              const on = policy.approval_mode === mode
              return (
                <button
                  key={mode}
                  onClick={() => commit({ approval_mode: mode })}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-sm transition-colors border text-left',
                    on
                      ? 'bg-signal/10 border-signal/30 text-signal'
                      : 'bg-ink-3 border-line text-mist-dim hover:text-mist',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-block w-3.5 h-3.5 rounded-full border',
                      on ? 'bg-signal border-signal' : 'border-line',
                    ].join(' ')}
                  />
                  {mode}
                </button>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default PolicyEditor
