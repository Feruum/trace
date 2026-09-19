import { createHash } from 'node:crypto'
import { LOCUS_CATEGORIES, type LocusCategory, type LocusProfile, type PhotoAsset, type SourceKind } from './types'

export type ConfidenceFilter = 'confirmed' | 'review'
export type ProfileSort = 'category' | 'source' | 'confidence'
export interface ProfileFilters { confidence?: ConfidenceFilter; category?: LocusCategory; source?: SourceKind; sort?: ProfileSort }
export interface SourceSummary {
  sourceId: string
  sourceUrl: string
  sourceLabel: string
  provider: SourceKind
  category: LocusCategory
  license: string
  creator: string | null
  publishedAt: string | null
  confidence: 'high' | 'review'
}

export function validateProfileFilters(params: URLSearchParams): ProfileFilters | { error: string } {
  const confidence = params.get('confidence')
  const category = params.get('category')
  const source = params.get('source')
  const sort = params.get('sort')
  if (confidence && confidence !== 'confirmed' && confidence !== 'review') return { error: 'Invalid confidence filter.' }
  if (category && !LOCUS_CATEGORIES.includes(category as LocusCategory)) return { error: 'Invalid category filter.' }
  if (source && source !== 'wikimedia_commons' && source !== 'openverse') return { error: 'Invalid source filter.' }
  if (sort && sort !== 'category' && sort !== 'source' && sort !== 'confidence') return { error: 'Invalid sort.' }
  return {
    ...(confidence ? { confidence: confidence as ConfidenceFilter } : {}),
    ...(category ? { category: category as LocusCategory } : {}),
    ...(source ? { source: source as SourceKind } : {}),
    ...(sort ? { sort: sort as ProfileSort } : {}),
  }
}

function sourcePriority(source: SourceKind): number {
  if (source === 'wikimedia_commons') return 0
  if (source === 'openverse') return 1
  return 2
}
function categoryIndex(category: LocusCategory): number {
  const index = LOCUS_CATEGORIES.indexOf(category)
  return index < 0 ? LOCUS_CATEGORIES.length : index
}
export function sourceIdForAsset(asset: PhotoAsset): string {
  return createHash('sha256').update(`${asset.landingUrl}|${asset.source}`).digest('hex').slice(0, 16)
}

export function profileView(profile: LocusProfile, filters: ProfileFilters = {}): LocusProfile {
  const assets = profile.assets.filter((asset) => {
    if (filters.confidence === 'confirmed' && asset.confidence.level !== 'high') return false
    if (filters.confidence === 'review' && asset.confidence.level !== 'review') return false
    if (filters.category && asset.primaryCategory !== filters.category) return false
    if (filters.source && asset.source !== filters.source) return false
    return true
  })
  const sort = filters.sort ?? 'category'
  assets.sort((left, right) => {
    if (sort === 'confidence' && left.confidence.level !== right.confidence.level) return left.confidence.level === 'high' ? -1 : 1
    if (sort === 'source') {
      const source = sourcePriority(left.source) - sourcePriority(right.source)
      if (source) return source
    }
    if (sort === 'category') {
      const category = categoryIndex(left.primaryCategory) - categoryIndex(right.primaryCategory)
      if (category) return category
    }
    return sourceIdForAsset(left).localeCompare(sourceIdForAsset(right))
  })
  const categories = Object.fromEntries(LOCUS_CATEGORIES.map((category) => [category, assets.filter((asset) => asset.primaryCategory === category)])) as LocusProfile['categories']
  return { ...profile, assets, categories }
}

export function listProfileSources(profile: LocusProfile, filters: ProfileFilters = {}): SourceSummary[] {
  const view = profileView(profile, filters)
  const byId = new Map<string, SourceSummary>()
  for (const asset of view.assets) {
    const sourceId = sourceIdForAsset(asset)
    if (byId.has(sourceId)) continue
    byId.set(sourceId, {
      sourceId, sourceUrl: asset.landingUrl, sourceLabel: asset.sourceLabel, provider: asset.source,
      category: asset.primaryCategory, license: asset.license, creator: asset.creator,
      publishedAt: asset.publishedAt, confidence: asset.confidence.level,
    })
  }
  return [...byId.values()].sort((left, right) => categoryIndex(left.category) - categoryIndex(right.category) || sourcePriority(left.provider) - sourcePriority(right.provider) || left.sourceId.localeCompare(right.sourceId))
}
