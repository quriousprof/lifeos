import type { ActionIntent, AutonomyPolicy, PipelineStatus } from './types'

export function evaluatePolicy(
  amount: number,
  merchant: string,
  category: string,
  policy: AutonomyPolicy
): { result: 'allowed' | 'blocked'; reason: string } {
  if (amount > policy.perTxLimit) {
    return {
      result: 'blocked',
      reason: `exceeds per-transaction limit of $${policy.perTxLimit}`,
    }
  }

  const remaining = policy.monthlyBudget - policy.monthlySpent
  if (amount > remaining) {
    return {
      result: 'blocked',
      reason: `exceeds remaining monthly budget ($${remaining.toFixed(2)} left)`,
    }
  }

  if (!policy.merchantAllowlist.includes(merchant.toLowerCase())) {
    return {
      result: 'blocked',
      reason: `merchant "${merchant}" not in allowlist`,
    }
  }

  if (!policy.categoryAllowlist.includes(category.toLowerCase())) {
    return {
      result: 'blocked',
      reason: `category "${category}" not in allowlist`,
    }
  }

  return {
    result: 'allowed',
    reason: `within policy limits — $${amount} to ${merchant} (${category})`,
  }
}

export function createTriggerClock(
  onTrigger: (intent: Omit<ActionIntent, 'status'> & { status: PipelineStatus }) => void,
  policy: AutonomyPolicy,
  killSwitch: boolean
): { start: () => void; stop: () => void } {
  let t1: NodeJS.Timeout | undefined
  let t2: NodeJS.Timeout | undefined

  function start() {
    t1 = setTimeout(() => {
      if (killSwitch) return

      const policyEval = evaluatePolicy(9, 'bitrefill', 'esim', policy)
      const status: PipelineStatus =
        policyEval.result === 'allowed' ? 'authorized' : 'blocked'

      onTrigger({
        id: `intent-travel-${Date.now()}`,
        triggerId: 'trig-travel',
        triggerDescription: 'Travel event in 3 days — check connectivity',
        proposedAction: 'Purchase Airalo SG 3GB eSIM via Bitrefill',
        productName: 'Airalo SG 3GB',
        amount: 9,
        currency: 'USD',
        policyResult: policyEval.result,
        policyReason: policyEval.reason,
        status,
        createdAt: new Date().toISOString(),
      })
    }, 2000)

    t2 = setTimeout(() => {
      if (killSwitch) return

      onTrigger({
        id: `intent-renewal-${Date.now()}`,
        triggerId: 'trig-renewal',
        triggerDescription: 'AWS Credits renewal in 2 days',
        proposedAction: 'Review AWS Credits subscription renewal',
        policyResult: 'allowed',
        policyReason: 'subscription renewal — merchant in allowlist',
        status: 'proposed',
        createdAt: new Date().toISOString(),
      })
    }, 7000)
  }

  function stop() {
    clearTimeout(t1)
    clearTimeout(t2)
  }

  return { start, stop }
}
