'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { Badge } from '@/app/components/ui/Badge'

const tiers = [
  {
    label: 'AUTONOMOUS',
    desc: 'Pre-approved top-ups, replenishments from allowlisted providers',
    badge: 'AUTO' as const,
    badgeVariant: 'shielded' as const,
    barColor: 'bg-shielded',
    muted: false,
  },
  {
    label: 'CONDITIONAL',
    desc: 'Tickets, gift cards — only if date/location/price rules pass',
    badge: 'COND' as const,
    badgeVariant: 'signal' as const,
    barColor: 'bg-signal',
    muted: false,
  },
  {
    label: 'APPROVAL REQUIRED',
    desc: 'New merchants, expensive, non-refundable, unusual amounts',
    badge: 'MANUAL' as const,
    badgeVariant: 'mist' as const,
    barColor: 'bg-mist',
    muted: false,
  },
  {
    label: 'NEVER AUTONOMOUS',
    desc: 'Loans, investments, legal commitments',
    badge: 'LOCKED' as const,
    badgeVariant: 'alert' as const,
    barColor: 'bg-alert',
    muted: true,
    lock: true,
  },
]

export function AutonomyTiers() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <section id="autonomy" className="py-24 bg-ink-2 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[40fr_60fr] gap-16 items-start">
          {/* Left: heading + body */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-5xl text-mist leading-tight mb-6">
              Bounded autonomy, not unrestricted access.
            </h2>
            <p className="font-body text-base text-mist-dim">
              Every agent action falls into one of four tiers. The tier determines how much
              discretion an agent has. Tier one means the action fires automatically within your
              pre-set rules. Tier four means the action is blocked — permanently, in code.
            </p>
            <p className="font-body text-base text-mist-dim mt-4">
              You set the tier for each category. The policy engine enforces it. No LLM can
              override a lower tier.
            </p>
          </motion.div>

          {/* Right: tier rows */}
          <div ref={ref} className="flex flex-col">
            {tiers.map((tier, index) => (
              <motion.div
                key={tier.label}
                className={`flex items-start gap-4 py-5 border-b border-line ${tier.muted ? 'opacity-60' : ''}`}
                initial={{ opacity: 0, x: 24 }}
                animate={inView ? { opacity: tier.muted ? 0.6 : 1, x: 0 } : { opacity: 0, x: 24 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                {/* Left color bar */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${tier.barColor}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {tier.lock && <span className="text-sm">🔒</span>}
                    <span className="font-mono text-sm uppercase tracking-wider text-mist">
                      {tier.label}
                    </span>
                  </div>
                  <p className="font-body text-sm text-mist-dim">{tier.desc}</p>
                </div>

                {/* Badge */}
                <div className="flex-shrink-0">
                  <Badge variant={tier.badgeVariant} size="sm">
                    {tier.badge}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
