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
