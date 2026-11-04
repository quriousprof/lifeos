import type { SourceProvider, SourceStatus } from './types'

type ConnectCallbacks = {
  onStatus: (status: SourceStatus) => void
  onImportProgress: (count: number) => void
  onComplete: () => void
}

const IMPORT_COUNTS: Record<SourceProvider, number> = {
  gmail: 8,
  calendar: 2,
  bitrefill: 4,
  manual: 3,
}

export async function simulateConnect(
  provider: SourceProvider,
  callbacks: ConnectCallbacks
): Promise<void> {
  const max = IMPORT_COUNTS[provider]

  callbacks.onStatus('authorizing')
  const { promise: authPromise, resolve: authResolve } = Promise.withResolvers<void>()
  setTimeout(authResolve, 1200)
  await authPromise
  callbacks.onStatus('importing')

  const { promise: importPromise, resolve: importResolve } = Promise.withResolvers<void>()
  let count = 0
  const tick = setInterval(() => {
    count++
    callbacks.onImportProgress(count)
    if (count >= max) {
      clearInterval(tick)
      importResolve()
    }
  }, 200)
  await importPromise

  callbacks.onStatus('connected')
  callbacks.onComplete()
}
