'use client'

import React, { useState, useEffect } from 'react'
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

function GmailCard() {
  const { sources, markSourceConnected, markSourceIdle, triggerAgent } = useLifeOS()
  const source = sources.find((s) => s.id === GMAIL_SOURCE_ID)
  const [email, setEmail] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [emails, setEmails] = useState<Email[]>([])
  const [trip, setTrip] = useState<Trip | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          markSourceConnected(GMAIL_SOURCE_ID, emails.length)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  async function fetchEmails() {
    setError(null)
    setFetching(true)
    setTrip(null)
    try {
      const res = await gmailApi.fetchEmails(5)
      setEmails(res.emails)
      setTrip(res.trip)
      markSourceConnected(GMAIL_SOURCE_ID, res.emails.length)
      if (res.trip?.actionable) {
        triggerAgent(`I'm travelling to ${res.trip.destination ?? 'Singapore'}, buy me an eSIM`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setFetching(false)
    }
  }

  async function disconnect() {
    try {
      await gmailApi.disconnect()
    } catch {
      /* ignore — clear locally regardless */
    }
    markSourceIdle(GMAIL_SOURCE_ID)
    setEmail(null)
    setEmails([])
    setTrip(null)
  }

  const CheckCircle = ICON.checkCircle
  const Mail = ICON.sources
  const Plane = ICON.travel

  return (
    <Card glow={connected ? 'shielded' : 'none'} className="p-5 md:col-span-2">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <BrandIcon slug="gmail" size={28} className="rounded" />
          <div>
            <div className="font-display text-lg text-mist">Gmail</div>
            <StatusPill status={source?.status ?? 'idle'} />
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

      <div className="mt-3 flex items-center gap-2">
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
            <button
              onClick={fetchEmails}
              disabled={fetching}
              className="bg-signal/10 text-signal border border-signal/30 font-mono text-xs px-4 py-2 rounded-full hover:bg-signal/20 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Mail size={12} />
              {fetching ? 'Fetching…' : 'Fetch emails'}
            </button>
            <button
              onClick={disconnect}
              className="bg-alert/10 text-alert border border-alert/30 font-mono text-xs px-3 py-1.5 rounded-full hover:bg-alert/20 transition-colors"
            >
              Revoke
            </button>
          </>
        )}
      </div>

      {trip && (
        <div
          className={
            'mt-4 rounded-lg border px-4 py-3 ' +
            (trip.actionable
              ? 'border-shielded/30 bg-shielded/5'
              : 'border-signal/30 bg-signal/5')
          }
        >
          <div className="flex items-center gap-2 font-mono text-xs text-mist">
            <Plane size={14} className={trip.actionable ? 'text-shielded' : 'text-signal'} weight="fill" />
            <span>
              {trip.origin ?? '—'} → {trip.destination ?? '—'}
              {trip.date_raw ? ` · ${trip.date_raw}` : ''}
            </span>
          </div>
          <div className="font-mono text-[11px] text-mist-dim mt-1">
            keywords: {trip.matched_keywords.join(', ') || '—'}
          </div>
          <div className="font-mono text-[11px] mt-1">
            {trip.actionable ? (
              <span className="text-shielded">Trip detected → eSIM pipeline triggered in Agent tab.</span>
            ) : (
              <span className="text-mist-dim">eSIM purchase only wired for Singapore in this demo.</span>
            )}
          </div>
        </div>
      )}

      {emails.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="font-mono text-[11px] text-mist-dim uppercase tracking-wider">
            Latest {emails.length} emails
          </div>
          {emails.map((e) => (
            <div key={e.id} className="border border-line rounded-lg px-3 py-2 bg-ink-3/50">
              <div className="flex items-center justify-between gap-3">
                <span className="font-body text-sm text-mist truncate">{e.subject || '(no subject)'}</span>
                <span className="font-mono text-[10px] text-mist-dim shrink-0">{e.date}</span>
              </div>
              <div className="font-mono text-[11px] text-mist-dim truncate">{e.sender}</div>
              <div className="font-body text-xs text-mist-dim/80 mt-1 line-clamp-2">{e.snippet}</div>
            </div>
          ))}
        </div>
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
