import { PROVIDER_RESPONSE_TTL_MS } from '../constants'
import { fetchJson, type LocusFetch } from '../http'
import type { ProviderCacheStore } from '../provider-cache'
import type { ProfileRequest, UniversityCandidate, UniversityContext } from '../types'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

interface SearchResponse {
  search?: Array<{
    id?: string
    label?: string
    description?: string
    url?: string
  }>
}

function isSearchResponse(value: unknown): value is SearchResponse {
  return typeof value === 'object' && value !== null && Array.isArray((value as SearchResponse).search)
}

interface EntityResponse {
  entities?: Record<string, WikidataEntity>
}

function isEntityResponse(value: unknown): value is EntityResponse {
  const entities = typeof value === 'object' && value !== null ? (value as EntityResponse).entities : undefined
  return typeof entities === 'object' && entities !== null && !Array.isArray(entities)
}

interface WikidataEntity {
  id?: string
  labels?: Record<string, { value?: string }>
  descriptions?: Record<string, { value?: string }>
  aliases?: Record<string, Array<{ value?: string }>>
  claims?: Record<string, WikidataClaim[]>
  sitelinks?: Record<string, { title?: string; url?: string }>
}

interface WikidataClaim {
  mainsnak?: {
    snaktype?: string
    datavalue?: {
      value?: unknown
    }
  }
}

interface ResolvedEntity {
  context: UniversityContext
  entity: WikidataEntity
}

export type UniversityResolution =
  | { kind: 'selection_required'; candidates: UniversityCandidate[]; warnings: string[] }
  | { kind: 'not_found'; code: 'UNIVERSITY_NOT_FOUND' | 'NOT_AN_INSTITUTION'; message: string }
  | { kind: 'resolved'; context: UniversityContext; entity: WikidataEntity }

function entityUrl(id: string): string {
  return `https://www.wikidata.org/entity/${id}`
}

function labelFor(entity: WikidataEntity, locale: ProfileRequest['locale']): string | null {
  const labels = entity.labels ?? {}
  return labels[locale ?? 'en']?.value ?? labels.en?.value ?? labels.ru?.value ?? null
}

function descriptionFor(entity: WikidataEntity, locale: ProfileRequest['locale']): string | null {
  const descriptions = entity.descriptions ?? {}
  return descriptions[locale ?? 'en']?.value ?? descriptions.en?.value ?? descriptions.ru?.value ?? null
}

function claimEntityId(entity: WikidataEntity, properties: string[]): string | null {
  for (const property of properties) {
    const claims = entity.claims?.[property] ?? []
    for (const claim of claims) {
      const value = claim.mainsnak?.datavalue?.value
      if (typeof value === 'object' && value !== null && 'id' in value) {
        const id = (value as { id?: unknown }).id
        if (typeof id === 'string' && /^Q[1-9][0-9]*$/.test(id)) return id
      }
      if (typeof value === 'object' && value !== null && 'numeric-id' in value) {
        const numericId = (value as { 'numeric-id'?: unknown })['numeric-id']
        if (typeof numericId === 'number' && Number.isInteger(numericId) && numericId > 0) return `Q${numericId}`
      }
    }
  }
  return null
}

function claimUrl(entity: WikidataEntity, property: string): string | null {
  for (const claim of entity.claims?.[property] ?? []) {
    const value = claim.mainsnak?.datavalue?.value
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value
    if (typeof value === 'object' && value !== null && 'url' in value) {
      const url = value.url
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url
    }
  }
  return null
}

function coordinatesFor(entity: WikidataEntity): { latitude: number | null; longitude: number | null } {
  const claim = entity.claims?.P625?.find((item) => item.mainsnak?.datavalue?.value)
  const value = claim?.mainsnak?.datavalue?.value
  if (typeof value !== 'object' || value === null) return { latitude: null, longitude: null }
  const latitude = (value as { latitude?: unknown }).latitude
  const longitude = (value as { longitude?: unknown }).longitude
  return {
    latitude: typeof latitude === 'number' ? latitude : null,
    longitude: typeof longitude === 'number' ? longitude : null,
  }
}

function isInstitution(entity: WikidataEntity): boolean {
  const description = Object.values(entity.descriptions ?? {})
    .map((item) => item.value ?? '')
    .join(' ')
    .toLocaleLowerCase()
  const typeIds = (entity.claims?.P31 ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter((value): value is { id?: unknown } => typeof value === 'object' && value !== null)
    .map((value) => value.id)

  return (
    /(university|college|institute|school|академ|университет|институт|вуз|колледж)/i.test(description) ||
    typeIds.some((id) => typeof id === 'string' && /^Q(3918|189004|31855|38723|2385804)$/.test(id))
  )
}

async function searchCandidates(
  query: string,
  locale: ProfileRequest['locale'],
  fetchImpl: LocusFetch,
  signal: AbortSignal | undefined,
  cacheStore?: ProviderCacheStore,
): Promise<UniversityCandidate[]> {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language: locale ?? 'en',
    format: 'json',
    limit: '5',
  })
  const data = await fetchJson<SearchResponse>({
    provider: 'Wikidata search',
    url: `${WIKIDATA_API}?${params.toString()}`,
    fetchImpl,
    signal,
    cacheTtlMs: PROVIDER_RESPONSE_TTL_MS,
    cacheStore,
    validate: isSearchResponse,
  })
  return (data.search ?? []).flatMap((item) => {
    if (typeof item.id !== 'string' || !/^Q[1-9][0-9]*$/.test(item.id) || typeof item.label !== 'string') return []
    const id = item.id
    const label = item.label
    return [{
      id,
      label,
      description: item.description ?? null,
      url: item.url?.startsWith('http') ? item.url : entityUrl(id),
    }]
  })
}

