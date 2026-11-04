'use client'

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import {
  SEED_SOURCES,
  SEED_SUBSCRIPTIONS,
  SEED_PURCHASES,
  SEED_EVENTS,
  SEED_ROUTINES,
  SEED_MEMORIES,
  SEED_POLICY,
  SEED_TRIGGERS,
  simulateConnect,
  createTriggerClock,
  simulateShieldedPayment,
  evaluatePolicy,
} from '../lib/mock'
import type {
  ConnectedSource,
  Subscription,
  Purchase,
  CalendarEvent,
  Routine,
  LifeMemory,
  TriggerRule,
  ActionIntent,
  AutonomyPolicy,
  AuditEvent,
  Transaction,
  SourceProvider,
  SourceStatus,
  PipelineStatus,
} from '../lib/mock'

// ─── State ────────────────────────────────────────────────────────────────────

interface LifeOSState {
  sources: ConnectedSource[]
  subscriptions: Subscription[]
  purchases: Purchase[]
  calendarEvents: CalendarEvent[]
  routines: Routine[]
  memories: LifeMemory[]
  triggerRules: TriggerRule[]
  intents: ActionIntent[]
  policy: AutonomyPolicy
  auditEvents: AuditEvent[]
  transaction: Transaction | null
  killSwitch: boolean
}

