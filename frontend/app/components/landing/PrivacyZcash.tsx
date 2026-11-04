'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { ICON } from '@/app/lib/icons'

const paymentSteps = [
  { num: 1, label: 'intent' },
  { num: 2, label: 'broadcast' },
  { num: 3, label: 'mined' },
  { num: 4, label: 'confirmed' },
  { num: 5, label: 'settled' },
]

const claims = [
  { ok: true,  text: 'Shielded ZEC transaction on testnet with real ZIP-321 payment request' },
  { ok: true,  text: 'Wallet-side authorisation — the LLM never holds keys' },
  { ok: true,  text: 'Separate payment and fulfilment verification' },
  { ok: false, text: 'Transaction does NOT hide data from the merchant, Bitrefill, or fulfilment partners' },
  { ok: false, text: 'Demo settlement is a clearly labelled simulation' },
]

export function PrivacyZcash() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <section id="privacy" className="py-24 bg-ink-2 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto" ref={ref}>
        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-16 items-center">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.6 }}
          >
            {/* Mono tag */}
            <span className="font-mono text-xs text-shielded bg-shielded/10 border border-shielded/20 px-3 py-1 rounded-full inline-block mb-6">
              SHIELDED PAYMENTS
            </span>

            {/* Heading */}
            <h2 className="font-display text-5xl text-mist leading-tight mb-6">
              Privacy is a parameter, not a promise.
            </h2>

            {/* Body */}
            <p className="font-body text-base text-mist-dim mb-6">
              Life OS uses Zcash shielded transactions (testnet) for the payment leg of agent
              actions. A ZIP-321 payment request is generated, the wallet component signs and
              broadcasts without exposing the spend to the agent. Here is exactly what that means —
              and what it does not.
            </p>

            {/* Claims list */}
            <ul className="flex flex-col gap-3">
              {claims.map((claim, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-3 font-body text-sm text-mist-dim"
                  initial={{ opacity: 0, x: -16 }}
                  animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                >
                  <span
                    className={`flex-shrink-0 mt-0.5 ${claim.ok ? 'text-shielded' : 'text-alert'}`}
                  >
                    {claim.ok ? (
                      <ICON.checkCircle size={14} weight="fill" />
                    ) : (
                      <ICON.warning size={14} weight="bold" />
                    )}
                  </span>
                  <span>{claim.text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right: payment flow visualization */}
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {/* ZEC amount */}
            <div className="font-mono text-shielded text-lg mb-8">
              0.00458 ZEC testnet
            </div>

            {/* Flow steps */}
            <div className="flex flex-col items-center gap-0 w-full max-w-xs">
              {paymentSteps.map((step, i) => {
                const isLast = i === paymentSteps.length - 1
                return (
                  <div key={step.num} className="flex flex-col items-center w-full">
                    {/* Step circle + label */}
                    <div className="flex items-center gap-4 w-full">
                      <motion.div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm flex-shrink-0
                          ${isLast
                            ? 'border-2 border-shielded text-shielded shadow-[0_0_16px_rgba(53,201,165,0.4)]'
                            : 'border border-line text-mist-dim'
                          }`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                        transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                      >
                        {step.num}
                      </motion.div>
                      <span className={`font-mono text-xs ${isLast ? 'text-shielded' : 'text-mist-dim'}`}>
                        {step.label}
                      </span>
                    </div>

                    {/* Connecting line */}
                    {!isLast && (
                      <div className="w-px h-8 bg-line ml-5" />
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
