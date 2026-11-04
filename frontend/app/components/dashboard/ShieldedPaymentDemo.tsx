'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLifeOS } from '@/app/providers/LifeOSProvider'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'
import { BrandIcon } from '@/app/components/ui/BrandIcon'
import { ICON } from '@/app/lib/icons'
import type { ShieldedStatus } from '@/app/lib/mock'

type StepDef = {
  key: ShieldedStatus
  label: string
  details: string
}

const STEPS: StepDef[] = [
  { key: 'intent',    label: 'Payment intent created',  details: 'ZIP-321 request generated' },
  { key: 'broadcast', label: 'Transaction broadcast',   details: 'Sent to testnet mempool' },
  { key: 'mined',     label: 'Included in block',       details: 'Block #2847193' },
  { key: 'confirmed', label: '1 confirmation received', details: 'Testnet confirmation' },
  { key: 'settled',   label: 'Order fulfilment confirmed', details: 'eSIM ready' },
]

const STATUS_ORDER: ShieldedStatus[] = ['intent', 'broadcast', 'mined', 'confirmed', 'settled']

export function ShieldedPaymentDemo() {
  const { transaction, runPayment, intents } = useLifeOS()
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)

  const authorizedIntent = intents.find(
    (i) => i.status === 'authorized' && i.amount !== undefined
  )

  const displayAmount = authorizedIntent?.amount ?? 9
  const zecAmount = (displayAmount / 150).toFixed(5)

  const currentStepIdx = transaction
    ? STATUS_ORDER.indexOf(transaction.shieldedStatus)
    : -1

  function handleRun() {
    setRunning(true)
    setStarted(true)
    runPayment()
    // Stop spinner once settled
    const check = setInterval(() => {
      if (transaction?.shieldedStatus === 'settled') {
        setRunning(false)
        clearInterval(check)
      }
    }, 500)
    // Safety fallback
    setTimeout(() => { setRunning(false); clearInterval(check) }, 12000)
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-3xl text-mist">Shielded Payment Demo</h1>
          <Badge variant="alert">SIMULATED</Badge>
        </div>
        <p className="font-body text-sm text-mist-dim max-w-2xl">
          This demonstrates a shielded ZEC payment flow. The transaction sequence is fully
          simulated. In production, a real wallet (WebZjs / compatible Snap) would authorize
          and broadcast.
        </p>
      </div>

      {/* Payment intent card */}
      <Card glow="shielded" className="p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-xs text-mist-dim mb-1">
              {authorizedIntent
                ? `Order ref: ${authorizedIntent.id.slice(0, 20)}...`
                : 'Order ref: order-demo-sg-esim'}
            </div>
            <div className="font-mono text-xl text-shielded mb-1">
              ${displayAmount.toFixed(2)} USD ≈ {zecAmount} ZEC
            </div>
            <div className="flex items-center gap-1.5 font-body text-sm text-mist">
              <BrandIcon slug="bitrefill" size={14} className="rounded-sm shrink-0" />
              <span>
                {authorizedIntent?.productName ?? 'Airalo SG 3GB'} — Bitrefill / Airalo
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandIcon slug="zcash" size={18} className="rounded shrink-0" />
            <Badge variant="shielded">zcash testnet</Badge>
          </div>
        </div>
      </Card>

      {/* Execute button */}
      {!started && (
        <div className="mb-6">
          <button
            onClick={handleRun}
            disabled={running}
            className="bg-shielded/10 text-shielded border-2 border-shielded/40 font-mono font-bold text-base px-8 py-4 rounded-xl hover:bg-shielded/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-3"
          >
            {running && (
              <span className="w-4 h-4 border-2 border-shielded/40 border-t-shielded rounded-full animate-spin" />
            )}
            Execute Shielded Payment
          </button>
          <p className="font-mono text-xs text-mist-dim/60 mt-2">[SIMULATED]</p>
        </div>
      )}

      {/* Payment sequence */}
      <AnimatePresence>
        {started && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              {STEPS.map((step, i) => {
                const isVisible = i <= currentStepIdx || (running && i === 0)
                const isDone = i < currentStepIdx
                const isActive = i === currentStepIdx

                return (
                  <AnimatePresence key={step.key}>
                    {isVisible && (
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <span
                          className={
                            'w-2.5 h-2.5 rounded-full mt-1 shrink-0 ' +
                            (isDone
                              ? 'bg-shielded'
                              : isActive
                                ? 'bg-signal animate-pulse'
                                : 'bg-mist-dim/30')
                          }
                        />
                        <div>
                          <div className="font-mono text-sm text-mist">{step.label}</div>
                          <div className="font-body text-xs text-mist-dim">{step.details}</div>
                          {isActive && (
                            <div className="font-mono text-xs text-mist-dim">
                              {new Date().toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-settlement details */}
      <AnimatePresence>
        {transaction?.shieldedStatus === 'settled' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* txId card */}
            <div className="bg-ink-3 border border-shielded/20 rounded-xl p-4 mb-4">
              <div className="font-mono text-xs text-mist-dim mb-2">Transaction ID</div>
              <div className="font-mono text-xs text-shielded break-all">
                {transaction.txId}
              </div>
            </div>

            {/* ZIP-321 request */}
            <div className="mb-4">
              <div className="font-mono text-xs text-mist-dim mb-2">ZIP-321 Request</div>
              <pre className="font-mono text-xs text-mist-dim bg-ink p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-all">
                {transaction.zip321Request}
              </pre>
            </div>

            {/* Honest limitations */}
            <div className="border-t border-line pt-4 mt-4">
              <p className="flex items-start gap-2 font-mono text-xs text-mist-dim/60 italic">
                <ICON.warning size={14} weight="bold" className="text-alert shrink-0 mt-px" />
                <span>
                  This transaction does not hide data from Bitrefill, Airalo, or the fulfilment
                  partner. Shielded means the sender address and amount are private on-chain, not
                  that the merchant cannot see your order.
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
