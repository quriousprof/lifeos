'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLifeOS } from '@/app/providers/LifeOSProvider'
import { Card } from '@/app/components/ui/Card'
import { StatusPill } from '@/app/components/ui/StatusPill'
import { AnimatedCounter } from '@/app/components/ui/AnimatedCounter'
import { Modal } from '@/app/components/ui/Modal'
import { BrandIcon } from '@/app/components/ui/BrandIcon'
import { ICON } from '@/app/lib/icons'
import type { SourceProvider } from '@/app/lib/mock'
import { gmailApi, type Email, type Trip } from '@/app/lib/gmail'
import api, { type InvoiceView, type OrderView } from '@/app/lib/api'

type ConnectStep = 'oauth' | 'importing' | 'done'

function ConnectModal({
  provider,
  label,
  onClose,
}: {
  provider: SourceProvider
  label: string
  onClose: () => void
}) {
  const { connect } = useLifeOS()
  const [step, setStep] = useState<ConnectStep>('oauth')
  const [importedCount, setImportedCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      await connect(provider)
      if (cancelled) return
      setStep('importing')
      let count = 0
      const interval = setInterval(() => {
        count += Math.floor(Math.random() * 15) + 5
        setImportedCount(count)
      }, 200)
      setTimeout(() => {
        clearInterval(interval)
        if (!cancelled) {
          setImportedCount((c) => c)
          setStep('done')
          setTimeout(() => { if (!cancelled) onClose() }, 1000)
        }
      }, 2400)
    }

    // Start oauth step immediately, then advance after 1.2s
    const oauthTimer = setTimeout(() => {
      if (!cancelled) run()
    }, 1200)

    return () => {
      cancelled = true
      clearTimeout(oauthTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const steps: { key: ConnectStep; label: React.ReactNode }[] = [
    { key: 'oauth', label: 'Requesting OAuth authorisation...' },
    { key: 'importing', label: 'Importing records...' },
    {
      key: 'done',
      label: (
        <span className="flex items-center gap-1.5">
          <ICON.checkCircle size={14} weight="fill" className="text-shielded shrink-0" />
          Connected — {importedCount} records imported
        </span>
      ),
    },
  ]

  const stepOrder: ConnectStep[] = ['oauth', 'importing', 'done']
  const currentIdx = stepOrder.indexOf(step)

  return (
    <Modal open onClose={onClose} title={`Connecting to ${label}`}>
      <div className="flex flex-col gap-4 py-2">
        {steps.map((s, i) => {
          const isActive = i === currentIdx
          const isDone = i < currentIdx
          const isVisible = i <= currentIdx

          return (
            <AnimatePresence key={s.key}>
              {isVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <span
                    className={
                      'w-2 h-2 rounded-full shrink-0 ' +
                      (isDone
                        ? 'bg-shielded'
                        : isActive
                          ? 'bg-signal animate-pulse'
                          : 'bg-mist-dim/30')
                    }
                  />
                  <span className="font-mono text-xs text-mist">
                    {s.key === 'importing' && isActive ? (
                      <>
                        Importing records —{' '}
                        <AnimatedCounter value={importedCount} suffix=" records" />
                      </>
                    ) : (
                      s.label
                    )}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          )
        })}
      </div>
    </Modal>
  )
}

const GMAIL_SOURCE_ID = 'src-gmail'

const ESIM_LABEL = { name: 'Airalo Singapore eSIM', value: '3GB · 30 days · 5G' }

function wait(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

// Persist handled booking emails so a remount / reload never re-triggers the same
// message (the 5s poller would otherwise loop on it forever).
const HANDLED_KEY = 'lifeos_gmail_handled'

function loadHandled(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(HANDLED_KEY)
    const ids: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function saveHandled(ids: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HANDLED_KEY, JSON.stringify([...ids]))
  } catch {
    /* storage unavailable — in-memory dedup still holds for this session */
  }
}

type BookingStage = 'found' | 'proposing' | 'purchasing' | 'done' | 'error'

function StepRow({
  done,
  active,
  label,
  detail,
  spinner,
  dimmed,
}: {
  done: boolean
  active: boolean
  label: string
  detail: string
  spinner: React.ReactNode
  dimmed?: boolean
}) {
  const Check = ICON.checkCircle
  return (
    <div className={'flex items-start gap-3 ' + (dimmed ? 'opacity-40' : '')}>
      <span className="mt-0.5 w-4 flex justify-center shrink-0">
        {done ? (
          <Check size={16} weight="fill" className="text-shielded" />
        ) : active ? (
          spinner
        ) : (
          <span className="w-2 h-2 rounded-full bg-mist-dim/30" />
        )}
      </span>
      <div>
        <div className="font-mono text-xs text-mist">{label}</div>
        <div className="font-mono text-[11px] text-mist-dim">{detail}</div>
      </div>
    </div>
  )
}

function BookingFlowModal({
  trip,
  email,
  onClose,
}: {
  trip: Trip
  email: Email | null
  onClose: () => void
}) {
  const [stage, setStage] = useState<BookingStage>('found')
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderView | null>(null)
  const [invoice, setInvoice] = useState<InvoiceView | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    // Single-shot purchase. StrictMode (dev) mounts effects twice; a cleanup-based
    // cancellation would abort the only run and freeze the dialog at "found".
    if (ranRef.current) return
    ranRef.current = true

    async function run() {
      try {
        await wait(1400) // let "Flight Booking Found!" land
        setStage('proposing')
        const intent = await api.proposeIntent({
          product_id: 'test-gift-card-code',
          value: 10,
          quantity: 1,
          merchant: 'bitrefill',
          category: 'gift_card',
          amount_usd: 10,
          trigger: 'gmail',
          intent: `Singapore travel eSIM — Gmail booking ${email?.id ?? ''}`.trim(),
        })
        if (intent.policy_result !== 'allowed') {
          setError(intent.policy_reason ?? 'Blocked by autonomy policy')
          setStage('error')
          return
        }
        await wait(500)
        setStage('purchasing')
        const result = await api.executeIntent(intent.id)
        const firstOrder = result.invoice?.orders?.[0] ?? null
        if (!result.invoice || !firstOrder) {
          setError('No order returned from Bitrefill.')
          setStage('error')
          return
        }
        setOrder(firstOrder)
        setInvoice(result.invoice)
        setStage('done')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unexpected error — check backend')
        setStage('error')
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const Plane = ICON.travel
  const Check = ICON.checkCircle
  const spinner = (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="w-4 h-4 border-2 border-signal/30 border-t-signal rounded-full inline-block"
    />
  )

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-signal/15 flex items-center justify-center shrink-0">
          <Plane size={20} weight="fill" className="text-signal" />
        </div>
        <div>
          <div className="font-display text-xl text-mist">Flight Booking Found!</div>
          <div className="font-mono text-xs text-mist-dim">Getting you an e-SIM…</div>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-ink-3/50 px-4 py-3 mb-5">
        <div className="font-mono text-xs text-mist">
          {trip.origin ?? '—'} → {trip.destination ?? '—'}
          {trip.date_raw ? ` · ${trip.date_raw}` : ''}
        </div>
        {email?.subject && (
          <div className="font-mono text-[11px] text-mist-dim mt-1 truncate">“{email.subject}”</div>
        )}
      </div>

      <div className="space-y-3">
        <StepRow
          done={stage === 'purchasing' || stage === 'done'}
          active={stage === 'proposing'}
          label="Policy check"
          detail={`${ESIM_LABEL.name} · $9.00 · within cap & allowlist`}
          spinner={spinner}
          dimmed={stage === 'found'}
        />
        <StepRow
          done={stage === 'done'}
          active={stage === 'purchasing'}
          label="Purchasing eSIM via Bitrefill"
          detail="real redemption code · audited"
          spinner={spinner}
          dimmed={stage === 'found' || stage === 'proposing'}
        />
      </div>

      {stage === 'error' && (
        <div className="mt-5 font-mono text-xs text-alert bg-alert/10 border border-alert/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      {stage === 'done' && order && (
        <div className="mt-5 rounded-lg border border-shielded/30 bg-shielded/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Check size={16} weight="fill" className="text-shielded" />
            <span className="font-mono text-xs text-shielded">eSIM delivered</span>
          </div>
          <div className="font-mono text-[11px] text-mist-dim">{ESIM_LABEL.value}</div>
          {order.redemption_info?.code && (
            <div className="mt-2 font-mono text-xs text-mist break-all">
              code: <span className="text-signal">{order.redemption_info.code}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        {stage === 'done' && invoice && (
          <a
            href={`https://www.bitrefill.com/checkout/${invoice.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-signal text-ink font-mono text-xs px-4 py-2 rounded-full hover:bg-signal/90 transition-colors"
          >
            View transaction
            <ICON.externalLink size={13} />
          </a>
        )}
        {(stage === 'done' || stage === 'error') && (
          <button
            onClick={onClose}
            className="border border-line text-mist-dim font-mono text-xs px-4 py-2 rounded-full hover:text-mist transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </Modal>
  )
}

function GmailCard() {
  const { sources, markSourceConnected, markSourceIdle } = useLifeOS()
  const source = sources.find((s) => s.id === GMAIL_SOURCE_ID)
  const [email, setEmail] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<Trip | null>(null)
  const [bookingEmail, setBookingEmail] = useState<Email | null>(null)
  const pollRef = useRef<number | null>(null)
  const handledRef = useRef<Set<string>>(new Set())
  const bookingOpenRef = useRef(false)

  const connected = source?.status === 'connected'

  // Rehydrate connection state from the backend (survives page refresh).
  useEffect(() => {
    let cancelled = false
    gmailApi
      .getStatus()
      .then((s) => {
        if (cancelled) return
        if (s.connected) {
          setEmail(s.email)
          markSourceConnected(GMAIL_SOURCE_ID, 0)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep a ref in sync so the poller never opens a second dialog over an open one.
  useEffect(() => {
    bookingOpenRef.current = booking !== null
  }, [booking])

  // Poll the inbox every 5s while connected. Each source email fires the booking
  // flow at most once (persisted in localStorage), so it never loops.
  useEffect(() => {
    if (!connected) return
    handledRef.current = loadHandled()

    async function poll() {
      if (bookingOpenRef.current) return
      try {
        const res = await gmailApi.fetchEmails(5, true)
        const t = res.trip
        const id = t?.source_email_id ?? null
        if (t?.actionable && id && !handledRef.current.has(id) && !bookingOpenRef.current) {
          handledRef.current.add(id)
          saveHandled(handledRef.current)
          bookingOpenRef.current = true
          const src = res.emails.find((e) => e.id === id) ?? null
          setBookingEmail(src)
          setBooking(t)
        }
      } catch {
        /* transient — keep polling */
      }
    }

    poll() // immediate first check
    pollRef.current = window.setInterval(poll, 5000)
    return () => {
      clearInterval(pollRef.current ?? undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  async function connect() {
    setError(null)
    setConnecting(true)
    let popup: Window | null = null
    try {
      const { auth_url } = await gmailApi.getAuthUrl()
      popup = window.open(auth_url, 'gmail-oauth', 'width=500,height=680')
    } catch (e) {
      setConnecting(false)
      setError(e instanceof Error ? e.message : 'Could not start Google sign-in')
      return
    }

    function onMessage(ev: MessageEvent) {
      const data = ev.data
      if (!data || typeof data !== 'object' || data.type !== 'gmail-oauth') return
      window.removeEventListener('message', onMessage)
      setConnecting(false)
      if (data.ok) {
        setEmail(typeof data.email === 'string' ? data.email : null)
        markSourceConnected(GMAIL_SOURCE_ID, 0)
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Authorization failed')
      }
      popup?.close()
    }
    window.addEventListener('message', onMessage)
  }

  async function disconnect() {
    clearInterval(pollRef.current ?? undefined)
    bookingOpenRef.current = false
    try {
      await gmailApi.disconnect()
    } catch {
      /* ignore — clear locally regardless */
    }
    markSourceIdle(GMAIL_SOURCE_ID)
    setEmail(null)
    setBooking(null)
    setBookingEmail(null)
  }

  return (
    <Card glow={connected ? 'shielded' : 'none'} className="p-5 md:col-span-2">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <BrandIcon slug="gmail" size={28} className="rounded" />
          <div>
            <div className="font-display text-lg text-mist">Gmail</div>
            {connected ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-shielded animate-pulse" />
                <span className="font-mono text-xs text-shielded">Active</span>
              </div>
            ) : (
              <StatusPill status={source?.status ?? 'idle'} />
            )}
            {connected && email && (
              <div className="font-mono text-xs text-mist-dim mt-1">{email}</div>
            )}
          </div>
        </div>
        <span className="font-mono text-[10px] text-shielded border border-shielded/30 rounded px-2 py-0.5">
          REAL · GOOGLE OAUTH
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="font-mono text-xs text-mist-dim bg-ink-3 border border-line rounded px-2 py-0.5">
          gmail.readonly
        </span>
        <span className="font-mono text-xs text-mist-dim/70 bg-ink-3 border border-line rounded px-2 py-0.5">
          read-only · no send
        </span>
      </div>

      {error && (
        <div className="font-mono text-xs text-alert bg-alert/10 border border-alert/30 rounded px-3 py-2 mb-3">
          {error}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        {!connected ? (
          <button
            onClick={connect}
            disabled={connecting}
            className="bg-signal/10 text-signal border border-signal/30 font-mono text-xs px-4 py-2 rounded-full hover:bg-signal/20 transition-colors disabled:opacity-50"
          >
            {connecting ? 'Opening Google…' : 'Connect Gmail'}
          </button>
        ) : (
          <>
            <span className="font-mono text-xs text-mist-dim flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
              Watching inbox for booking confirmations…
            </span>
            <button
              onClick={disconnect}
              className="ml-auto bg-alert/10 text-alert border border-alert/30 font-mono text-xs px-3 py-1.5 rounded-full hover:bg-alert/20 transition-colors"
            >
              Revoke
            </button>
          </>
        )}
      </div>

      {booking && (
        <BookingFlowModal
          trip={booking}
          email={bookingEmail}
          onClose={() => setBooking(null)}
        />
      )}
    </Card>
  )
}

export function ConnectedSources() {
  const { sources, revoke } = useLifeOS()
  const [connectingProvider, setConnectingProvider] = useState<SourceProvider | null>(null)

  const connectingSource = sources.find((s) => s.provider === connectingProvider)

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-mist mb-2">Connected Sources</h1>
        <p className="font-body text-sm text-mist-dim max-w-2xl">
          Life OS requests only the narrowest practical permission. Scopes are shown below.
          You can revoke any connection at any time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => {
          if (source.provider === 'gmail') {
            return <GmailCard key={source.id} />
          }
          const isConnected = source.status === 'connected'
          const isActive = source.status === 'authorizing' || source.status === 'importing'
          const hasError = source.status === 'error'

          return (
            <Card
              key={source.id}
              glow={isConnected ? 'shielded' : hasError ? 'none' : 'none'}
              className="p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <BrandIcon slug={source.brand} size={28} className="rounded" />
                  <div>
                    <div className="font-display text-lg text-mist">{source.label}</div>
                    <StatusPill status={source.status} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {source.grantedScopes.map((scope) => (
                  <span
                    key={scope}
                    className="font-mono text-xs text-mist-dim bg-ink-3 border border-line rounded px-2 py-0.5"
                  >
                    {scope}
                  </span>
                ))}
              </div>

              {source.lastSyncAt && (
                <div className="font-mono text-xs text-mist-dim mb-2">
                  Last sync: {new Date(source.lastSyncAt).toLocaleString()}
                </div>
              )}

              {source.importedCount > 0 && (
                <div className="font-mono text-xs text-mist-dim mb-3">
                  <AnimatedCounter value={source.importedCount} suffix=" records imported" />
                </div>
              )}

              <div className="mt-3">
                {isActive ? (
                  <div className="flex items-center gap-2 font-mono text-xs text-mist-dim">
                    <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                    {source.status === 'authorizing' ? 'Authorizing...' : 'Importing...'}
                  </div>
                ) : isConnected ? (
                  <button
                    onClick={() => revoke(source.id)}
                    className="bg-alert/10 text-alert border border-alert/30 font-mono text-xs px-3 py-1.5 rounded-full hover:bg-alert/20 transition-colors"
                  >
                    Revoke
                  </button>
                ) : (
                  <button
                    onClick={() => setConnectingProvider(source.provider)}
                    className="bg-signal/10 text-signal border border-signal/30 font-mono text-xs px-4 py-2 rounded-full hover:bg-signal/20 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {connectingProvider && connectingSource && (
        <ConnectModal
          provider={connectingProvider}
          label={connectingSource.label}
          onClose={() => setConnectingProvider(null)}
        />
      )}
    </div>
  )
}
