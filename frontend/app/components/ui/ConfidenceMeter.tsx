'use client'

import React from 'react'
import { motion } from 'motion/react'

interface ConfidenceMeterProps {
  value: number
  label?: string
}

export function ConfidenceMeter({ value, label }: ConfidenceMeterProps) {
  const pct = Math.round(value * 100)
  const isHigh = value >= 0.7
  const fillColor = isHigh ? 'bg-shielded' : 'bg-signal'

  return (
    <div className="w-full">
      {(label !== undefined) && (
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs text-mist-dim">{label}</span>
          <span className="font-mono text-xs text-mist-dim">{pct}%</span>
        </div>
      )}
      {label === undefined && (
        <div className="flex items-center justify-between mb-1">
          <span />
          <span className="font-mono text-xs text-mist-dim">{pct}%</span>
        </div>
      )}
      <div className="bg-ink-3 rounded-full h-1 w-full overflow-hidden">
        <motion.div
          className={['h-full rounded-full', fillColor].join(' ')}
          initial={{ width: '0%' }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

export default ConfidenceMeter
