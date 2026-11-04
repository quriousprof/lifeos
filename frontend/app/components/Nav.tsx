'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'

export function Nav() {
  return (
    <motion.header
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5 bg-ink/80 backdrop-blur-md border-b border-line"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Wordmark */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-mist-dim">LIFE</span>
        <span className="font-mono text-signal tracking-widest">OS</span>
        <span
          className="w-1.5 h-1.5 rounded-full bg-signal"
          style={{ animation: 'pulse-signal 2s ease-in-out infinite' }}
          aria-hidden="true"
        />
      </div>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-8">
        <a
          href="#pipeline"
          className="font-mono text-xs text-mist-dim hover:text-mist transition-colors"
        >
          How it works
        </a>
        <a
          href="#triggers"
          className="font-mono text-xs text-mist-dim hover:text-mist transition-colors"
        >
          Triggers
        </a>
        <a
          href="#privacy"
          className="font-mono text-xs text-mist-dim hover:text-mist transition-colors"
        >
          Privacy
        </a>
      </nav>

      {/* CTA */}
      <Link
        href="/dashboard"
        className="border border-signal/40 text-signal font-mono text-xs px-4 py-2 rounded-full hover:bg-signal/10 transition-colors"
      >
        Enter the OS →
      </Link>
    </motion.header>
  )
}

export default Nav
