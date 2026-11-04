'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import Link from 'next/link'
import { AuroraMesh } from '@/app/components/atmosphere/AuroraMesh'

export function CTA() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <section id="cta" className="relative py-32 px-6 lg:px-12 overflow-hidden" ref={ref}>
      {/* Aurora background */}
      <div className="absolute inset-0 z-0">
        <AuroraMesh />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center">
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.7 }}
        >
          {/* Mono chip */}
          <span className="font-mono text-xs text-signal bg-signal/10 border border-signal/20 px-3 py-1 rounded-full">
            LIFE OS // FREE SOCIETY HACK // 4 NOV 2026
          </span>

          {/* Heading */}
          <h2 className="font-display text-6xl text-mist leading-tight">
            Your life,{' '}
            <br className="hidden sm:block" />
            anticipated and handled.
          </h2>

          {/* Body */}
          <p className="font-body text-base text-mist-dim max-w-lg">
            Explore the dashboard — connect sources, trigger the Singapore eSIM flow, and buy real
            digital goods through Bitrefill&apos;s live commerce API.
          </p>

          {/* CTA button */}
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-signal to-signal/80 text-ink font-mono font-bold text-base px-10 py-4 rounded-full hover:scale-105 transition-transform inline-block mt-2"
          >
            Enter the OS →
          </Link>

          {/* Disclaimer */}
          <p className="font-mono text-xs text-mist-dim">
            Bitrefill commerce runs on its live API (test products in dev) · source imports are
            simulated
          </p>
        </motion.div>
      </div>
    </section>
  )
}
