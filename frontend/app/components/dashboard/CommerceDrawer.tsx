'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLifeOS } from '@/app/providers/LifeOSProvider'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'
import { BITREFILL_SG_PRODUCTS } from '@/app/lib/mock'
import { ICON } from '@/app/lib/icons'
import type { BitrefillProduct } from '@/app/lib/mock'

function PolicyCheckRow({
  label,
  pass,
  delay,
}: {
  label: string
  pass: boolean
  delay: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className={pass ? 'text-shielded' : 'text-alert'}>
            {pass ? (
              <ICON.check size={14} weight="bold" />
            ) : (
              <ICON.cross size={14} weight="bold" />
            )}
          </span>
          <span className="font-mono text-xs text-mist-dim">{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function QuoteCountdown() {
  const [seconds, setSeconds] = useState(300)
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return (
    <span className="font-mono text-xs text-mist-dim">
      Quote expires in {mins}:{secs.toString().padStart(2, '0')}
    </span>
  )
}

export function CommerceDrawer() {
  const { intents, policy, runTrigger } = useLifeOS()
  const [selectedProduct, setSelectedProduct] = useState<BitrefillProduct | null>(null)
  const [orderState, setOrderState] = useState<'idle' | 'creating' | 'created'>('idle')
  const [orderRef, setOrderRef] = useState('')

  const authorizedTravelIntent = intents.find(
    (i) => i.triggerId === 'trig-travel' && i.policyResult === 'allowed'
  )

  const policyPasses =
    selectedProduct !== null &&
    selectedProduct.denominations[0] <= policy.perTxLimit &&
    policy.merchantAllowlist.includes('bitrefill') &&
    policy.categoryAllowlist.includes('esim')

  function handleCreateOrder() {
    setOrderState('creating')
    setTimeout(() => {
      setOrderRef(`ORD-${Date.now().toString(36).toUpperCase()}`)
      setOrderState('created')
    }, 1800)
  }

  if (!authorizedTravelIntent) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-3xl text-mist mb-2">Commerce Agent</h1>
        </div>

        <div className="bg-ink-2 border border-line rounded-xl p-8 text-center">
          <div className="flex justify-center text-mist-dim mb-4">
            <ICON.travel size={36} weight="duotone" />
          </div>
          <p className="font-body text-sm text-mist-dim mb-6 max-w-sm mx-auto">
            No active commerce triggers. Connect Gmail + Calendar and wait for the Singapore travel
            trigger to fire.
          </p>
          <button
            onClick={() => runTrigger('trig-travel')}
            className="bg-signal/10 text-signal border border-signal/30 font-mono text-xs px-6 py-3 rounded-full hover:bg-signal/20 transition-colors"
          >
            Trigger Singapore eSIM Flow
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-mist mb-2">Commerce Agent</h1>
      </div>

      {/* Trigger context card */}
      <Card glow="signal" className="p-5 mb-6">
        <h2 className="flex items-center gap-2 font-display text-lg text-mist mb-1">
          <ICON.travel size={20} weight="duotone" className="text-signal" />
          Singapore Tech Summit
        </h2>
        <p className="font-mono text-xs text-mist-dim mb-3">
          Marina Bay Sands · Starts in 3 days
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-body text-sm text-mist-dim">
            {authorizedTravelIntent.proposedAction}
          </span>
          <Badge
            variant={
              authorizedTravelIntent.policyResult === 'allowed'
                ? 'shielded'
                : authorizedTravelIntent.policyResult === 'blocked'
                  ? 'alert'
                  : 'signal'
            }
          >
            {authorizedTravelIntent.policyResult}
          </Badge>
        </div>
      </Card>

      {/* Product catalog */}
      <h2 className="font-mono text-xs text-signal uppercase tracking-widest mb-4">
        Bitrefill — Singapore eSIM Options
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {BITREFILL_SG_PRODUCTS.map((product) => {
          const price = product.denominations[0]
          const isSelected = selectedProduct?.id === product.id

          return (
            <Card
              key={product.id}
              glow={product.popular ? 'shielded' : 'none'}
              className={
                'p-5 cursor-pointer transition-all ' +
                (isSelected ? 'ring-1 ring-signal' : '')
              }
              onClick={() => {
                setSelectedProduct(isSelected ? null : product)
                setOrderState('idle')
                setOrderRef('')
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display text-lg text-mist">{product.name}</h3>
                {product.popular && <Badge variant="shielded" size="sm">popular</Badge>}
              </div>
              <div className="font-mono text-xs text-mist-dim mb-2">{product.operator}</div>
              <p className="font-body text-sm text-mist-dim mb-3">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl text-signal">${price}</span>
                <button
                  className={
                    'font-mono text-xs px-4 py-2 rounded-full border transition-colors ' +
                    (isSelected
                      ? 'bg-signal text-ink border-signal'
                      : 'bg-transparent text-signal border-signal/40 hover:bg-signal/10')
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedProduct(isSelected ? null : product)
                    setOrderState('idle')
                    setOrderRef('')
                  }}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Order summary */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <Card className="p-5">
              <h2 className="font-mono text-xs text-signal uppercase tracking-widest mb-4">
                Order Summary
              </h2>

              <div className="flex items-center justify-between mb-4">
                <span className="font-body text-sm text-mist">{selectedProduct.name}</span>
                <span className="font-mono text-sm text-signal">
                  ${selectedProduct.denominations[0].toFixed(2)}
                </span>
              </div>

              {/* Policy checks */}
              <div className="bg-ink-3 rounded-xl p-4 mb-4 flex flex-col gap-2">
                <span className="font-mono text-xs text-mist-dim mb-1">Policy check</span>
                <PolicyCheckRow
                  label={`Amount $${selectedProduct.denominations[0]} vs $${policy.perTxLimit} limit`}
                  pass={selectedProduct.denominations[0] <= policy.perTxLimit}
                  delay={300}
                />
                <PolicyCheckRow
                  label="Merchant: bitrefill (allowlisted)"
                  pass={policy.merchantAllowlist.includes('bitrefill')}
                  delay={700}
                />
                <PolicyCheckRow
                  label="Category: esim (allowlisted)"
                  pass={policy.categoryAllowlist.includes('esim')}
                  delay={1100}
                />
              </div>

              <div className="mb-4">
                <QuoteCountdown />
              </div>

              {orderState === 'created' ? (
                <div className="flex items-center gap-3">
                  <ICON.check size={18} weight="bold" className="text-shielded" />
                  <span className="font-mono text-xs text-shielded">
                    Order created — ref: {orderRef}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleCreateOrder}
                  disabled={!policyPasses || orderState === 'creating'}
                  className="bg-signal text-ink font-mono font-bold px-6 py-3 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-signal/90 transition-colors flex items-center gap-2"
                >
                  {orderState === 'creating' ? (
                    <>
                      <span className="w-3 h-3 border-2 border-ink/40 border-t-ink rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Order'
                  )}
                </button>
              )}

              {!policyPasses && (
                <p className="font-mono text-xs text-alert mt-3">
                  Policy check failed — order blocked.
                </p>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
