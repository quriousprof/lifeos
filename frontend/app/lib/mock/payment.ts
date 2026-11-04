import type { ShieldedStatus, Transaction } from './types'

type PaymentCallbacks = {
  onStatus: (status: ShieldedStatus, tx: Partial<Transaction>) => void
  onComplete: (tx: Transaction) => void
}

function randomHex(length: number): string {
  let result = ''
  while (result.length < length) {
    result += Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  }
  return result.slice(0, length)
}

export function simulateShieldedPayment(
  amount: number,
  orderId: string,
  callbacks: PaymentCallbacks
): () => void {
  const address = `ztestsapling1${randomHex(76)}`
  const txId = randomHex(64)
  const paymentRef = `pay-${Date.now()}`
  const txBase = amount / 150
  const zip321Request = `zcash:${address}?amount=${txBase.toFixed(8)}&memo=LifeOS%20eSIM%20order%20${orderId}`
  const label = `LifeOS eSIM — order ${orderId}`

  const timers: NodeJS.Timeout[] = []

  const intentTx: Partial<Transaction> = {
    id: paymentRef,
    paymentRef,
    asset: 'ZEC',
    amount,
    network: 'testnet',
    shieldedStatus: 'intent',
    orderId,
    reconciliationStatus: 'pending',
    txId,
    zip321Request,
    label,
  }

  callbacks.onStatus('intent', intentTx)

  timers.push(
    setTimeout(() => {
      callbacks.onStatus('broadcast', { ...intentTx, shieldedStatus: 'broadcast' })
    }, 1500)
  )

  timers.push(
    setTimeout(() => {
      callbacks.onStatus('mined', { ...intentTx, shieldedStatus: 'mined' })
    }, 3500)
  )

  timers.push(
    setTimeout(() => {
      callbacks.onStatus('confirmed', { ...intentTx, shieldedStatus: 'confirmed' })
    }, 5500)
  )

  timers.push(
    setTimeout(() => {
      const finalTx: Transaction = {
        id: paymentRef,
        paymentRef,
        asset: 'ZEC',
        amount,
        network: 'testnet',
        shieldedStatus: 'settled',
        orderId,
        reconciliationStatus: 'confirmed',
        txId,
        zip321Request,
        label,
      }
      callbacks.onStatus('settled', finalTx)
      callbacks.onComplete(finalTx)
    }, 8000)
  )

  return () => timers.forEach((t) => clearTimeout(t))
}
