const WINDOW_MS = 60_000
const MAX_TRACKED_KEYS = 10_000

interface Entry {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

const entries = new Map<string, Entry>()

function prune(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key)
  }
  while (entries.size >= MAX_TRACKED_KEYS) {
    const oldest = entries.keys().next().value
    if (typeof oldest !== 'string') break
    entries.delete(oldest)
  }
}

export function clientRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const real = request.headers.get('x-real-ip')?.trim()
  const candidate = forwarded || real || 'anonymous'
  return candidate.replace(/[^0-9a-f:.]/gi, '').slice(0, 64) || 'anonymous'
}

export function takeRateLimit(bucket: string, clientKey: string, limit: number, now = Date.now()): RateLimitResult {
  prune(now)
  const key = `${bucket}:${clientKey}`
  const current = entries.get(key)
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) }
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  }
  current.count += 1
  return { allowed: true, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
}