const initialState: LifeOSState = {
  sources: SEED_SOURCES,
  subscriptions: SEED_SUBSCRIPTIONS,
  purchases: SEED_PURCHASES,
  calendarEvents: SEED_EVENTS,
  routines: SEED_ROUTINES,
  memories: SEED_MEMORIES,
  triggerRules: SEED_TRIGGERS,
  intents: [],
  policy: SEED_POLICY,
  auditEvents: [],
  transaction: null,
  killSwitch: false,
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_SOURCE_STATUS'; id: string; status: SourceStatus; importedCount?: number }
  | { type: 'SOURCE_CONNECTED'; id: string; lastSyncAt: string; importedCount: number }
  | { type: 'ADD_INTENT'; intent: ActionIntent }
  | { type: 'UPDATE_INTENT'; id: string; patch: Partial<ActionIntent> }
  | { type: 'UPDATE_POLICY'; patch: Partial<AutonomyPolicy> }
  | { type: 'ADD_AUDIT'; event: AuditEvent }
  | { type: 'TOGGLE_KILL_SWITCH' }
  | { type: 'UPDATE_TX'; tx: Partial<Transaction> & Pick<Transaction, 'id'> }
  | { type: 'SET_TX'; tx: Transaction }
  | { type: 'RESET_TX' }

function reducer(state: LifeOSState, action: Action): LifeOSState {
  switch (action.type) {
    case 'SET_SOURCE_STATUS':
      return {
        ...state,
        sources: state.sources.map((s) =>
          s.id === action.id
            ? {
                ...s,
                status: action.status,
                importedCount: action.importedCount ?? s.importedCount,
              }
            : s
        ),
      }

    case 'SOURCE_CONNECTED':
      return {
        ...state,
        sources: state.sources.map((s) =>
          s.id === action.id
            ? { ...s, status: 'connected', lastSyncAt: action.lastSyncAt, importedCount: action.importedCount }
            : s
        ),
      }

    case 'ADD_INTENT':
      return { ...state, intents: [action.intent, ...state.intents] }

    case 'UPDATE_INTENT':
      return {
        ...state,
        intents: state.intents.map((i) =>
          i.id === action.id ? { ...i, ...action.patch } : i
        ),
      }

    case 'UPDATE_POLICY':
      return { ...state, policy: { ...state.policy, ...action.patch } }

    case 'ADD_AUDIT':
      return { ...state, auditEvents: [action.event, ...state.auditEvents] }

    case 'TOGGLE_KILL_SWITCH':
      return { ...state, killSwitch: !state.killSwitch }

    case 'UPDATE_TX':
      return {
        ...state,
        transaction:
          state.transaction && state.transaction.id === action.tx.id
            ? { ...state.transaction, ...action.tx }
            : state.transaction,
      }

    case 'SET_TX':
      return { ...state, transaction: action.tx }

    case 'RESET_TX':
      return { ...state, transaction: null }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

export type TabId =
  | 'agent' | 'sources' | 'graph' | 'triggers'
  | 'policy' | 'commerce' | 'payment' | 'audit'

export type AgentPrompt = { prompt: string; nonce: number }

interface LifeOSContextValue extends LifeOSState {
  connect: (provider: SourceProvider) => Promise<void>
  revoke: (id: string) => void
  updatePolicy: (patch: Partial<AutonomyPolicy>) => void
  toggleKillSwitch: () => void
  runTrigger: (triggerId: string) => void
  runPayment: () => void
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  agentPrompt: AgentPrompt | null
  triggerAgent: (prompt: string) => void
  consumeAgentPrompt: () => void
  markSourceConnected: (id: string, importedCount: number) => void
  markSourceIdle: (id: string) => void
}

const LifeOSContext = createContext<LifeOSContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LifeOSProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const paymentCleanupRef = useRef<(() => void) | null>(null)
  const [activeTab, setActiveTab] = React.useState<TabId>('agent')
  const [agentPrompt, setAgentPrompt] = React.useState<AgentPrompt | null>(null)

  function triggerAgent(prompt: string): void {
    setAgentPrompt({ prompt, nonce: Date.now() })
    setActiveTab('agent')
  }

  function consumeAgentPrompt(): void {
    setAgentPrompt(null)
  }

  function markSourceConnected(id: string, importedCount: number): void {
    dispatch({ type: 'SOURCE_CONNECTED', id, lastSyncAt: new Date().toISOString(), importedCount })
  }

  function markSourceIdle(id: string): void {
    dispatch({ type: 'SET_SOURCE_STATUS', id, status: 'idle', importedCount: 0 })
  }

  // Source lookup by provider
  function sourceIdForProvider(provider: SourceProvider): string {
    return state.sources.find((s) => s.provider === provider)?.id ?? `src-${provider}`
  }

  async function connect(provider: SourceProvider): Promise<void> {
    const id = sourceIdForProvider(provider)
    await simulateConnect(provider, {
      onStatus: (status: SourceStatus) => {
        dispatch({ type: 'SET_SOURCE_STATUS', id, status })
      },
      onImportProgress: (count: number) => {
        dispatch({ type: 'SET_SOURCE_STATUS', id, status: 'importing', importedCount: count })
      },
      onComplete: () => {
        dispatch({
          type: 'SOURCE_CONNECTED',
          id,
          lastSyncAt: new Date().toISOString(),
          importedCount: state.sources.find((s) => s.id === id)?.importedCount ?? 0,
        })
      },
    })
  }

  function revoke(id: string): void {
    dispatch({ type: 'SET_SOURCE_STATUS', id, status: 'idle', importedCount: 0 })
    dispatch({
      type: 'ADD_AUDIT',
      event: {
        id: `audit-revoke-${Date.now()}`,
        actor: 'user',
        action: 'revoke_source',
        reason: 'User revoked data source',
        timestamp: new Date().toISOString(),
        result: 'success',
      },
    })
  }

  function updatePolicy(patch: Partial<AutonomyPolicy>): void {
    dispatch({ type: 'UPDATE_POLICY', patch })
  }

  function toggleKillSwitch(): void {
    dispatch({ type: 'TOGGLE_KILL_SWITCH' })
  }

  function runTrigger(triggerId: string): void {
    const rule = state.triggerRules.find((r) => r.id === triggerId)
    if (!rule) return

    const isTravelTrigger = triggerId === 'trig-travel'
    const amount = isTravelTrigger ? 9 : undefined
    const merchant = isTravelTrigger ? 'bitrefill' : undefined
    const category = isTravelTrigger ? 'esim' : undefined

    const policyEval =
      amount !== undefined && merchant !== undefined && category !== undefined
        ? evaluatePolicy(amount, merchant, category, state.policy)
        : { result: 'allowed' as const, reason: 'no purchase required' }

    const status: PipelineStatus =
      policyEval.result === 'allowed' ? 'authorized' : 'blocked'

    const intent: ActionIntent = {
      id: `intent-manual-${triggerId}-${Date.now()}`,
      triggerId,
      triggerDescription: rule.description,
      proposedAction: isTravelTrigger
        ? 'Purchase Airalo SG 3GB eSIM via Bitrefill'
        : `Handle ${rule.eventType}`,
      ...(isTravelTrigger && { productName: 'Airalo SG 3GB', amount: 9, currency: 'USD' }),
      policyResult: policyEval.result,
      policyReason: policyEval.reason,
      status,
      createdAt: new Date().toISOString(),
    }

    dispatch({ type: 'ADD_INTENT', intent })
    dispatch({
      type: 'ADD_AUDIT',
      event: {
        id: `audit-trigger-${Date.now()}`,
        actor: 'system',
        action: 'trigger_fired',
        reason: rule.description,
        triggerId,
        ...(amount !== undefined && { amount, currency: 'USD' }),
        timestamp: new Date().toISOString(),
        result: policyEval.result === 'allowed' ? 'success' : 'blocked',
      },
    })
  }

  function runPayment(): void {
    const authorizedIntent = state.intents.find(
      (i) => i.status === 'authorized' && i.amount !== undefined
    )
    if (!authorizedIntent || authorizedIntent.amount === undefined) return

    const orderId = `order-${Date.now()}`

    paymentCleanupRef.current?.()
    paymentCleanupRef.current = simulateShieldedPayment(
      authorizedIntent.amount,
      orderId,
      {
        onStatus: (shieldedStatus, tx) => {
          if (shieldedStatus === 'intent') {
            dispatch({ type: 'SET_TX', tx: tx as Transaction })
          } else {
            dispatch({
              type: 'UPDATE_TX',
              tx: { id: tx.id ?? orderId, shieldedStatus } as Partial<Transaction> & Pick<Transaction, 'id'>,
            })
          }
          dispatch({
            type: 'UPDATE_INTENT',
            id: authorizedIntent.id,
            patch: { status: shieldedStatus === 'settled' ? 'executed' : 'authorized' },
          })
        },
        onComplete: (finalTx) => {
          dispatch({ type: 'SET_TX', tx: finalTx })
          dispatch({
            type: 'ADD_AUDIT',
            event: {
              id: `audit-payment-${Date.now()}`,
              actor: 'system',
              action: 'payment_settled',
              reason: 'Shielded ZEC payment settled on testnet',
              triggerId: authorizedIntent.triggerId,
              amount: authorizedIntent.amount,
              currency: authorizedIntent.currency,
              paymentRef: finalTx.paymentRef,
              fulfillmentStatus: 'fulfilled',
              timestamp: new Date().toISOString(),
              result: 'success',
            },
          })
        },
      }
    )
  }

  // Start the trigger clock; re-create when killSwitch changes
  useEffect(() => {
    const clock = createTriggerClock(
      (intent) => dispatch({ type: 'ADD_INTENT', intent }),
      state.policy,
      state.killSwitch
    )
    clock.start()
    return () => clock.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.killSwitch])

  // Cleanup payment timers on unmount
  useEffect(() => () => { paymentCleanupRef.current?.() }, [])

  const value: LifeOSContextValue = {
    ...state,
    connect,
    revoke,
    updatePolicy,
    toggleKillSwitch,
    runTrigger,
    runPayment,
    activeTab,
    setActiveTab,
    agentPrompt,
    triggerAgent,
    consumeAgentPrompt,
    markSourceConnected,
    markSourceIdle,
  }

  return <LifeOSContext.Provider value={value}>{children}</LifeOSContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLifeOS(): LifeOSContextValue {
  const ctx = useContext(LifeOSContext)
  if (!ctx) throw new Error('useLifeOS must be used within <LifeOSProvider>')
  return ctx
}
