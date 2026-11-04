'use client'

import React from 'react'

type BadgeVariant = 'signal' | 'shielded' | 'alert' | 'mist' | 'default'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
}

const variantClasses: Record<BadgeVariant, string> = {
  signal: 'bg-signal/10 text-signal border border-signal/30',
  shielded: 'bg-shielded/10 text-shielded border border-shielded/30',
  alert: 'bg-alert/10 text-alert border border-alert/30',
  mist: 'bg-mist/10 text-mist border border-line',
  default: 'bg-ink-3 text-mist-dim border border-line',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-3 py-1',
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-mono uppercase tracking-wider',
        variantClasses[variant],
        sizeClasses[size],
      ].join(' ')}
    >
      {children}
    </span>
  )
}

export default Badge
