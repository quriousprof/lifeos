'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { Card } from '@/app/components/ui/Card'

const steps = [
  {
    num: '01',
    icon: '🤖',
    label: 'PROPOSE',
    desc: 'Agent identifies a useful action from Life Graph context',
  },
  {
    num: '02',
    icon: '⬡',
    label: 'POLICY CHECK',
    desc: 'Deterministic code checks category, merchant, amount, budget',
  },
  {
    num: '03',
    icon: '🔑',
    label: 'AUTHORIZE',
    desc: 'Wallet component approves the bounded spend',
  },
  {
    num: '04',
    icon: '⚡',
    label: 'EXECUTE',
    desc: 'Commerce API creates the order',
  },
  {
    num: '05',
    icon: '✓',
    label: 'VERIFY',
    desc: 'Fulfilment confirmed, audit log written',
  },
]

export function PipelineStrip() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <section id="pipeline" className="py-24 bg-ink-2 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-4">
          <motion.h2
            className="font-display text-4xl text-mist mb-4"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.6 }}
          >
            The proposal → policy → execution chain
          </motion.h2>
          <motion.p
            className="font-mono text-sm text-mist-dim max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            Every agent action runs through a deterministic permission engine. The LLM proposes.
            Policy decides. The wallet executes.
          </motion.p>
        </div>

        {/* Steps */}
        <div ref={ref} className="flex flex-col lg:flex-row items-stretch gap-0 mt-12">
          {steps.map((step, index) => (
            <div key={step.num} className="flex lg:flex-row flex-col items-center flex-1 gap-0">
              <motion.div
                className="flex-1 w-full"
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="h-full p-6 flex flex-col items-center text-center gap-3">
                  <span className="font-mono text-xs text-mist-dim">{step.num}</span>
                  <span className="text-2xl">{step.icon}</span>
                  <span className="font-mono text-xs text-signal uppercase tracking-widest">
                    {step.label}
                  </span>
                  <p className="font-body text-sm text-mist-dim">{step.desc}</p>
                </Card>
              </motion.div>

              {/* Arrow between steps */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex items-center justify-center px-2 text-mist-dim/40 text-xl flex-shrink-0">
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Callout box */}
        <motion.div
          className="bg-signal/5 border border-signal/20 rounded-xl p-4 mt-10 font-mono text-sm text-mist-dim"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          ⚠ The LLM proposes an action. It never holds keys, spending caps live in backend code,
          and every transaction is independently verified.
        </motion.div>
      </div>
    </section>
  )
}
