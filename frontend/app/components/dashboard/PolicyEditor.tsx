'use client'

import React, { useState } from 'react'
import { useLifeOS } from '@/app/providers/LifeOSProvider'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'

const ALL_CATEGORIES = ['esim', 'subscription', 'media', 'productivity', 'travel', 'groceries']

export function PolicyEditor() {
  const { policy, updatePolicy } = useLifeOS()
  const [newMerchant, setNewMerchant] = useState('')

  const spentPct = policy.monthlyBudget > 0
    ? (policy.monthlySpent / policy.monthlyBudget) * 100
    : 0

  const progressColor =
    spentPct > 95 ? 'bg-alert' : spentPct > 80 ? 'bg-signal' : 'bg-shielded'

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-mist mb-2">Autonomy Policy</h1>
        <p className="font-body text-sm text-mist-dim max-w-2xl">
          Policy is enforced deterministically in backend code. The agent proposes; policy decides.
          Changes apply immediately to future triggers.
        </p>
      </div>

      <div className="bg-signal/5 border border-signal/20 rounded-xl p-4 mb-6 font-mono text-xs text-mist-dim">
        Spend caps are enforced in code, not in an LLM prompt. Changing limits below $9 will block
        the eSIM purchase in the demo.
      </div>

      <div className="flex flex-col gap-4">
        {/* Spending limits */}
        <Card className="p-5">
          <h2 className="font-mono text-xs text-signal uppercase tracking-widest mb-4">
            Spending Limits
          </h2>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-xs text-mist-dim">Per-transaction limit</label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-mist">${policy.perTxLimit}</span>
                {policy.perTxLimit < 9 ? (
                  <Badge variant="alert" size="sm">Will block eSIM demo</Badge>
                ) : policy.perTxLimit <= 20 ? (
                  <Badge variant="signal" size="sm">eSIM demo: $9 passes</Badge>
                ) : null}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={policy.perTxLimit}
              onChange={(e) => updatePolicy({ perTxLimit: Number(e.target.value) })}
              className="w-full accent-signal"
            />
            <div className="flex justify-between font-mono text-xs text-mist-dim/60 mt-1">
              <span>$0</span><span>$100</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-xs text-mist-dim">Monthly budget</label>
              <span className="font-mono text-xs text-mist-dim">
                ${policy.monthlySpent.toFixed(2)} of ${policy.monthlyBudget}
              </span>
            </div>
            <input
              type="number"
              min={0}
              max={10000}
              value={policy.monthlyBudget}
              onChange={(e) => updatePolicy({ monthlyBudget: Number(e.target.value) })}
              className="w-full bg-ink-3 border border-line rounded-lg px-3 py-2 font-mono text-sm text-mist mb-2 focus:outline-none focus:border-signal/50"
            />
            <div className="h-2 bg-ink-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${Math.min(spentPct, 100)}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Merchant allowlist */}
        <Card className="p-5">
          <h2 className="font-mono text-xs text-signal uppercase tracking-widest mb-4">
            Merchant Allowlist
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {policy.merchantAllowlist.map((merchant) => (
              <span
                key={merchant}
                className="flex items-center gap-1.5 font-mono text-xs bg-ink-3 border border-line rounded-full px-3 py-1"
              >
                {merchant}
                <button
                  onClick={() =>
                    updatePolicy({
                      merchantAllowlist: policy.merchantAllowlist.filter((m) => m !== merchant),
                    })
                  }
                  className="text-mist-dim hover:text-alert transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMerchant}
              onChange={(e) => setNewMerchant(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newMerchant.trim()) {
                  updatePolicy({
                    merchantAllowlist: [...policy.merchantAllowlist, newMerchant.trim().toLowerCase()],
                  })
                  setNewMerchant('')
                }
              }}
              placeholder="Add merchant..."
              className="flex-1 bg-ink-3 border border-line rounded-lg px-3 py-2 font-mono text-xs text-mist placeholder:text-mist-dim/40 focus:outline-none focus:border-signal/50"
            />
            <button
              onClick={() => {
                if (newMerchant.trim()) {
                  updatePolicy({
                    merchantAllowlist: [...policy.merchantAllowlist, newMerchant.trim().toLowerCase()],
                  })
                  setNewMerchant('')
                }
              }}
              className="bg-signal/10 text-signal border border-signal/30 font-mono text-xs px-4 py-2 rounded-lg hover:bg-signal/20 transition-colors"
            >
              Add
            </button>
          </div>
        </Card>

        {/* Category allowlist */}
        <Card className="p-5">
          <h2 className="font-mono text-xs text-signal uppercase tracking-widest mb-4">
            Category Allowlist
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ALL_CATEGORIES.map((cat) => {
              const checked = policy.categoryAllowlist.includes(cat)
              return (
                <label
                  key={cat}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <span
                    className={
                      'w-4 h-4 rounded border flex items-center justify-center text-xs transition-colors ' +
                      (checked
                        ? 'bg-signal border-signal text-ink'
                        : 'border-line bg-ink-3 text-transparent')
                    }
                    onClick={() =>
                      updatePolicy({
                        categoryAllowlist: checked
                          ? policy.categoryAllowlist.filter((c) => c !== cat)
                          : [...policy.categoryAllowlist, cat],
                      })
                    }
                  >
                    ✓
                  </span>
                  <span className="font-mono text-xs text-mist">{cat}</span>
                </label>
              )
            })}
          </div>
        </Card>

        {/* Approval mode */}
        <Card className="p-5">
          <h2 className="font-mono text-xs text-signal uppercase tracking-widest mb-4">
            Approval Mode
          </h2>
          <div className="flex flex-col gap-3">
            {(
              [
                { value: 'auto',        desc: 'Execute if all policy conditions pass' },
                { value: 'conditional', desc: 'Execute only if explicit rules match' },
                { value: 'manual',      desc: 'Always require explicit approval' },
              ] as const
            ).map(({ value, desc }) => (
              <label key={value} className="flex items-center gap-3 cursor-pointer">
                <span
                  className={
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ' +
                    (policy.approvalMode === value
                      ? 'border-signal bg-signal'
                      : 'border-line bg-ink-3')
                  }
                  onClick={() => updatePolicy({ approvalMode: value })}
                >
                  {policy.approvalMode === value && (
                    <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                  )}
                </span>
                <div>
                  <span className="font-mono text-xs text-mist capitalize">{value}</span>
                  <span className="font-body text-xs text-mist-dim ml-2">— {desc}</span>
                </div>
              </label>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
