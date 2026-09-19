import { CATEGORY_SEARCH_TERMS, MAX_PROVIDER_RESULTS_PER_QUERY, PROVIDER_RESPONSE_TTL_MS } from '../constants'
import { fetchJson, type LocusFetch } from '../http'
import { normalizeHttpUrl, normalizeLicense } from '../provenance'
import type { ProviderCacheStore } from '../provider-cache'
import type { LocusCategory, PhotoCandidate, UniversityContext } from '../types'

const OPENVERSE_API = 'https://api.openverse.org/v1/images/'

interface OpenverseResponse {
  results?: OpenverseResult[]
}

function isOpenverseResponse(value: unknown): value is OpenverseResponse {
  return typeof value === 'object' && value !== null && Array.isArray((value as OpenverseResponse).results)
}

interface OpenverseResult {
  id?: string | number
  title?: string
  url?: string
  thumbnail?: string
  foreign_landing_url?: string
  creator?: string | null
  license?: string | null
  license_version?: string | null
  license_url?: string | null
  width?: number | null
  height?: number | null
  created_on?: string | null
  tags?: Array<{ name?: string } | string>
  category?: string | null
  source?: string | null
  provider?: string | null
}

function queryFor(context: UniversityContext, category: LocusCategory): string {
  const location = [context.city, context.country].filter(Boolean).join(', ')
  const primary = CATEGORY_SEARCH_TERMS[category][0] ?? ''
  return [context.name, location, primary].filter(Boolean).join(' ')
}

export async function fetchOpenverseCategory(
  context: UniversityContext,
  category: LocusCategory,
  options: { fetchImpl?: LocusFetch; signal?: AbortSignal; cacheStore?: ProviderCacheStore } = {},
): Promise<PhotoCandidate[]> {
  const params = new URLSearchParams({ q: queryFor(context, category), page_size: String(MAX_PROVIDER_RESULTS_PER_QUERY) })
  const requestUrl = `${OPENVERSE_API}?${params.toString()}`
  const data = await fetchJson<OpenverseResponse>({
    provider: 'Openverse',
    url: requestUrl,
    fetchImpl: options.fetchImpl ?? fetch,
    signal: options.signal,
    cacheTtlMs: PROVIDER_RESPONSE_TTL_MS,
    cacheStore: options.cacheStore,
    validate: isOpenverseResponse,
  })

  return (data.results ?? []).flatMap((result, index) => {
    const imageUrl = normalizeHttpUrl(result.url)
    const thumbnailUrl = normalizeHttpUrl(result.thumbnail)
    const landingUrl = normalizeHttpUrl(result.foreign_landing_url)
    const license = normalizeLicense(result.license ? `${result.license}${result.license_version ? ` ${result.license_version}` : ''}` : null)
    const licenseUrl = result.license_url === undefined || result.license_url === null ? null : normalizeHttpUrl(result.license_url)
    if (!imageUrl || !thumbnailUrl || !landingUrl || !license || (result.license_url && !licenseUrl)) return []
    const tags = (result.tags ?? []).map((tag) => typeof tag === 'string' ? tag.trim() : (tag.name ?? '').trim()).filter(Boolean)
    return [{
      id: `openverse:${String(result.id ?? `${category}-${index}`)}`,
      imageUrl,
      thumbnailUrl,
      landingUrl,
      source: 'openverse' as const,
      sourceLabel: 'Openverse',
      title: result.title?.trim() || context.name,
      description: tags.join(', ') || null,
      creator: result.creator?.trim() || null,
      license: license.label,
      licenseUrl,
      publishedAt: result.created_on || null,
      requestedCategory: category,
      width: typeof result.width === 'number' ? result.width : null,
      height: typeof result.height === 'number' ? result.height : null,
      metadataText: [result.title, tags.join(' '), result.category].filter(Boolean).join(' '),
      collectionText: [result.source, result.provider].filter(Boolean).join(' ') || null,
    }]
  })
}
