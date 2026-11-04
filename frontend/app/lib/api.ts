// Typed fetch client for the Life OS Python backend (live Bitrefill).
// Only the commerce / policy / audit surfaces are wired to this client;
// Gmail/Calendar/OAuth/Life-Graph/trigger-clock stay mocked in LifeOSProvider.

export type Package = {
  id: string
  value: string
  amount_usd: number | null
  price_sats: number | null
}

export type Product = {
  id: string
  name: string
  country_code: string | null
  currency: string | null
  categories: string[]
  in_stock: boolean
  image: string | null
  packages: Package[]
  price_range: { min: number; max: number; step: number } | null
}

export type IntentRequest = {
  product_id: string
  package_id?: string
  value?: string | number
  quantity?: number
  merchant: string
  category: string
  amount_usd: number
  trigger?: string
  intent: string
  idempotency_key?: string
}

export type IntentView = {
  id: string
  product_id: string
  package_id: string | null
  value: string | null
  quantity: number
  merchant: string
  category: string
  amount_usd: number
  trigger: string | null
  policy_result: 'allowed' | 'blocked'
  policy_reason: string | null
  status: string
  invoice_id: string | null
  created_at: string
}

export type OrderView = {
  id: string
  status: string
  product_name: string | null
  value: string | null
  redemption_info: {
    code?: string
    link?: string
    pin?: string
    instructions?: string
  } | null
}

export type InvoiceView = {
  id: string
  status: string
  payment_status: string | null
  orders: OrderView[]
}

export type IntentResult = {
  intent: IntentView
  invoice: InvoiceView | null
}

export type Policy = {
  per_tx_limit: number
  monthly_budget: number
  monthly_spent: number
  merchant_allowlist: string[]
  category_allowlist: string[]
  approval_mode: 'auto' | 'conditional' | 'manual'
  kill_switch: boolean
}

export type AuditView = {
  id: string
  actor: string
  action: string
  reason: string
  intent_id: string | null
  amount_usd: number | null
  payment_ref: string | null
  fulfillment_status: string | null
  result: 'success' | 'blocked' | 'simulated'
  timestamp: string
}

export type Health = {
  status: string
  bitrefill: {
    configured: boolean
    reachable: boolean
    ping?: string
    balance?: { balance: number; currency: string }
  }
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type FetchOptions = {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
}

function buildUrl(path: string, query?: FetchOptions['query']): string {
  const url = new URL(path, API_BASE)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options
  const res = await fetch(buildUrl(path, query), {
    method,
    signal,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let parsed: unknown = undefined
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    if (parsed && typeof parsed === 'object' && 'detail' in parsed) {
      const d: unknown = parsed.detail
      detail = typeof d === 'string' ? d : JSON.stringify(d)
    } else if (typeof parsed === 'string' && parsed) {
      detail = parsed
    }
    throw new ApiError(detail, res.status)
  }

  return parsed as T
}

export const api = {
  health(signal?: AbortSignal): Promise<Health> {
    return request<Health>('/health', { signal })
  },

  searchProducts(
    params: {
      q: string
      country?: string
      limit?: number
      include_test?: boolean
    },
    signal?: AbortSignal,
  ): Promise<Product[]> {
    return request<Product[]>('/products/search', {
      query: {
        q: params.q,
        country: params.country,
        limit: params.limit,
        include_test: params.include_test,
      },
      signal,
    })
  },

  getProduct(id: string, signal?: AbortSignal): Promise<Product> {
    return request<Product>(`/products/${encodeURIComponent(id)}`, { signal })
  },

  proposeIntent(body: IntentRequest, signal?: AbortSignal): Promise<IntentView> {
    return request<IntentView>('/intents', { method: 'POST', body, signal })
  },

  executeIntent(id: string, signal?: AbortSignal): Promise<IntentResult> {
    return request<IntentResult>(`/intents/${encodeURIComponent(id)}/execute`, {
      method: 'POST',
      signal,
    })
  },

  getIntent(id: string, signal?: AbortSignal): Promise<IntentResult> {
    return request<IntentResult>(`/intents/${encodeURIComponent(id)}`, { signal })
  },

  getPolicy(signal?: AbortSignal): Promise<Policy> {
    return request<Policy>('/policy', { signal })
  },

  updatePolicy(patch: Partial<Policy>, signal?: AbortSignal): Promise<Policy> {
    return request<Policy>('/policy', { method: 'PUT', body: patch, signal })
  },

  toggleKillSwitch(signal?: AbortSignal): Promise<Policy> {
    return request<Policy>('/kill-switch', { method: 'POST', signal })
  },

  listAudit(limit = 100, signal?: AbortSignal): Promise<AuditView[]> {
    return request<AuditView[]>('/audit', { query: { limit }, signal })
  },
}

export default api
