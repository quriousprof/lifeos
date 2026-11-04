'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLifeOS } from '@/app/providers/LifeOSProvider'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'
import { StatusPill } from '@/app/components/ui/StatusPill'
import { AnimatedCounter } from '@/app/components/ui/AnimatedCounter'
import { ConfidenceMeter } from '@/app/components/ui/ConfidenceMeter'
import { BrandIcon } from '@/app/components/ui/BrandIcon'
import { ICON } from '@/app/lib/icons'

function SectionHeader({
  label,
  count,
  expanded,
  onToggle,
}: {
  label: string
  count: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="flex items-center justify-between cursor-pointer py-3 border-b border-line"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-signal uppercase tracking-widest">{label}</span>
        <Badge variant="mist" size="sm">{count}</Badge>
      </div>
      <span className="text-signal">
        {expanded ? <ICON.caretDown size={12} /> : <ICON.caretRight size={12} />}
      </span>
    </div>
  )
}

function RenewalChip({ dateStr }: { dateStr: string }) {
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  const color = days <= 3 ? 'text-alert' : days <= 7 ? 'text-signal' : 'text-mist-dim'
  return (
    <span className={`font-mono text-xs ${color}`}>
      {days <= 0 ? 'today' : `in ${days}d`}
    </span>
  )
}

export function LifeGraphPanel() {
  const { subscriptions, purchases, calendarEvents, routines, memories, sources } = useLifeOS()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    subscriptions: true,
    purchases: false,
    calendar: false,
    routines: false,
    memories: false,
  })

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function sourceLabel(sourceId: string) {
    return sources.find((s) => s.id === sourceId)?.label ?? sourceId
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-mist mb-2">Life Graph</h1>
        <p className="font-body text-sm text-mist-dim max-w-2xl">
          Structured knowledge extracted from your connected sources — subscriptions, purchases,
          events, routines, and persistent memories.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Subscriptions', value: subscriptions.length },
          { label: 'Purchases', value: purchases.length },
          { label: 'Calendar Events', value: calendarEvents.length },
          { label: 'Memories & Routines', value: memories.length + routines.length },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <div className="font-mono text-2xl text-signal mb-1">
              <AnimatedCounter value={stat.value} />
            </div>
            <div className="font-mono text-xs text-mist-dim">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Subscriptions */}
      <div className="mb-2">
        <SectionHeader
          label="Subscriptions"
          count={subscriptions.length}
          expanded={expanded.subscriptions}
          onToggle={() => toggle('subscriptions')}
        />
        <AnimatePresence>
          {expanded.subscriptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-4 py-3 border-b border-line/50 flex-wrap"
                >
                  <span className="flex items-center gap-2 font-body text-sm text-mist min-w-32">
                    <BrandIcon slug={sub.provider} size={18} className="rounded shrink-0" />
                    {sub.provider}
                  </span>
                  <Badge variant="default">{sub.plan}</Badge>
                  <span className="font-mono text-sm text-mist">
                    ${sub.amount.toFixed(2)}/mo
                  </span>
                  <RenewalChip dateStr={sub.nextRenewalEstimate} />
                  <Badge variant="mist" size="sm">via {sourceLabel(sub.sourceId)}</Badge>
                  <div className="w-24">
                    <ConfidenceMeter value={sub.confidence} />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Purchases */}
      <div className="mb-2">
        <SectionHeader
          label="Purchases"
          count={purchases.length}
          expanded={expanded.purchases}
          onToggle={() => toggle('purchases')}
        />
        <AnimatePresence>
          {expanded.purchases && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 py-3 border-b border-line/50 flex-wrap"
                >
                  <span className="flex items-center gap-2 font-body text-sm text-mist min-w-32">
                    <BrandIcon slug={p.merchant} size={18} className="rounded shrink-0" />
                    {p.merchant}
                  </span>
                  <span className="font-body text-sm text-mist-dim">{p.product}</span>
                  <span className="font-mono text-sm text-mist">${p.amount.toFixed(2)}</span>
                  <span className="font-mono text-xs text-mist-dim">
                    {new Date(p.purchasedAt).toLocaleDateString()}
                  </span>
                  <StatusPill status={p.deliveryStatus} />
                  <Badge variant="mist" size="sm">via {sourceLabel(p.sourceId)}</Badge>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Calendar Events */}
      <div className="mb-2">
        <SectionHeader
          label="Calendar Events"
          count={calendarEvents.length}
          expanded={expanded.calendar}
          onToggle={() => toggle('calendar')}
        />
        <AnimatePresence>
          {expanded.calendar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {calendarEvents.map((evt) => {
                const isSingapore =
                  evt.location?.toLowerCase().includes('singapore') || evt.type === 'travel'
                return (
                  <div
                    key={evt.id}
                    className={
                      'flex items-center gap-4 py-3 border-b border-line/50 flex-wrap ' +
                      (isSingapore ? 'border-l-2 border-l-signal pl-3' : '')
                    }
                  >
                    <span className="font-body text-sm text-mist min-w-40">{evt.title}</span>
                    <span className="font-mono text-xs text-mist-dim">
                      {new Date(evt.startAt).toLocaleDateString()}
                    </span>
                    {evt.location && (
                      <span className="font-body text-xs text-mist-dim">{evt.location}</span>
                    )}
                    <Badge variant={evt.type === 'travel' ? 'signal' : 'default'}>
                      {evt.type}
                    </Badge>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Routines */}
      <div className="mb-2">
        <SectionHeader
          label="Routines"
          count={routines.length}
          expanded={expanded.routines}
          onToggle={() => toggle('routines')}
        />
        <AnimatePresence>
          {expanded.routines && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {routines.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-4 py-3 border-b border-line/50 flex-wrap"
                >
                  <span className="font-body text-sm text-mist min-w-48">{r.item}</span>
                  <span className="font-mono text-xs text-mist-dim">
                    every ~{r.estimatedInterval} days
                  </span>
                  <span className="font-mono text-xs text-mist-dim">
                    last: {new Date(r.lastObservedAt).toLocaleDateString()}
                  </span>
                  <div className="w-24">
                    <ConfidenceMeter value={r.confidence} />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Memories */}
      <div className="mb-2">
        <SectionHeader
          label="Memories"
          count={memories.length}
          expanded={expanded.memories}
          onToggle={() => toggle('memories')}
        />
        <AnimatePresence>
          {expanded.memories && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-4 py-3 border-b border-line/50 flex-wrap"
                >
                  <span className="font-mono text-xs text-signal min-w-36">{m.label}</span>
                  <span className="font-body text-sm text-mist">{m.value}</span>
                  <Badge variant="mist" size="sm">via {sourceLabel(m.sourceId)}</Badge>
                  <Badge
                    variant={
                      m.sensitivity === 'high'
                        ? 'alert'
                        : m.sensitivity === 'medium'
                          ? 'signal'
                          : 'default'
                    }
                    size="sm"
                  >
                    {m.sensitivity}
                  </Badge>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
