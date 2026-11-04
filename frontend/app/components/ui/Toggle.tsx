'use client'

import React from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  variant?: 'default' | 'kill'
}

export function Toggle({ checked, onChange, label, variant = 'default' }: ToggleProps) {
  const isKill = variant === 'kill'

  const trackClass = [
    'w-11 h-6 rounded-full border transition-colors cursor-pointer flex-shrink-0',
    checked
      ? isKill
        ? 'bg-alert/20 border-alert/50'
        : 'bg-signal/20 border-signal/50'
      : 'bg-ink-3 border-line',
  ].join(' ')

  const thumbClass = [
    'w-4 h-4 rounded-full transition-transform',
    checked
      ? isKill
        ? 'translate-x-5 bg-alert'
        : 'translate-x-5 bg-signal'
      : 'translate-x-1 bg-mist-dim',
  ].join(' ')

  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={trackClass}
        onClick={() => onChange(!checked)}
      >
        <span className={['block', thumbClass].join(' ')} style={{ marginTop: 3 }} />
      </button>
      {label && (
        <span className="font-mono text-xs text-mist-dim">{label}</span>
      )}
    </label>
  )
}

export default Toggle
