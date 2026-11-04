'use client'

import React from 'react'
import { Badge } from '@/app/components/ui/Badge'

type BadgeVariant = 'signal' | 'shielded' | 'alert' | 'mist' | 'default'

const shieldedStatuses: Record<string, true> = {
  connected: true, authorized: true, confirmed: true,
  settled: true, success: true, allowed: true,
}
const signalStatuses: Record<string, true> = {
  proposed: true, policy_check: true, broadcast: true,
  mined: true, pending: true, importing: true,
}
const alertStatuses: Record<string, true> = {
  blocked: true, error: true, failed: true, alert: true,
}
const mistStatuses: Record<string, true> = {
  idle: true, simulated: true,
}

function getVariant(status: string): BadgeVariant {
  if (shieldedStatuses[status]) return 'shielded'
  if (signalStatuses[status]) return 'signal'
  if (alertStatuses[status]) return 'alert'
  if (mistStatuses[status]) return 'mist'
  return 'default'
}

const dotColorClasses: Record<BadgeVariant, string> = {
  shielded: 'bg-shielded',
  signal: 'bg-signal',
  alert: 'bg-alert',
  mist: 'bg-mist',
  default: 'bg-mist-dim',
}

interface StatusPillProps {
  status: string
}

export function StatusPill({ status }: StatusPillProps) {
  const variant = getVariant(status)
  return (
    <Badge variant={variant} size="sm">
      <span
        className={['inline-block rounded-full mr-1.5 flex-shrink-0', dotColorClasses[variant]].join(' ')}
        style={{ width: 6, height: 6 }}
      />
      {status}
    </Badge>
  )
}

export default StatusPill
