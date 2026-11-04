'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { ICON, type IconKey } from '@/app/lib/icons'

const triggers: { icon: IconKey; type: string; event: string; response: string }[] = [
  {
    icon: 'time',
    type: 'Time-based',
    event: 'Subscription renewal in 3 days',
    response: 'Check usage, price, policy; notify or renew',
  },
  {
    icon: 'calendar',
    type: 'Calendar-based',
    event: 'Saturday evening free',
    response: 'Find a relevant event within budget',
  },
  {
    icon: 'location',
    type: 'Location-based',
    event: 'User enters new country',
    response: 'Check eSIM and destination essentials',
  },
  {
    icon: 'behaviour',
    type: 'Behaviour-based',
    event: 'Coffee every ~30 days',
    response: 'Estimate replenishment window',
  },
  {
    icon: 'opportunity',
    type: 'Opportunity-based',
    event: 'Favourite artist announces show',
    response: 'Match interests, date, distance, price',
  },
  {
    icon: 'threshold',
    type: 'Threshold-based',
    event: 'Travel budget at 80%',
    response: 'Pause discretionary purchases, notify',
  },
  {
    icon: 'lifeEvent',
    type: 'Life-event',
    event: 'Birthday in 7 days',
    response: 'Prepare gift ideas within gifting policy',
  },
]

export function TriggerTaxonomy() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <section id="triggers" className="py-24 bg-ink px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Heading with vertical rule */}
        <motion.div
          className="flex items-start gap-6 mb-16"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-1 h-16 bg-signal rounded-full flex-shrink-0 mt-1" />
          <h2 className="font-display text-5xl text-mist leading-tight">
            7 ways Life OS knows when to act
          </h2>
        </motion.div>

        {/* Grid of trigger cards */}
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {triggers.map((trigger, index) => {
            const TriggerIcon = ICON[trigger.icon]
            return (
              <motion.div
                key={trigger.type}
                className="bg-ink-2 border border-line rounded-2xl p-6 flex flex-col gap-4 group cursor-default
                hover:-translate-y-1 hover:border-signal/30 hover:shadow-[0_0_24px_rgba(244,183,40,0.08)]
                transition-all duration-300"
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
              >
                {/* Icon */}
                <TriggerIcon size={22} weight="duotone" className="text-signal" />

                {/* Type label */}
                <span className="font-mono text-xs text-signal uppercase tracking-wider">
                  {trigger.type}
                </span>

                {/* Example event */}
                <p className="font-body text-sm text-mist italic">{trigger.event}</p>

                {/* Divider */}
                <div className="border-t border-line" />

                {/* Agent response */}
                <p className="font-body text-xs text-mist-dim">{trigger.response}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
