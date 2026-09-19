import { randomUUID } from 'node:crypto'
import type { LocusProfile } from './types'

const PROFILE_CACHE_TTL_MS = 10 * 60 * 1000
const MAX_PROFILE_CACHE_ENTRIES = 500
const cache = new Map<string, { profile: LocusProfile; expiresAt: number }>()

function pruneExpired(now = Date.now()): void {
  for (const [token, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(token)
  }
  while (cache.size >= MAX_PROFILE_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (typeof oldest !== 'string') break
    cache.delete(oldest)
  }
}

export function cacheProfile(profile: LocusProfile): string {
  pruneExpired()
  const token = randomUUID()
  cache.set(token, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS })
  return token
}

export function getCachedProfile(profileToken: string): LocusProfile | null {
  const entry = cache.get(profileToken)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(profileToken)
    return null
  }
  return entry.profile
}
