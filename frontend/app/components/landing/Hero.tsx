'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import Link from 'next/link'
import { AuroraMesh } from '@/app/components/atmosphere/AuroraMesh'
import { LifeGraphConstellation } from '@/app/components/landing/LifeGraphConstellation'

const leftItems = [
  { delay: 0 },
  { delay: 0.1 },
  { delay: 0.2 },
  { delay: 0.3 },
  { delay: 0.4 },
]

export function Hero() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-32 pb-16 px-6 lg:px-12 overflow-hidden"
      ref={ref}
    >
      {/* Aurora background */}
      <div className="absolute inset-0 z-0">
        <AuroraMesh />
      </div>

      <div className="relative z-10 w-full max-w-[88rem] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-10 xl:gap-14 items-center">
        {/* Left column */}
        <div className="flex flex-col">
          {/* Mono tag chip */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ delay: leftItems[0].delay, duration: 0.6 }}
          >
            <span className="font-mono text-xs text-signal bg-signal/10 border border-signal/20 px-3 py-1 rounded-full inline-block mb-6">
              LIFE OS v0.1 // AUTONOMOUS MODE
            </span>
          </motion.div>

          {/* Giant headline */}
          <motion.h1
            className="font-display text-6xl lg:text-7xl 2xl:text-8xl leading-[0.95] tracking-tight mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ delay: leftItems[1].delay, duration: 0.6 }}
          >
            <span className="text-mist block">Your life,</span>
            <span className="text-signal italic block" style={{ fontVariationSettings: '"WONK" 1' }}>
              anticipated
            </span>
            <span className="text-mist block">and handled.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="font-display text-xl text-mist-dim italic mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ delay: leftItems[2].delay, duration: 0.6 }}
          >
            &ldquo;Within rules you control.&rdquo;
          </motion.p>

          {/* Body paragraph */}
          <motion.p
            className="font-body text-base text-mist-dim max-w-md mb-8"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ delay: leftItems[3].delay, duration: 0.6 }}
          >
            Life OS builds a permissioned model of your digital life — subscriptions, purchases,
            calendar, routines — and lets bounded agents act on useful moments. Connect once. No
            repeated prompts.
          </motion.p>

          {/* CTA row */}
          <motion.div
            className="flex flex-wrap items-center gap-4 mb-10"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ delay: leftItems[4].delay, duration: 0.6 }}
          >
            <Link
              href="/dashboard"
              className="bg-signal text-ink font-mono text-sm px-6 py-3 rounded-full font-semibold hover:bg-signal/90 transition-all hover:scale-105 inline-block"
            >
              Enter the OS →
            </Link>
            <a
              href="#pipeline"
              className="border border-line text-mist-dim font-mono text-sm px-6 py-3 rounded-full hover:border-mist/30 hover:text-mist transition-all inline-block"
            >
              Read the brief
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="flex items-center gap-3 font-mono text-xs text-mist-dim"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <span>9 data connectors</span>
            <span className="opacity-40">·</span>
            <span>4 autonomy tiers</span>
            <span className="opacity-40">·</span>
            <span>1 kill switch</span>
          </motion.div>
        </div>

        {/* Right column — constellation */}
        <motion.div
          className="hidden lg:flex items-center justify-center w-full"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
        >
          <LifeGraphConstellation />
        </motion.div>
      </div>
    </section>
  )
}