async function loadEntity(
  id: string,
  locale: ProfileRequest['locale'],
  fetchImpl: LocusFetch,
  signal: AbortSignal | undefined,
  cacheStore?: ProviderCacheStore,
): Promise<ResolvedEntity | null> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: id,
    props: 'labels|descriptions|aliases|claims|sitelinks',
    languages: `${locale ?? 'en'}|en|ru`,
    format: 'json',
  })
  const data = await fetchJson<EntityResponse>({
    provider: 'Wikidata entity',
    url: `${WIKIDATA_API}?${params.toString()}`,
    fetchImpl,
    signal,
    cacheTtlMs: PROVIDER_RESPONSE_TTL_MS,
    cacheStore,
    validate: isEntityResponse,
  })
  const entity = data.entities?.[id]
  if (!entity) return null

  const name = labelFor(entity, locale)
  if (!name) return null
  const aliases = Object.values(entity.aliases ?? {})
    .flatMap((values) => values.map((value) => value.value ?? ''))
    .filter(Boolean)
  const cityId = claimEntityId(entity, ['P131', 'P159', 'P276'])
  const countryId = claimEntityId(entity, ['P17'])
  const referencedIds = [cityId, countryId].filter((value): value is string => value !== null)
  const referenced = referencedIds.length > 0 ? await loadReferencedEntities(referencedIds, locale, fetchImpl, signal, cacheStore) : new Map()
  const coordinates = coordinatesFor(entity)

  const officialUrl = claimUrl(entity, 'P856') ?? undefined
  return {
    entity,
    context: {
      id,
      name,
      aliases,
      city: cityId ? labelFor(referenced.get(cityId) ?? {}, locale) : null,
      country: countryId ? labelFor(referenced.get(countryId) ?? {}, locale) : null,
      description: descriptionFor(entity, locale),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      url: entityUrl(id),
      ...(officialUrl ? { officialUrl } : {}),
    },
  }
}

async function loadReferencedEntities(
  ids: string[],
  locale: ProfileRequest['locale'],
  fetchImpl: LocusFetch,
  signal: AbortSignal | undefined,
  cacheStore?: ProviderCacheStore,
): Promise<Map<string, WikidataEntity>> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels|descriptions',
    languages: `${locale ?? 'en'}|en|ru`,
    format: 'json',
  })
  const data = await fetchJson<EntityResponse>({
    provider: 'Wikidata location labels',
    url: `${WIKIDATA_API}?${params.toString()}`,
    fetchImpl,
    signal,
    cacheTtlMs: PROVIDER_RESPONSE_TTL_MS,
    cacheStore,
    validate: isEntityResponse,
  })
  return new Map(Object.entries(data.entities ?? {}))
}

export async function resolveUniversity(
  request: ProfileRequest,
  options: { fetchImpl?: LocusFetch; signal?: AbortSignal; cacheStore?: ProviderCacheStore } = {},
): Promise<UniversityResolution> {
  const fetchImpl = options.fetchImpl ?? fetch
  if (request.entityId) {
    const resolved = await loadEntity(request.entityId, request.locale, fetchImpl, options.signal, options.cacheStore)
    if (!resolved) {
      return { kind: 'not_found', code: 'UNIVERSITY_NOT_FOUND', message: 'Университет не найден.' }
    }
    if (!isInstitution(resolved.entity)) {
      return { kind: 'not_found', code: 'NOT_AN_INSTITUTION', message: 'Выбранный объект не похож на университет.' }
    }
    return { kind: 'resolved', ...resolved }
  }

  const candidates = await searchCandidates(request.query, request.locale, fetchImpl, options.signal, options.cacheStore)
  if (candidates.length === 0) {
    return { kind: 'not_found', code: 'UNIVERSITY_NOT_FOUND', message: 'Университет не найден.' }
  }

  const normalizedQuery = request.query.trim().toLocaleLowerCase()
  const exact = candidates.filter((candidate) => candidate.label.trim().toLocaleLowerCase() === normalizedQuery)
  if (exact.length !== 1 && candidates.length !== 1) {
    return {
      kind: 'selection_required',
      candidates,
      warnings: ['Wikidata нашла несколько похожих объектов; выберите учреждение вручную.'],
    }
  }

  const selected = exact[0] ?? candidates[0]
  const resolved = await loadEntity(selected.id, request.locale, fetchImpl, options.signal, options.cacheStore)
  if (!resolved) {
    return { kind: 'not_found', code: 'UNIVERSITY_NOT_FOUND', message: 'Университет не найден.' }
  }
  if (!isInstitution(resolved.entity)) {
    return { kind: 'not_found', code: 'NOT_AN_INSTITUTION', message: 'Найденный объект не похож на университет.' }
  }
  return { kind: 'resolved', ...resolved }
}

export { isInstitution }
