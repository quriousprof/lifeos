'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

const steps = [
  {
    num: 1,
    title: 'Connect Gmail + Calendar',
    detail: 'Imported 3 subscriptions and 1 travel event',
  },
  {
    num: 2,
    title: 'Life Graph built',
    detail: 'Singapore Tech Summit, Marina Bay Sands · 3 days away',
  },
  {
    num: 3,
    title: 'Trigger fires',
    detail: 'Travel event detected: international connectivity needed',
  },
  {
    num: 4,
    title: 'Bitrefill search',
    detail: 'Found: Airalo Singapore 3GB eSIM · $9 · 30 days · 5G',
  },
  {
    num: 5,
    title: 'Policy check',
    detail: 'Category: esim ✓ · Merchant: bitrefill ✓ · $9 < $20 cap ✓',
  },
  {
    num: 6,
    title: 'Shielded payment',
    detail: 'ZIP-321 request · 0.00458 ZEC testnet · wallet authorised',
  },
  {
    num: 7,
    title: 'Order confirmed',
    detail: 'Bitrefill invoice #BR-SG-20241104 · eSIM QR delivered',
  },
  {
    num: 8,
    title: 'Audit logged',
    detail: 'Trigger: travel · Amount: $9 · Payment: confirmed · Status: fulfilled',
  },
]

export function DemoStory() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <section id="demo" className="py-24 bg-ink px-6 lg:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-5xl text-mist leading-tight mb-4">
            Ninety seconds from trigger to fulfilment
          </h2>
          <p className="font-mono text-sm text-mist-dim">
            The Singapore eSIM demo story — step by step
          </p>
        </motion.div>

        {/* Steps */}
        <div ref={ref} className="mt-16 relative">
          {/* Vertical connecting line */}
          <div className="absolute left-5 top-5 bottom-5 w-px bg-line lg:left-1/2 lg:-translate-x-px" />

          <div className="flex flex-col gap-0">
            {steps.map((step, index) => {
              const isActive = index < 3
              const isLeft = index % 2 === 0

              return (
                <motion.div
                  key={step.num}
                  className={`relative flex items-start gap-6 pb-8
                    lg:flex lg:items-start lg:gap-8
                    ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'}
                  `}
                  initial={{ opacity: 0, y: 24 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  {/* Step number circle */}
                  <div
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm flex-shrink-0
                      lg:mx-auto
                      ${isActive
                        ? 'border-2 border-signal text-signal bg-signal/10'
                        : 'border border-line text-mist-dim bg-ink'
                      }`}
                  >
                    {step.num}
                  </div>

                  {/* Content */}
                  <div
                    className={`flex-1 pt-1
                      lg:max-w-[calc(50%-3rem)]
                      ${isLeft ? '' : 'lg:text-right'}
                    `}
                  >
                    <p className={`font-body text-base font-semibold mb-1 ${isActive ? 'text-mist' : 'text-mist-dim'}`}>
                      {step.title}
                    </p>
                    <p className="font-mono text-xs text-mist-dim">{step.detail}</p>
                  </div>

                  {/* Spacer for the other side on desktop */}
                  <div className="hidden lg:block flex-1" />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
