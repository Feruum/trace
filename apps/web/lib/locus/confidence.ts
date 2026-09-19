import { CATEGORY_SEARCH_TERMS, HIGH_CONFIDENCE_SCORE, MIN_CONFIDENCE_SCORE } from './constants'
import type { Confidence, LocusCategory, PhotoAsset, PhotoCandidate, UniversityContext } from './types'

const PUNCTUATION = /[^\p{L}\p{N}\s]+/gu

export function normalizeEvidenceText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasPhrase(text: string | null | undefined, phrase: string | null | undefined): boolean {
  const normalizedText = normalizeEvidenceText(text)
  const normalizedPhrase = normalizeEvidenceText(phrase)
  return normalizedPhrase.length > 0 && normalizedText.includes(normalizedPhrase)
}

function evidenceText(candidate: PhotoCandidate): string {
  return normalizeEvidenceText(
    [candidate.title, candidate.description, candidate.metadataText, candidate.collectionText]
      .filter(Boolean)
      .join(' '),
  )
}

function validLandingAndLicense(candidate: PhotoCandidate): boolean {
  return Boolean(candidate.landingUrl && candidate.license)
}

export function scoreCandidate(
  candidate: PhotoCandidate,
  context: UniversityContext,
  category: LocusCategory = candidate.requestedCategory,
): Confidence {
  const text = evidenceText(candidate)
  const universityTerms = [context.name, ...context.aliases]
  const cityCountryTerms = [context.city, context.country]
  const categoryTerms = CATEGORY_SEARCH_TERMS[category]
  const universityMatch = universityTerms.some((term) => hasPhrase(text, term))
  const cityMatch = cityCountryTerms.some((term) => hasPhrase(text, term))
  const categoryMatch = categoryTerms.some((term) => hasPhrase(text, term))
  const collectionMatch = hasPhrase(candidate.collectionText, context.name)
  const reasonCodes: string[] = []
  let score = 0

  if (category === 'city') {
    if (hasPhrase(text, context.city)) {
      score += 45
      reasonCodes.push('city_phrase')
    }
    if (hasPhrase(text, context.country)) {
      score += 15
      reasonCodes.push('country_phrase')
    }
    if (categoryMatch) {
      score += 15
      reasonCodes.push('city_term')
    }
    if (collectionMatch || hasPhrase(candidate.collectionText, context.city)) {
      score += 10
      reasonCodes.push('location_collection')
    }
  } else {
    if (universityMatch) {
      score += 40
      reasonCodes.push('university_phrase')
    }
    if (cityMatch) {
      score += 20
      reasonCodes.push('location_phrase')
    }
    if (categoryMatch) {
      score += 15
      reasonCodes.push('category_term')
    }
    if (collectionMatch) {
      score += 10
      reasonCodes.push('university_collection')
    }
    if (!universityMatch && !cityMatch) {
      score -= 30
      reasonCodes.push('no_context_evidence')
    }
  }

  if (candidate.landingUrl) {
    score += 8
    reasonCodes.push('landing_url')
  }
  if (candidate.license) {
    score += 7
    reasonCodes.push('license')
  }

  score = Math.max(0, Math.min(100, score))
  if (score < MIN_CONFIDENCE_SCORE) reasonCodes.push('below_threshold')
  if (score >= HIGH_CONFIDENCE_SCORE) reasonCodes.push('high_evidence')
  else if (score >= MIN_CONFIDENCE_SCORE) reasonCodes.push('review_evidence')

  return {
    score,
    level: score >= HIGH_CONFIDENCE_SCORE ? 'high' : 'review',
    reasonCodes,
  }
}

function categoryEvidence(candidate: PhotoCandidate, category: LocusCategory): number {
  const text = evidenceText(candidate)
  return CATEGORY_SEARCH_TERMS[category].reduce(
    (score, term) => score + (hasPhrase(text, term) ? 1 : 0),
    0,
  )
}

export function scoreAndAssign(
  candidate: PhotoCandidate,
  context: UniversityContext,
): { asset: PhotoAsset | null; confidence: Confidence } {
  const scores = new Map<LocusCategory, Confidence>()
  for (const category of Object.keys(CATEGORY_SEARCH_TERMS) as LocusCategory[]) {
    scores.set(category, scoreCandidate(candidate, context, category))
  }

  let primaryCategory = candidate.requestedCategory
  let winningConfidence = scores.get(primaryCategory) as Confidence
  for (const [category, confidence] of scores) {
    if (
      confidence.score > winningConfidence.score ||
      (confidence.score === winningConfidence.score && categoryEvidence(candidate, category) > categoryEvidence(candidate, primaryCategory))
    ) {
      primaryCategory = category
      winningConfidence = confidence
    }
  }

  if (winningConfidence.score < MIN_CONFIDENCE_SCORE || !validLandingAndLicense(candidate)) {
    return { asset: null, confidence: winningConfidence }
  }

  const tags = (Object.keys(CATEGORY_SEARCH_TERMS) as LocusCategory[]).filter((category) => {
    if (category === primaryCategory) return false
    return categoryEvidence(candidate, category) > 0 && (scores.get(category)?.score ?? 0) >= MIN_CONFIDENCE_SCORE
  })

  return {
    confidence: winningConfidence,
    asset: {
      id: candidate.id,
      imageUrl: candidate.imageUrl,
      thumbnailUrl: candidate.thumbnailUrl,
      landingUrl: candidate.landingUrl,
      source: candidate.source,
      sourceLabel: candidate.sourceLabel,
      title: candidate.title,
      creator: candidate.creator,
      license: candidate.license,
      licenseUrl: candidate.licenseUrl,
      publishedAt: candidate.publishedAt,
      primaryCategory,
      tags,
      width: candidate.width,
      height: candidate.height,
      confidence: winningConfidence,
      visualDeduplication: 'unavailable',
    },
  }
}
