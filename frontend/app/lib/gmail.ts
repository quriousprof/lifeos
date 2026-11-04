// Typed client for the real Gmail connector (read-only) on the Python backend.
// Only { connected, email } + fetched email metadata cross the wire — tokens stay
// server-side. Shares API_BASE with lib/api.ts.

import { API_BASE, ApiError } from './api'

export type GmailStatus = {
  connected: boolean
  email: string | null
  scopes: string[]
}

export type Email = {
  id: string
  sender: string
  subject: string
  date: string
  snippet: string
  body: string
}

export type Trip = {
  origin: string | null
  destination: string | null
  destination_country_code: string | null
  date_iso: string | null
  date_raw: string | null
  source_email_id: string | null
  matched_keywords: string[]
  actionable: boolean
}

export type GmailFetchResult = {
  emails: Email[]
  trip: Trip | null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(new URL(path, API_BASE).toString(), init)
  const text = await res.text()
  let parsed: unknown
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
    }
    throw new ApiError(detail, res.status)
  }
  return parsed as T
}

export const gmailApi = {
  getAuthUrl(): Promise<{ auth_url: string }> {
    return request<{ auth_url: string }>('/connectors/gmail/auth')
  },
  getStatus(): Promise<GmailStatus> {
    return request<GmailStatus>('/connectors/gmail/status')
  },
  fetchEmails(limit = 5): Promise<GmailFetchResult> {
    return request<GmailFetchResult>(`/connectors/gmail/fetch?limit=${limit}`, {
      method: 'POST',
    })
  },
  disconnect(): Promise<GmailStatus> {
    return request<GmailStatus>('/connectors/gmail/disconnect', { method: 'POST' })
  },
}

export default gmailApi
