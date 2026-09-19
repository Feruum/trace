import { normalizeHttpUrl } from './provenance'
import { providerResponseCache, type ProviderCacheStore } from './provider-cache'
import { recordProviderRequest } from './metrics'

export class LocusProviderError extends Error {
  public readonly cause?: unknown

  constructor(
    public readonly provider: string,
    message: string,
    _cause?: unknown,
  ) {
    super(`${provider}: ${message}`)
    this.name = 'LocusProviderError'
    this.cause = _cause
  }
}

export type LocusFetch = typeof fetch

export interface FetchJsonOptions {
  provider: string
  url: string
  fetchImpl?: LocusFetch
  signal?: AbortSignal
  timeoutMs?: number
  cacheTtlMs?: number
  cacheStore?: ProviderCacheStore
  /** Validate the decoded provider payload before it can be cached or returned. */
  validate?: (value: unknown) => boolean
}

function trackedProvider(provider: string): { provider: string; operation: string } | null {
  if (provider.startsWith('Wikidata')) return { provider: 'Wikidata', operation: provider.slice('Wikidata'.length).trim().toLocaleLowerCase() || 'fetch_json' }
  if (provider === 'Openverse') return { provider, operation: 'fetch_json' }
  if (provider === 'Wikimedia Commons') return { provider, operation: 'fetch_json' }
  return null
}


export async function fetchJson<T>({
  provider,
  url,
  fetchImpl = fetch,
  signal,
  timeoutMs = 7_000,
  cacheTtlMs,
  cacheStore,
  validate,
}: FetchJsonOptions): Promise<T> {
  const canonicalUrl = normalizeHttpUrl(url) ?? url
  const store = cacheStore ?? providerResponseCache
  const shouldCache = cacheTtlMs !== undefined && (fetchImpl === fetch || cacheStore !== undefined)
  if (shouldCache && !signal?.aborted) {
    const cached = store.get<T>(provider, canonicalUrl)
    if (cached !== undefined && (!validate || validate(cached))) return cached
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })

  const metric = trackedProvider(provider)
  const startedAt = Date.now()
  let metricStatus = 'success'
  try {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new LocusProviderError(provider, `HTTP ${response.status}`)
    let parsed: T
    try {
      parsed = (await response.json()) as T
    } catch (error) {
      throw new LocusProviderError(provider, 'returned invalid JSON', error)
    }
    if (validate && !validate(parsed)) throw new LocusProviderError(provider, 'returned invalid provider data')
    if (shouldCache && !signal?.aborted) store.set(provider, canonicalUrl, parsed, cacheTtlMs)
    return parsed
  } catch (error) {
    metricStatus = 'failed'
    if (error instanceof LocusProviderError) throw error
    const detail = error instanceof Error ? error.message : 'request failed'
    throw new LocusProviderError(provider, detail, error)
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
    if (metric) recordProviderRequest(metric.provider, metric.operation, metricStatus, Math.max(0, Date.now() - startedAt))
  }
}

export function remainingSignal(deadline: number): AbortSignal {
  const controller = new AbortController()
  const remaining = Math.max(0, deadline - Date.now())
  const timeout = setTimeout(() => controller.abort(), remaining)
  controller.signal.addEventListener('abort', () => clearTimeout(timeout), { once: true })
  return controller.signal
}
