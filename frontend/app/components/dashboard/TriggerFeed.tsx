'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLifeOS } from '@/app/providers/LifeOSProvider'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'
import { StatusPill } from '@/app/components/ui/StatusPill'
import type { PipelineStatus } from '@/app/lib/mock'


function PipelineViz({ status }: { status: PipelineStatus }) {
  const steps = ['PROPOSED', 'POLICY CHECK', 'AUTHORIZED', 'EXECUTED', 'VERIFIED']
  const statusOrder: Record<string, number> = {
    proposed: 0,
    policy_check: 1,
    authorized: 2,
    executed: 3,
    verified: 4,
    blocked: 1,
    failed: 1,
  }
  const activeIdx = statusOrder[status] ?? 0
  const isBlocked = status === 'blocked' || status === 'failed'

  return (
    <div className="flex items-center gap-1 flex-wrap mt-3">
      {steps.map((step, i) => {
        const isDone = i < activeIdx && !isBlocked
        const isActive = i === activeIdx && !isBlocked
        const isBlockedStep = isBlocked && i === activeIdx

        return (
          <React.Fragment key={step}>
            <span
              className={
                'font-mono text-xs px-2 py-1 rounded ' +
                (isBlockedStep
                  ? 'bg-alert/20 text-alert border border-alert/40'
                  : isDone
                    ? 'bg-shielded/20 text-shielded border border-shielded/40'
                    : isActive
                      ? 'bg-signal/20 text-signal border border-signal/40'
                      : 'bg-ink-3 text-mist-dim/40 border border-line/30')
              }
            >
              {step}
            </span>
            {i < steps.length - 1 && (
              <span className="text-mist-dim/40 text-xs">→</span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function TriggerFeed() {
  const { intents, triggerRules, killSwitch, runTrigger } = useLifeOS()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-mist mb-2">Trigger Feed</h1>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 p-4 bg-ink-2 rounded-xl mb-6 border border-line">
        <span
          className={
            'w-2 h-2 rounded-full shrink-0 ' +
            (killSwitch ? 'bg-mist-dim' : 'bg-signal animate-pulse')
          }
        />
        <span className="font-mono text-xs text-mist-dim flex-1">
          {killSwitch ? 'TRIGGER CLOCK PAUSED' : 'TRIGGER CLOCK ACTIVE'}
        </span>
        <Badge variant={killSwitch ? 'alert' : 'signal'}>
          {killSwitch ? 'PAUSED' : 'LIVE'}
        </Badge>
      </div>

      {/* Trigger rules grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {triggerRules.map((rule) => (
          <Card key={rule.id} className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-xl">{rule.icon}</span>
              <div className="flex-1">
                <p className="font-body text-sm text-mist leading-snug">{rule.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant={rule.enabled ? 'signal' : 'default'} size="sm">
                {rule.enabled ? 'enabled' : 'disabled'}
              </Badge>
              <button
                onClick={() => runTrigger(rule.id)}
                disabled={killSwitch}
                className="font-mono text-xs text-mist-dim border border-line rounded-full px-3 py-1 hover:text-mist hover:border-signal/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Run now
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Intent feed */}
      <div className="mb-4">
        <span className="font-mono text-xs text-signal uppercase tracking-widest">Intent Feed</span>
      </div>

      {intents.length === 0 ? (
        <div className="text-center py-16 font-mono text-xs text-mist-dim">
          No triggers fired yet. Triggers will appear as sources connect.
        </div>
      ) : (
        <div>
          {intents.map((intent) => {
            const rule = triggerRules.find((r) => r.id === intent.triggerId)
            const isExpanded = expandedId === intent.id

            return (
              <div key={intent.id} className="border-b border-line">
                <div
                  className="flex items-center gap-4 py-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : intent.id)}
                >
                  <span className="text-lg shrink-0">{rule?.icon ?? '↻'}</span>
                  <span className="font-body text-sm text-mist flex-1">
                    {intent.triggerDescription}
                  </span>
                  <span className="font-mono text-xs text-mist-dim shrink-0">
                    {new Date(intent.createdAt).toLocaleTimeString()}
                  </span>
                  <Badge
                    variant={
                      intent.policyResult === 'allowed'
                        ? 'shielded'
                        : intent.policyResult === 'blocked'
                          ? 'alert'
                          : 'signal'
                    }
                    size="sm"
                  >
                    {intent.policyResult}
                  </Badge>
                  <StatusPill status={intent.status} />
                  <span className="font-mono text-xs text-signal shrink-0">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pb-4 pl-10 pr-4">
                        <PipelineViz status={intent.status} />

                        {(intent.productName || intent.amount) && (
                          <div className="mt-3 flex items-center gap-3">
                            {intent.productName && (
                              <span className="font-body text-sm text-mist">
                                {intent.productName}
                              </span>
                            )}
                            {intent.amount && (
                              <span className="font-mono text-sm text-signal">
                                ${intent.amount.toFixed(2)} {intent.currency}
                              </span>
                            )}
                          </div>
                        )}

                        {intent.policyReason && (
                          <p className="font-mono text-xs text-mist-dim italic mt-2">
                            {intent.policyReason}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
