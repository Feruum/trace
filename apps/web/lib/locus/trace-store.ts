import { createClient, type RedisClientType } from 'redis'
import type { LocusProfile } from './types'

const PROFILE_PREFIX = 'trace:profile:v1:'
const SESSION_PREFIX = 'trace:session:v1:'
const FEEDBACK_KEY = 'trace:feedback:v1'
const MAX_PROFILE_BYTES = 1024 * 1024
const MAX_COMPARISONS = 2
const MAX_FEEDBACK = 500

export type StorageFailureCode = 'STORAGE_UNAVAILABLE' | 'SESSION_STORAGE_UNAVAILABLE' | 'FEEDBACK_UNAVAILABLE'
export type StorageResult<T> = { ok: true; value: T } | { ok: false; code: StorageFailureCode }

export interface ComparisonReference {
  comparisonId: string
  leftEntityId: string
  rightEntityId: string
  createdAt: string
}

export interface FeedbackEntry {
  entityId: string
  sourceId: string
  reason: string
  message?: string
  createdAt: string
  clientKey: string
}

let client: RedisClientType | null = null
let connecting: Promise<RedisClientType | null> | null = null
let lastConnectionFailedAt = 0

function connectionUrl(): string | null {
  return process.env.TRACE_REDIS_URL?.trim() || process.env.LEARNHOUSE_REDIS_CONNECTION_STRING?.trim() || null
}

export function isTraceStorageConfigured(): boolean {
  return Boolean(connectionUrl())
}

async function getClient(): Promise<RedisClientType | null> {
  const url = connectionUrl()
  if (!url) return null
  if (client?.isReady) return client
  if (connecting) return connecting
  if (Date.now() - lastConnectionFailedAt < 2_000) return null
  connecting = (async () => {
    const next = createClient({ url })
    next.on('error', () => { lastConnectionFailedAt = Date.now() })
    try {
      await next.connect()
      client = next as RedisClientType
      return client
    } catch {
      lastConnectionFailedAt = Date.now()
      try { await next.quit() } catch { /* best effort */ }
      return null
    } finally {
      connecting = null
    }
  })()
  return connecting
}

export async function checkTraceStorage(): Promise<{ configured: boolean; reachable: boolean }> {
  if (!isTraceStorageConfigured()) return { configured: false, reachable: false }
  const redis = await getClient()
  if (!redis) return { configured: true, reachable: false }
  try {
    await redis.ping()
    return { configured: true, reachable: true }
  } catch {
    return { configured: true, reachable: false }
  }
}

function profileKey(entityId: string): string { return `${PROFILE_PREFIX}${entityId}` }
function sessionKey(sessionHash: string): string { return `${SESSION_PREFIX}${sessionHash}` }

export async function saveProfile(profile: LocusProfile): Promise<StorageResult<void>> {
  const redis = await getClient()
  if (!redis) return { ok: false, code: 'STORAGE_UNAVAILABLE' }
  const value = JSON.stringify(profile)
  if (Buffer.byteLength(value, 'utf8') > MAX_PROFILE_BYTES) return { ok: false, code: 'STORAGE_UNAVAILABLE' }
  try {
    await redis.set(profileKey(profile.university.id), value)
    return { ok: true, value: undefined }
  } catch {
    return { ok: false, code: 'STORAGE_UNAVAILABLE' }
  }
}

function isValidProfileShape(parsed: unknown, entityId: string): parsed is LocusProfile {
  if (!parsed || typeof parsed !== 'object') return false
  const profile = parsed as Partial<LocusProfile>
  if (!profile.university || profile.university.id !== entityId || typeof profile.lastCheckedAt !== 'string' || !Number.isFinite(Date.parse(profile.lastCheckedAt))) return false
  if (!Array.isArray(profile.assets) || !profile.categories || typeof profile.categories !== 'object' || !profile.stats || typeof profile.stats !== 'object') return false
  for (const asset of profile.assets) {
    if (!asset || typeof asset !== 'object' || typeof asset.id !== 'string' || typeof asset.imageUrl !== 'string' || typeof asset.primaryCategory !== 'string') return false
  }
  return true
}

export async function loadProfile(entityId: string): Promise<StorageResult<LocusProfile | null>> {
  const redis = await getClient()
  if (!redis) return { ok: false, code: 'STORAGE_UNAVAILABLE' }
  try {
    const value = await redis.get(profileKey(entityId))
    if (!value) return { ok: true, value: null }
    const parsed: unknown = JSON.parse(value)
    if (!isValidProfileShape(parsed, entityId)) return { ok: false, code: 'STORAGE_UNAVAILABLE' }
    return { ok: true, value: parsed }
  } catch {
    return { ok: false, code: 'STORAGE_UNAVAILABLE' }
  }
}

export async function appendComparison(sessionHash: string, entry: ComparisonReference): Promise<StorageResult<void>> {
  const redis = await getClient()
  if (!redis) return { ok: false, code: 'SESSION_STORAGE_UNAVAILABLE' }
  try {
    const key = sessionKey(sessionHash)
    const current = await redis.get(key)
    const list: ComparisonReference[] = current ? JSON.parse(current) : []
    list.unshift(entry)
    await redis.set(key, JSON.stringify(list.slice(0, MAX_COMPARISONS)))
    return { ok: true, value: undefined }
  } catch {
    return { ok: false, code: 'SESSION_STORAGE_UNAVAILABLE' }
  }
}

export async function listComparisons(sessionHash: string): Promise<StorageResult<ComparisonReference[]>> {
  const redis = await getClient()
  if (!redis) return { ok: false, code: 'SESSION_STORAGE_UNAVAILABLE' }
  try {
    const value = await redis.get(sessionKey(sessionHash))
    const list: ComparisonReference[] = value ? JSON.parse(value) : []
    return { ok: true, value: Array.isArray(list) ? list.slice(0, MAX_COMPARISONS) : [] }
  } catch {
    return { ok: false, code: 'SESSION_STORAGE_UNAVAILABLE' }
  }
}

export async function addFeedback(entry: FeedbackEntry): Promise<StorageResult<void>> {
  const redis = await getClient()
  if (!redis) return { ok: false, code: 'FEEDBACK_UNAVAILABLE' }
  try {
    await redis.lPush(FEEDBACK_KEY, JSON.stringify(entry))
    await redis.lTrim(FEEDBACK_KEY, 0, MAX_FEEDBACK - 1)
    return { ok: true, value: undefined }
  } catch {
    return { ok: false, code: 'FEEDBACK_UNAVAILABLE' }
  }
}

export async function resetTraceStoreForTests(): Promise<void> {
  if (client) {
    try { await client.quit() } catch { /* best effort */ }
    client = null
  }
  connecting = null
  lastConnectionFailedAt = 0
}
