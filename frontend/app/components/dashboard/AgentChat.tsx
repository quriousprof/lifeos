'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import api, { type InvoiceView, type OrderView } from '@/app/lib/api'
import { Badge } from '@/app/components/ui/Badge'
import { ICON } from '@/app/lib/icons'

// ── Types ─────────────────────────────────────────────────────────────────────

type PolicyCheck = { label: string; pass: boolean; detail: string }

type AgentStep =
  | { kind: 'proposing' }
  | { kind: 'policy'; result: 'allowed' | 'blocked'; reason: string; checks: PolicyCheck[] }
  | { kind: 'executing'; phase: number } // 0-3
  | { kind: 'result'; invoice: InvoiceView; order: OrderView }
  | { kind: 'error'; message: string }

type Message =
  | { id: string; role: 'user'; text: string; ts: Date }
  | { id: string; role: 'agent'; steps: AgentStep[]; ts: Date }

const PRESET = "I'm travelling to Singapore, buy me an eSIM"
const ESIM_DISPLAY = { name: 'Airalo Singapore eSIM 3GB', value: '3GB · 30 days · 5G', price: '$9.00' }

const EXEC_PHASES = [
  'Connecting to Bitrefill',
  'Creating invoice',
  'Processing payment',
  'Confirming delivery',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }
function wait(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

// ── Step renderers ────────────────────────────────────────────────────────────

function StepProposing() {
  const Robot = ICON.propose
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 bg-signal/5 border border-signal/20 rounded-xl px-4 py-3"
    >
      <Robot size={15} className="text-signal mt-0.5 shrink-0" />
      <div>
        <p className="font-mono text-xs text-signal">PROPOSING PURCHASE</p>
        <p className="font-body text-sm text-mist mt-0.5">{ESIM_DISPLAY.name}</p>
        <p className="font-mono text-xs text-mist-dim">{ESIM_DISPLAY.value} · {ESIM_DISPLAY.price} · via Bitrefill</p>
      </div>
      <span className="ml-auto font-mono text-xs text-mist-dim animate-pulse">thinking…</span>
    </motion.div>
  )
}

function StepPolicy({ step }: { step: Extract<AgentStep, { kind: 'policy' }> }) {
  const Check = ICON.checkCircle
  const Cross = ICON.crossCircle
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      <p className="font-mono text-xs text-mist-dim uppercase tracking-widest">Policy check</p>
      {step.checks.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
          className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border ${c.pass ? 'bg-shielded/5 border-shielded/20' : 'bg-alert/5 border-alert/20'}`}
        >
          {c.pass
            ? <Check size={14} className="text-shielded shrink-0" />
            : <Cross size={14} className="text-alert shrink-0" />}
          <span className="font-mono text-xs text-mist">{c.label}</span>
          <span className="font-mono text-xs text-mist-dim ml-auto">{c.detail}</span>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: step.checks.length * 0.15 + 0.1 }}
        className={`inline-flex items-center gap-2 font-mono text-xs font-bold px-4 py-2 rounded-full border ${
          step.result === 'allowed'
            ? 'bg-shielded/10 border-shielded/40 text-shielded'
            : 'bg-alert/10 border-alert/40 text-alert'
        }`}
      >
        {step.result === 'allowed' ? '✓ POLICY PASSED' : `✗ BLOCKED · ${step.reason}`}
      </motion.div>
    </motion.div>
  )
}

function StepExecuting({ phase }: { phase: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="bg-shielded/5 border border-shielded/20 rounded-xl px-5 py-4 space-y-2.5"
    >
      {EXEC_PHASES.map((label, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0 }} animate={{ opacity: i <= phase ? 1 : 0.25 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center gap-3"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            i < phase ? 'bg-shielded' : i === phase ? 'bg-signal animate-pulse' : 'bg-mist-dim/30'
          }`} />
          <span className={`font-mono text-xs ${i <= phase ? 'text-mist' : 'text-mist-dim/40'}`}>{label}</span>
          {i < phase && <span className="ml-auto font-mono text-[10px] text-shielded">done</span>}
          {i === phase && <span className="ml-auto font-mono text-[10px] text-signal animate-pulse">•••</span>}
        </motion.div>
      ))}
    </motion.div>
  )
}

