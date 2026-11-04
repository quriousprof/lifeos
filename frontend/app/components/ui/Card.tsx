'use client'

import React from 'react'
import { motion } from 'motion/react'

interface CardProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
  glow?: 'signal' | 'shielded' | 'none'
  onClick?: () => void
}

export function Card({ children, className = '', glass = false, glow = 'none', onClick }: CardProps) {
  const base = 'bg-ink-2 border border-line rounded-xl p-5'
  const glassClass = glass ? 'backdrop-blur-sm bg-ink/60' : ''
  const glowClass =
    glow === 'signal'
      ? 'shadow-[0_0_24px_rgba(244,183,40,0.08)]'
      : glow === 'shielded'
      ? 'shadow-[0_0_24px_rgba(53,201,165,0.08)]'
      : ''

  return (
    <motion.div
      className={[base, glassClass, glowClass, className].filter(Boolean).join(' ')}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

export default Card
