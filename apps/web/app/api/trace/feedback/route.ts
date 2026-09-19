import { NextResponse } from 'next/server'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { loadProfile, addFeedback } from '@lib/locus/trace-store'
import { sourceIdForAsset } from '@lib/locus/profile-view'
import { clientRateLimitKey, takeRateLimit } from '@lib/locus/rate-limit'
import { captureTraceError } from '@lib/locus/observability'
function traceJson<T>(body: T, init?: ResponseInit): Response {
  return applyTraceSecurityHeaders(NextResponse.json(body, init))
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
const REASONS = ['wrong_category', 'wrong_license', 'wrong_source', 'duplicate', 'other'] as const

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try { body = await request.json() } catch { return traceJson({ code: 'INVALID_REQUEST' }, { status: 400 }) }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return traceJson({ code: 'INVALID_REQUEST' }, { status: 400 })
  const input = body as Record<string, unknown>
  const entityId = input.entityId
  const sourceId = input.sourceId
  const reason = input.reason
  const message = input.message
  if (typeof entityId !== 'string' || !/^Q[1-9][0-9]*$/.test(entityId) || typeof sourceId !== 'string' || !/^[a-f0-9]{16}$/.test(sourceId) || typeof reason !== 'string' || !REASONS.includes(reason as typeof REASONS[number])) return traceJson({ code: 'INVALID_REQUEST' }, { status: 400 })
  const now = Date.now()
  const clientKey = clientRateLimitKey(request)
  const rateLimit = takeRateLimit('feedback', clientKey, 10, now)
  if (!rateLimit.allowed) return traceJson({ code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } })
  const profile = await loadProfile(entityId)
  if (!profile.ok) return traceJson({ code: 'FEEDBACK_UNAVAILABLE' }, { status: 503 })
  if (!profile.value || !profile.value.assets.some((asset) => sourceIdForAsset(asset) === sourceId)) return traceJson({ code: 'INVALID_SOURCE' }, { status: 400 })
  const stored = await addFeedback({ entityId, sourceId, reason, ...(typeof message === 'string' ? { message: message.replace(/[\u0000-\u001f\u007f]/g, ' ').trim() } : {}), createdAt: new Date(now).toISOString(), clientKey })
  if (!stored.ok) return traceJson({ code: 'FEEDBACK_UNAVAILABLE' }, { status: 503 })
  captureTraceError(new Error('TRACE feedback received'), { operation: 'trace_feedback', entityId })
  return traceJson({ status: 'accepted' }, { status: 202 })
}
