import { PROVIDER_RESPONSE_TTL_MS } from './constants'

export const MAX_PROVIDER_CACHE_ENTRIES = 256

export interface ProviderCacheStore {
  get<T>(provider: string, url: string, now?: number): T | undefined
  set<T>(provider: string, url: string, value: T, ttlMs?: number, now?: number): void
  clear(): void
}

interface Entry {
  value: unknown
  expiresAt: number
  touchedAt: number
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

class BoundedProviderCache implements ProviderCacheStore {
  private readonly entries = new Map<string, Entry>()

  get<T>(provider: string, url: string, now = Date.now()): T | undefined {
    const key = `${provider}\u0000${url}`
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= now) {
      this.entries.delete(key)
      return undefined
    }
    entry.touchedAt = now
    return clone(entry.value) as T
  }

  set<T>(provider: string, url: string, value: T, ttlMs = PROVIDER_RESPONSE_TTL_MS, now = Date.now()): void {
    const key = `${provider}\u0000${url}`
    if (this.entries.size >= MAX_PROVIDER_CACHE_ENTRIES && !this.entries.has(key)) {
      const oldest = [...this.entries.entries()].sort((a, b) => a[1].touchedAt - b[1].touchedAt)[0]
      if (oldest) this.entries.delete(oldest[0])
    }
    this.entries.set(key, { value: clone(value), expiresAt: now + Math.max(0, ttlMs), touchedAt: now })
  }

  clear(): void {
    this.entries.clear()
  }
}

export const providerResponseCache: ProviderCacheStore = new BoundedProviderCache()

export function clearProviderResponseCache(): void {
  providerResponseCache.clear()
}
