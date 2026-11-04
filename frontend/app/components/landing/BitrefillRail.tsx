'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { BrandIcon } from '@/app/components/ui/BrandIcon'
import { ICON, type IconKey } from '@/app/lib/icons'

const capabilities: { icon: IconKey; label: string; desc: string }[] = [
  {
    icon: 'search',
    label: 'Live catalogue',
    desc: 'eSIMs, gift cards and top-ups queried by country, denomination and stock — pricing comes from Bitrefill, not a fixture.',
  },
  {
    icon: 'commerce',
    label: 'Real invoices',
    desc: 'The backend creates and auto-pays an invoice from the account balance. Policy is re-checked immediately before any spend.',
  },
  {
    icon: 'renewal',
    label: 'Paid ≠ delivered',
    desc: 'Every order is polled to a terminal state — delivered, failed or refunded — before the intent is marked executed.',
  },
  {
    icon: 'lifeEvent',
    label: 'Redemption + audit',
    desc: 'The code, link or PIN is returned to you and written to the append-only ledger with the Bitrefill invoice ID.',
  },
]

const calls: { method: string; path: string; desc: string; accent?: boolean }[] = [
  { method: 'GET', path: '/products/search', desc: 'catalogue + denominations' },
  { method: 'POST', path: '/intents', desc: 'deterministic policy gate', accent: true },
  { method: 'POST', path: '/invoices', desc: 'create + auto-pay from balance' },
  { method: 'GET', path: '/invoices/{id}', desc: 'poll every order to terminal' },
  { method: '→', path: 'redemption_info', desc: 'code · link · PIN' },
]

export function BitrefillRail() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <section id="commerce" className="py-24 bg-ink px-6 lg:px-12">
      <div ref={ref} className="max-w-7xl mx-auto">
        <motion.div
          className="border border-line rounded-2xl bg-ink-2 overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.7 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
            {/* Left — what Bitrefill supplies */}
            <div className="p-8 lg:p-12">
              <span className="inline-flex items-center gap-2 font-mono text-xs text-signal bg-signal/10 border border-signal/20 px-3 py-1 rounded-full mb-6">
                <BrandIcon slug="bitrefill" size={14} />
                COMMERCE RAILS // BITREFILL
              </span>

              <h2 className="font-display text-5xl text-mist leading-tight mb-5">
                The store behind the agent.
              </h2>

              <p className="font-body text-base text-mist-dim max-w-xl mb-8">
                Life OS doesn&apos;t fake fulfilment. Bitrefill&apos;s eCommerce API v2 is the
                commerce layer the agent executes against: live inventory, server-side invoices,
                order reconciliation, and the actual redemption code at the end.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {capabilities.map((item) => {
                  const CapIcon = ICON[item.icon]
                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-line bg-ink-3/60 p-4 hover:border-signal/25 transition-colors"
                    >
                      <CapIcon size={20} weight="duotone" className="text-signal mb-3" />
                      <p className="font-mono text-xs text-mist uppercase tracking-widest mb-2">
                        {item.label}
                      </p>
                      <p className="font-body text-sm text-mist-dim leading-relaxed">{item.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right — the live call rail */}
            <div className="border-t lg:border-t-0 lg:border-l border-line bg-ink/40 p-8 lg:p-10 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-6">
                <span className="font-mono text-[10px] text-mist-dim tracking-[0.2em]">
                  LIVE CALL SEQUENCE
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-shielded">
                  <span className="w-1.5 h-1.5 rounded-full bg-shielded" />
                  API v2
                </span>
              </div>

              <ol className="flex flex-col">
                {calls.map((call, index) => (
                  <li key={call.path} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < calls.length - 1 && (
                      <span className="absolute left-[5px] top-4 bottom-0 w-px bg-line" aria-hidden="true" />
                    )}
                    <span
                      className={`relative z-10 mt-1 w-[11px] h-[11px] rounded-full border flex-shrink-0 ${
                        call.accent
                          ? 'border-signal bg-signal/40'
                          : 'border-mist-dim/40 bg-ink'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-[10px] text-signal bg-signal/10 border border-signal/20 rounded px-1.5 py-0.5">
                          {call.method}
                        </span>
                        <span className="font-mono text-xs text-mist break-all">{call.path}</span>
                      </div>
                      <p className="font-mono text-[11px] text-mist-dim mt-1">{call.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Example order receipt */}
              <div className="mt-8 rounded-xl border border-line bg-ink-3/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-mist-dim tracking-[0.16em]">
                    EXAMPLE ORDER
                  </span>
                  <span className="font-mono text-[10px] text-shielded flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-shielded" />
                    DELIVERED
                  </span>
                </div>
                <p className="font-mono text-xs text-mist mt-3">Airalo · Singapore 3GB eSIM</p>
                <p className="font-mono text-[10px] text-mist-dim mt-1">
                  invoice BR-SG-20241104 · $9.00
                </p>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-line bg-ink px-3 py-2">
                  <span className="font-mono text-[10px] text-mist-dim tracking-[0.14em]">
                    REDEMPTION
                  </span>
                  <span className="font-mono text-xs text-shielded">••••-••••-9F2A</span>
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-line">
                <p className="font-mono text-[11px] text-mist-dim leading-relaxed">
                  Catalogue, invoices and redemption codes are real.
                  <br />
                  Dev uses Bitrefill test products; fund the account for live buys.
                </p>
                <p className="font-mono text-[10px] text-mist-dim/60 mt-3">
                  api.bitrefill.com/v2 · key stays in the backend
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