function StepResult({ step }: { step: Extract<AgentStep, { kind: 'result' }> }) {
  const [copied, setCopied] = useState(false)
  const Check = ICON.checkCircle
  const Copy = ICON.copy
  const Ext = ICON.externalLink
  const code = step.order.redemption_info?.code ?? ''
  const orderId = step.order.id
  const invoiceId = step.invoice.id

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="bg-gradient-to-br from-shielded/8 to-shielded/3 border-2 border-shielded/30 rounded-2xl p-6 space-y-5 shadow-[0_0_40px_rgba(53,201,165,0.08)]"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Check size={20} className="text-shielded shrink-0" />
        <span className="font-mono text-sm text-shielded font-bold tracking-wide">ORDER FULFILLED</span>
        <Badge variant="shielded" size="sm">DELIVERED</Badge>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {[
          ['Product', ESIM_DISPLAY.name],
          ['Plan', ESIM_DISPLAY.value],
          ['Invoice', invoiceId.slice(0, 8) + '…'],
          ['Order', orderId.slice(0, 8) + '…'],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="font-mono text-[10px] text-mist-dim uppercase tracking-widest">{k}</p>
            <p className="font-mono text-xs text-mist mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      {/* Redemption code */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] text-shielded uppercase tracking-widest">Redemption Code</p>
        <div className="bg-ink rounded-xl border border-shielded/30 px-5 py-4 flex items-center justify-between gap-4">
          <span className="font-mono text-lg text-shielded tracking-widest break-all">{code}</span>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 font-mono text-xs text-mist-dim hover:text-mist border border-line hover:border-mist/30 rounded-lg px-3 py-1.5 transition-all shrink-0"
          >
            <Copy size={12} />
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-3 pt-1">
        <a
          href={`https://www.bitrefill.com/account/orders/${orderId}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-shielded text-ink font-mono font-bold text-sm px-6 py-2.5 rounded-full hover:bg-shielded/90 transition-all"
        >
          View Txn
          <Ext size={14} />
        </a>
        <p className="font-mono text-xs text-mist-dim">
          Invoice: <span className="text-mist">{invoiceId.slice(0, 13)}…</span>
        </p>
      </div>
    </motion.div>
  )
}

function StepError({ message }: { message: string }) {
  const Warn = ICON.warning
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 bg-alert/5 border border-alert/20 rounded-xl px-4 py-3"
    >
      <Warn size={15} className="text-alert shrink-0 mt-0.5" />
      <p className="font-body text-sm text-alert">{message}</p>
    </motion.div>
  )
}

// ── Agent message bubble ──────────────────────────────────────────────────────

function AgentBubble({ msg }: { msg: Extract<Message, { role: 'agent' }> }) {
  const Sparkle = ICON.sparkle
  const isTyping = msg.steps.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -16, y: 8 }} animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="max-w-2xl bg-ink-2 border border-line rounded-2xl rounded-tl-sm"
    >
      {/* Bubble header */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-line/50">
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-1.5 h-1.5 rounded-full bg-signal shrink-0"
        />
        <Sparkle size={12} className="text-signal" />
        <span className="font-mono text-xs text-signal">LIFE OS</span>
        <span className="font-mono text-xs text-mist-dim ml-auto">
          {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Steps */}
      <div className="px-5 py-4 space-y-4">
        {isTyping && (
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.span
                key={i} className="w-1.5 h-1.5 rounded-full bg-mist-dim"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}
        {msg.steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            {step.kind === 'proposing'  && <StepProposing />}
            {step.kind === 'policy'     && <StepPolicy step={step} />}
            {step.kind === 'executing'  && <StepExecuting phase={step.phase} />}
            {step.kind === 'result'     && <StepResult step={step} />}
            {step.kind === 'error'      && <StepError message={step.message} />}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function UserBubble({ msg }: { msg: Extract<Message, { role: 'user' }> }) {
  const Plane = ICON.travel
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, y: 8 }} animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="max-w-md ml-auto"
    >
      <div className="bg-ink-3 border border-signal/20 rounded-2xl rounded-tr-sm px-5 py-3">
        <p className="font-body text-sm text-mist">{msg.text}</p>
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-1 pr-1">
        <Plane size={10} className="text-signal" />
        <span className="font-mono text-[10px] text-mist-dim">
          {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const Sparkle = ICON.sparkle
  const ArrowRight = ICON.arrowRight

  // scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // mutate agent message steps in-place and force re-render via setMessages
  const pushStep = useCallback((agentMsgId: string, step: AgentStep) => {
    setMessages(prev => prev.map(m =>
      m.id === agentMsgId && m.role === 'agent'
        ? { ...m, steps: [...m.steps, step] }
        : m
    ))
  }, [])

  const replaceLastStep = useCallback((agentMsgId: string, step: AgentStep) => {
    setMessages(prev => prev.map(m =>
      m.id === agentMsgId && m.role === 'agent'
        ? { ...m, steps: [...m.steps.slice(0, -1), step] }
        : m
    ))
  }, [])

  const runFlow = useCallback(async (text: string) => {
    if (loading) return
    const userMsg: Message = { id: uid(), role: 'user', text, ts: new Date() }
    const agentId = uid()
    const agentMsg: Message = { id: agentId, role: 'agent', steps: [], ts: new Date() }
    setMessages(prev => [...prev, userMsg, agentMsg])
    setLoading(true)

    try {
      // 1. Proposing
      await wait(400)
      pushStep(agentId, { kind: 'proposing' })

      // 2. Call propose
      await wait(600)
      const intent = await api.proposeIntent({
        product_id: 'test-gift-card-code',
        value: 10,
        quantity: 1,
        merchant: 'bitrefill',
        category: 'gift_card',
        amount_usd: 10,
        trigger: 'chat',
        intent: 'Singapore travel eSIM via chat',
      })

      // 3. Policy check — build 3 rows from the actual result
      const policyAllowed = intent.policy_result === 'allowed'
      const reason = intent.policy_reason ?? ''
      const capBlocked  = reason.includes('per-transaction') || reason.includes('limit')
      const budgetBlocked = reason.includes('budget')
      const merchantBlocked = reason.includes('merchant')
      const categoryBlocked = reason.includes('category')

      const checks: PolicyCheck[] = [
        {
          label: 'Category: gift_card',
          pass: policyAllowed || !(categoryBlocked),
          detail: categoryBlocked ? reason : 'in allowlist',
        },
        {
          label: 'Merchant: bitrefill',
          pass: policyAllowed || !merchantBlocked,
          detail: merchantBlocked ? reason : 'in allowlist',
        },
        {
          label: `Amount: $${intent.amount_usd.toFixed(2)}`,
          pass: policyAllowed || !(capBlocked || budgetBlocked),
          detail: (capBlocked || budgetBlocked) ? reason : 'within cap & budget',
        },
      ]

      await wait(300)
      pushStep(agentId, { kind: 'policy', result: intent.policy_result, reason, checks })

      if (!policyAllowed) {
        await wait(500)
        pushStep(agentId, { kind: 'error', message: reason })
        return
      }

      // 4. Execute — animate phases
      await wait(600)
      pushStep(agentId, { kind: 'executing', phase: 0 })
      await wait(500)
      replaceLastStep(agentId, { kind: 'executing', phase: 1 })

      const result = await api.executeIntent(intent.id)

      await wait(400)
      replaceLastStep(agentId, { kind: 'executing', phase: 2 })
      await wait(500)
      replaceLastStep(agentId, { kind: 'executing', phase: 3 })
      await wait(400)

      // 5. Result
      const order = result.invoice?.orders?.[0]
      if (!order || !result.invoice) {
        pushStep(agentId, { kind: 'error', message: 'No order returned from Bitrefill.' })
        return
      }
      pushStep(agentId, { kind: 'result', invoice: result.invoice, order })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error — check backend'
      pushStep(agentId, { kind: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }, [loading, pushStep, replaceLastStep])

  function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    if (text.toLowerCase().includes('singapore') || text.toLowerCase().includes('esim')) {
      runFlow(text)
    } else {
      // Generic placeholder for non-Singapore messages
      const userMsg: Message = { id: uid(), role: 'user', text, ts: new Date() }
      const agentId = uid()
      const agentMsg: Message = { id: agentId, role: 'agent', steps: [], ts: new Date() }
      setMessages(prev => [...prev, userMsg, agentMsg])
      setTimeout(() => {
        pushStep(agentId, { kind: 'error', message: 'Only the Singapore eSIM flow is wired in this demo. Try the preset below ↓' })
      }, 600)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function onTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  return (
    <div className="h-full flex flex-col bg-ink">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-ink-2 shrink-0">
        <div className="flex items-center gap-3">
          <Sparkle size={18} className="text-signal" weight="fill" />
          <h1 className="font-display text-2xl text-mist">Life OS Agent</h1>
          <Badge variant="shielded" size="sm">LIVE</Badge>
        </div>
        <span className="font-mono text-xs text-mist-dim">agentic · bitrefill · real API</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-full flex flex-col items-center justify-center gap-6 text-center"
          >
            <Sparkle size={36} className="text-signal/60" weight="duotone" />
            <p className="font-display italic text-xl text-mist-dim max-w-sm">
              Ask me anything about your life.
            </p>
            <p className="font-mono text-xs text-mist-dim/60">
              I can search products, check your policy, and execute real purchases.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            <AnimatePresence>
              {messages.map(msg =>
                msg.role === 'user'
                  ? <UserBubble key={msg.id} msg={msg} />
                  : <AgentBubble key={msg.id} msg={msg} />
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Bottom — preset + input */}
      <div className="shrink-0 border-t border-line bg-ink-2 px-6 pt-3 pb-4 space-y-3 max-w-3xl w-full self-center">

        {/* Preset pills */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="flex flex-wrap gap-2"
            >
              <button
                onClick={() => setInput(PRESET)}
                className="flex items-center gap-2 border border-signal/30 bg-signal/5 text-signal font-mono text-xs px-4 py-2 rounded-full hover:bg-signal/15 hover:border-signal/60 transition-all cursor-pointer"
              >
                <ICON.travel size={12} />
                {PRESET}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input row */}
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={onTextareaChange}
            onKeyDown={onKeyDown}
            placeholder="Ask Life OS to handle something…"
            disabled={loading}
            className="flex-1 bg-ink-3 border border-line rounded-xl px-4 py-3 font-body text-sm text-mist placeholder:text-mist-dim/50 focus:outline-none focus:border-signal/40 resize-none transition-colors disabled:opacity-50 leading-relaxed"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-signal text-ink flex items-center justify-center hover:bg-signal/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 mb-0.5"
          >
            {loading
              ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-ink/40 border-t-ink rounded-full block" />
              : <ArrowRight size={16} weight="bold" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
