import type { IconKey } from '@/app/lib/icons'

export type SourceProvider = 'gmail' | 'calendar' | 'bitrefill' | 'manual'
export type SourceStatus = 'idle' | 'authorizing' | 'importing' | 'connected' | 'error'
export type PipelineStatus = 'proposed' | 'policy_check' | 'authorized' | 'executed' | 'blocked' | 'failed'
export type ShieldedStatus = 'intent' | 'broadcast' | 'mined' | 'confirmed' | 'settled'

export interface ConnectedSource {
  id: string; provider: SourceProvider; status: SourceStatus
  grantedScopes: string[]; lastSyncAt: string | null; importedCount: number
  label: string; brand: string
}
export interface LifeMemory {
  id: string; type: string; label: string; value: string
  sourceId: string; confidence: number; observedAt: string
  sensitivity: 'low' | 'medium' | 'high'
}
export interface Subscription {
  id: string; provider: string; plan: string; amount: number; currency: string
  cadence: 'monthly' | 'annual'; nextRenewalEstimate: string
  status: 'active' | 'cancelled'; confidence: number; sourceId: string
}
export interface Purchase {
  id: string; merchant: string; orderRef: string; product: string
  quantity: number; amount: number; currency: string
  purchasedAt: string; deliveryStatus: string; sourceId: string
}
export interface CalendarEvent {
  id: string; title: string; startAt: string; endAt: string
  location?: string; sourceId: string; type: 'travel' | 'meeting' | 'personal'
}
export interface Routine {
  id: string; routineType: string; item: string
  estimatedInterval: number; lastObservedAt: string; confidence: number
}
export interface TriggerRule {
  id: string; eventType: string; description: string
  conditions: Record<string, unknown>; enabled: boolean; cooldown: number
  iconKey: IconKey
}
export interface AutonomyPolicy {
  perTxLimit: number; monthlyBudget: number; monthlySpent: number
  merchantAllowlist: string[]; categoryAllowlist: string[]
  approvalMode: 'auto' | 'conditional' | 'manual'
}
export interface ActionIntent {
  id: string; triggerId: string; triggerDescription: string
  proposedAction: string; productName?: string
  amount?: number; currency?: string
  policyResult: 'allowed' | 'blocked' | 'pending'; policyReason?: string
  status: PipelineStatus; createdAt: string
}
export interface Transaction {
  id: string; paymentRef: string; asset: 'ZEC'; amount: number
  network: 'testnet'; shieldedStatus: ShieldedStatus
  orderId?: string; reconciliationStatus: 'pending' | 'confirmed' | 'failed'
  txId: string; zip321Request: string; label: string
}
export interface AuditEvent {
  id: string; actor: string; action: string; reason: string
  triggerId?: string; amount?: number; currency?: string
  paymentRef?: string; fulfillmentStatus?: string
  timestamp: string; result: 'success' | 'blocked' | 'simulated'
}
export interface BitrefillProduct {
  id: string; name: string; country: string; operator: string
  type: 'esim' | 'giftcard' | 'topup'
  denominations: number[]; currency: string
  description: string; popular?: boolean
}
