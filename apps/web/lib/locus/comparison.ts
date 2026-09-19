import { LOCUS_CATEGORIES, type LocusCategory, type LocusProfile } from './types'

export interface ProfileComparisonSide {
  id: string
  name: string
  confirmed: number
  review: number
  coverage: number
  sources: number
  rejected: number
  duplicates: number
  sourcesAvailable: boolean
  admissionsAvailable: boolean
  admissionsSources: number
}
export interface ProfileComparison {
  left: ProfileComparisonSide
  right: ProfileComparisonSide
  categories: Array<{ category: LocusCategory; left: number; right: number }>
  verdict: 'evidence_coverage_only'
}

function side(profile: LocusProfile): ProfileComparisonSide {
  const confirmed = profile.assets.filter((asset) => asset.confidence.level === 'high').length
  const review = profile.assets.length - confirmed
  const coverage = LOCUS_CATEGORIES.filter((category) => profile.categories[category].length > 0).length
  const sources = new Set(profile.assets.map((asset) => asset.source)).size
  const admissionsSources = new Set((profile.admissions?.evidence ?? []).map((item) => item.sourceUrl)).size
  const sourcesAvailable = sources > 0
  return {
    id: profile.university.id,
    name: profile.university.name,
    confirmed,
    review,
    coverage,
    sources,
    sourcesAvailable,
    rejected: profile.stats.rejectedForProvenance,
    duplicates: profile.stats.duplicatesRemoved,
    admissionsAvailable: admissionsSources > 0,
    admissionsSources,
  }
}

export function compareProfiles(left: LocusProfile, right: LocusProfile): ProfileComparison {
  return {
    left: side(left),
    right: side(right),
    categories: LOCUS_CATEGORIES.map((category) => ({
      category,
      left: left.categories[category].length,
      right: right.categories[category].length,
    })),
    verdict: 'evidence_coverage_only',
  }
}

export function toggleShortlistProfile(shortlist: LocusProfile[], profile: LocusProfile): LocusProfile[] {
  const existingIndex = shortlist.findIndex((item) => item.university.id === profile.university.id)
  if (existingIndex >= 0) return shortlist.filter((_, index) => index !== existingIndex)
  if (shortlist.length >= 2) return shortlist
  return [...shortlist, profile]
}
