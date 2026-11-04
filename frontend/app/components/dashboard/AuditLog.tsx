'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'
import { ICON } from '@/app/lib/icons'
import { api, ApiError } from '@/app/lib/api'
import type { AuditView } from '@/app/lib/api'

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return String(err)
}

const RESULT_VARIANT: Record<AuditView['result'], 'shielded' | 'alert' | 'signal'> = {
  success: 'shielded',
  blocked: 'alert',
  simulated: 'signal',
}

function ResultIcon({ result }: { result: AuditView['result'] }) {
  if (result === 'success')
    return <ICON.checkCircle size={18} weight="fill" className="text-shielded" />
  if (result === 'blocked')
    return <ICON.crossCircle size={18} weight="fill" className="text-alert" />
  return <ICON.simulated size={18} className="text-signal" />
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditView[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const rows = await api.listAudit(100, ctrl.signal)
      setEvents(rows)
      setError(null)
    } catch (err) {
      if (!ctrl.signal.aborted) setError(errorMessage(err))
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 5000)
    return () => {
      clearInterval(t)
      abortRef.current?.abort()
    }
  }, [load])

  // Newest first.
  const ordered = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-3xl text-mist">Audit Log</h1>
            <Badge variant="shielded">LIVE</Badge>
          </div>
          <p className="font-body text-sm text-mist-dim max-w-2xl">
            Every autonomous action is recorded by the backend with a human-readable reason.
            This feed polls the live audit trail every five seconds.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 bg-ink-3 border border-line text-mist-dim rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-wider hover:text-mist transition-colors mt-1"
        >
          <ICON.subscriptions size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-alert/5 border border-alert/20 rounded-lg p-3 font-mono text-xs text-alert mb-4">
          {error}
        </div>
      )}

      {loading && ordered.length === 0 ? (
        <div className="text-center py-16 font-mono text-xs text-mist-dim">
          Loading live audit trail…
        </div>
      ) : ordered.length === 0 ? (
        <div className="text-center py-16 font-mono text-xs text-mist-dim">
          No audit events yet. Entries appear as the agent proposes, policy decides, and
          payments execute.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((event) => {
            const bgClass =
              event.result === 'success'
                ? 'bg-shielded/[0.03]'
                : event.result === 'blocked'
                  ? 'bg-alert/[0.03]'
                  : 'bg-signal/[0.03]'

            return (
              <Card key={event.id} className={bgClass}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <ResultIcon result={event.result} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="font-mono text-sm text-mist break-all">
                        {event.action}
                      </span>
                      <Badge variant={RESULT_VARIANT[event.result]} size="sm">
                        {event.result}
                      </Badge>
                    </div>
                    <div className="font-mono text-[11px] text-mist-dim mb-1">
                      {event.actor}
                    </div>
                    <p className="font-body text-sm text-mist-dim mb-2">{event.reason}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-mist-dim">
                      {event.amount_usd != null && (
                        <span>
                          amount <span className="text-mist">${event.amount_usd}</span>
                        </span>
                      )}
                      {event.payment_ref && (
                        <span className="break-all">
                          ref <span className="text-mist">{event.payment_ref}</span>
                        </span>
                      )}
                      {event.fulfillment_status && (
                        <span>
                          fulfillment{' '}
                          <span className="text-mist">{event.fulfillment_status}</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2 font-mono text-[10px] text-mist-dim/70">
                      {formatTime(event.timestamp)}
                    </div>
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

export default AuditLog
