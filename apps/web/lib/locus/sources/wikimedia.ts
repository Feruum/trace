import { CATEGORY_SEARCH_TERMS, MAX_PROVIDER_RESULTS_PER_QUERY, PROVIDER_RESPONSE_TTL_MS } from '../constants'
import { fetchJson, type LocusFetch } from '../http'
import { normalizeHtmlMetadata, normalizeHttpUrl, normalizeLicense } from '../provenance'
import type { ProviderCacheStore } from '../provider-cache'
import type { LocusCategory, PhotoCandidate, UniversityContext } from '../types'

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

interface WikimediaResponse {
  query?: { pages?: Record<string, WikimediaPage> }
}

function isWikimediaResponse(value: unknown): value is WikimediaResponse {
  if (typeof value !== 'object' || value === null) return false
  const query = (value as WikimediaResponse).query
  return typeof query === 'object' && query !== null && typeof query.pages === 'object' && query.pages !== null
}

interface WikimediaPage {
  pageid?: number
  title?: string
  imageinfo?: WikimediaImageInfo[]
}

interface WikimediaImageInfo {
  url?: string
  thumburl?: string
  descriptionurl?: string
  mime?: string
  width?: number
  height?: number
  extmetadata?: Record<string, { value?: string }>
}

function metadataValue(info: WikimediaImageInfo, key: string): string | null {
  return normalizeHtmlMetadata(info.extmetadata?.[key]?.value)
}

function parseDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function queryFor(context: UniversityContext, category: LocusCategory): string {
  const location = [context.city, context.country].filter(Boolean).join(', ')
  const primary = CATEGORY_SEARCH_TERMS[category][0] ?? ''
  return [context.name, location, primary].filter(Boolean).join(' ')
}

export async function fetchWikimediaCategory(
  context: UniversityContext,
  category: LocusCategory,
  options: { fetchImpl?: LocusFetch; signal?: AbortSignal; cacheStore?: ProviderCacheStore } = {},
): Promise<PhotoCandidate[]> {
  const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: queryFor(context, category), gsrnamespace: '6', gsrlimit: String(MAX_PROVIDER_RESULTS_PER_QUERY), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '640', format: 'json', origin: '*' })
  const data = await fetchJson<WikimediaResponse>({
    provider: 'Wikimedia Commons',
    url: `${COMMONS_API}?${params.toString()}`,
    fetchImpl: options.fetchImpl ?? fetch,
    signal: options.signal,
    cacheTtlMs: PROVIDER_RESPONSE_TTL_MS,
    cacheStore: options.cacheStore,
    validate: isWikimediaResponse,
  })
  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => (a.pageid ?? Number.MAX_SAFE_INTEGER) - (b.pageid ?? Number.MAX_SAFE_INTEGER) || (a.title ?? '').localeCompare(b.title ?? ''))
    .flatMap((page) => {
      const info = page.imageinfo?.[0]
      const imageUrl = normalizeHttpUrl(info?.url)
      const thumbnailUrl = normalizeHttpUrl(info?.thumburl)
      const landingUrl = normalizeHttpUrl(info?.descriptionurl)
      const rawLicense = metadataValue(info ?? {}, 'LicenseShortName') ?? metadataValue(info ?? {}, 'LicenseUrl')
      const license = normalizeLicense(rawLicense)
      const licenseUrlRaw = metadataValue(info ?? {}, 'LicenseUrl')
      const licenseUrl = licenseUrlRaw ? normalizeHttpUrl(licenseUrlRaw) : null
      if (!imageUrl || !thumbnailUrl || !landingUrl || !license || (licenseUrlRaw && !licenseUrl) || (info?.mime && !info.mime.toLocaleLowerCase().startsWith('image/'))) return []
      const categories = metadataValue(info ?? {}, 'Categories')
      const description = metadataValue(info ?? {}, 'ImageDescription')
      const creator = metadataValue(info ?? {}, 'Artist') ?? metadataValue(info ?? {}, 'Attribution') ?? metadataValue(info ?? {}, 'Credit')
      const publishedAt = parseDate(metadataValue(info ?? {}, 'DateTimeOriginal') ?? metadataValue(info ?? {}, 'DateTime'))
      const title = normalizeHtmlMetadata(page.title?.replace(/^File:/i, '').trim()) || context.name
      return [{
        id: `wikimedia_commons:${String(page.pageid ?? title)}`,
        imageUrl,
        thumbnailUrl,
        landingUrl,
        source: 'wikimedia_commons' as const,
        sourceLabel: 'Wikimedia Commons',
        title,
        description,
        creator,
        license: license.label,
        licenseUrl,
        publishedAt,
        requestedCategory: category,
        width: typeof info?.width === 'number' ? info.width : null,
        height: typeof info?.height === 'number' ? info.height : null,
        metadataText: [title, description, categories].filter(Boolean).join(' '),
        collectionText: categories,
      }]
    })
}
