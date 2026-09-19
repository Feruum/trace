import * as Sentry from '@sentry/nextjs'

export interface TraceErrorContext {
  operation?: string
  provider?: string
  category?: string | null
  entityId?: string
  refusalReason?: string
  durationMs?: number
}

function safeContext(context: TraceErrorContext | undefined): Record<string, string | number> {
  if (!context) return {}
  const safe: Record<string, string | number> = {}
  if (typeof context.operation === 'string') safe.operation = context.operation.slice(0, 80)
  if (typeof context.provider === 'string') safe.provider = context.provider.slice(0, 80)
  if (typeof context.category === 'string') safe.category = context.category.slice(0, 80)
  if (typeof context.entityId === 'string' && /^Q\d+$/.test(context.entityId)) safe.entityId = context.entityId
  if (typeof context.refusalReason === 'string') safe.refusalReason = context.refusalReason.slice(0, 120)
  if (typeof context.durationMs === 'number' && Number.isFinite(context.durationMs)) safe.durationMs = Math.max(0, Math.min(context.durationMs, 3_600_000))
  return safe
}

export function captureTraceError(_error: unknown, context?: TraceErrorContext): void {
  try {
    const safe = safeContext(context)
    if (Sentry.isInitialized()) {
      const tags = Object.fromEntries(Object.entries(safe).filter(([, value]) => typeof value === 'string')) as Record<string, string>
      Sentry.captureException(new Error('TRACE operation failed'), { tags, extra: safe })
    }
  } catch {
    // Observability must never alter a user-facing TRACE response.
  }
}
