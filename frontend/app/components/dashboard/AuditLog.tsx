'use client'

import React from 'react'
import { useLifeOS } from '@/app/providers/LifeOSProvider'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'

export function AuditLog() {
  const { auditEvents } = useLifeOS()

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-mist mb-2">Audit Log</h1>
        <p className="font-body text-sm text-mist-dim max-w-2xl">
          Every autonomous action has a human-readable explanation. This log is append-only
          and cannot be modified.
        </p>
      </div>

      {auditEvents.length === 0 ? (
        <div className="text-center py-16 font-mono text-xs text-mist-dim">
          No audit events yet. Audit entries are created as sources connect, triggers fire,
          and payments execute.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {auditEvents.map((event) => {
            const bgClass =
              event.result === 'success'
                ? 'bg-shielded/[0.03]'
                : event.result === 'blocked'
                  ? 'bg-alert/[0.03]'
                  : 'bg-signal/[0.03]'

            const icon =
              event.result === 'success'
                ? '✓'
                : event.result === 'blocked'
                  ? '✗'
                  : '◎'

            const iconColor =
              event.result === 'success'
                ? 'text-shielded'
                : event.result === 'blocked'
                  ? 'text-alert'
                  : 'text-signal'

            return (
              <Card key={event.id} className={`${bgClass}`}>
                <div className="flex items-start gap-4 p-4">
                  <span className={`${iconColor} text-lg mt-0.5 shrink-0`}>{icon}</span>

                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-mist mb-0.5">{event.action}</div>
                    <div className="font-mono text-xs text-mist-dim mb-1">{event.actor}</div>
                    <div className="font-body text-sm text-mist-dim mb-2">{event.reason}</div>

                    {(event.amount || event.paymentRef || event.fulfillmentStatus) && (
                      <div className="flex items-center gap-3 flex-wrap">
                        {event.amount && (
                          <span className="font-mono text-xs text-mist-dim/60">
                            ${event.amount.toFixed(2)} {event.currency}
                          </span>
                        )}
                        {event.paymentRef && (
                          <span className="font-mono text-xs text-mist-dim/60">
                            ref: {event.paymentRef}
                          </span>
                        )}
                        {event.fulfillmentStatus && (
                          <span className="font-mono text-xs text-mist-dim/60">
                            fulfillment: {event.fulfillmentStatus}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-mono text-xs text-mist-dim">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge
                      variant={
                        event.result === 'success'
                          ? 'shielded'
                          : event.result === 'blocked'
                            ? 'alert'
                            : 'signal'
                      }
                      size="sm"
                    >
                      {event.result}
                    </Badge>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
