import { CATEGORY_LABELS } from './constants'
import type { LocusCategory, LocusProfile, PhotoAsset } from './types'

export type EvidenceKind = 'identity' | 'description' | 'image' | 'admissions'

export interface EvidenceChunk {
  id: string
  kind: EvidenceKind
  text: string
  sourceUrl: string
  sourceLabel: string
  category: LocusCategory | null
  confidence: number | null
}

export const MAX_CHUNK_CHARS = 700
export const MAX_CHUNKS = 32

/** Source metadata is untrusted content, even when it came from an official provider. */
export function redactUntrustedText(value: unknown): string {
  if (typeof value !== 'string') return ''
  let text = value.replace(/[\u0000-\u001f\u007f]/g, ' ')
  const patterns = [
    /ignore\s+(?:all\s+)?previous\s+instructions?/gi,
    /(?:^|[.!?]\s*)(?:system|developer|assistant)\s*:\s*/gim,
    /(?:reveal|show|print|disclose|output)\s+(?:the\s+)?(?:system\s+)?(?:prompt|instructions?|api\s+keys?|secrets?)/gi,
    /(?:jailbreak|do\s+anything\s+now|dan\s+mode|tool\s*call|function\s*call|execute\s+this\s+command)/gi,
  ]
  for (const pattern of patterns) text = text.replace(pattern, ' ')
  return text.replace(/\s+/g, ' ').trim()
}

function boundedText(value: string): string {
  const normalized = redactUntrustedText(value)
  return normalized.length <= MAX_CHUNK_CHARS ? normalized : `${normalized.slice(0, MAX_CHUNK_CHARS - 1)}…`
}

function assetEvidence(asset: PhotoAsset): string {
  const category = CATEGORY_LABELS[asset.primaryCategory]
  const date = asset.publishedAt ? `Дата публикации или получения / Published date: ${asset.publishedAt}.` : 'Дата публикации или получения / Published date: неизвестна / unknown.'
  const creator = asset.creator ? `Автор / Creator: ${asset.creator}.` : 'Автор / Creator: неизвестен / unknown.'
  return boundedText(`Название / Title: ${asset.title}. Категория / Category: ${category.ru} (${asset.primaryCategory}). Провайдер / Provider: ${asset.sourceLabel}. ${creator} Лицензия / License: ${asset.license}. ${date} Индекс доказательности / Evidence index: ${asset.confidence.score}/100. Проверка визуального дубликата / Visual duplicate check: ${asset.visualDeduplication}.`)
}

type AdmissionsRequirementLike = {
  exam: string
  minimumScore: number
  sectionMinimums?: Record<string, number>
  sourceUrl: string
  sourceLabel: string
  quote: string
  scope?: 'university-wide' | 'program-specific'
  program?: string | null
  level?: string | null
  intake?: string | null
  sourceDate?: string | null
}
type AdmissionsEvidenceLike = {
  sourceUrl: string
  sourceLabel: string
  pageTitle?: string
  scope?: 'university-wide' | 'program-specific'
  program?: string | null
  level?: string | null
  intake?: string | null
  sourceDate?: string | null
  requirements: AdmissionsRequirementLike[]
}

export function buildEvidenceChunks(profile: LocusProfile): EvidenceChunk[] {
  const chunks: EvidenceChunk[] = []
  const location = [profile.university.city, profile.university.country].filter(Boolean).join(', ')
  const identityText = boundedText(`Университет: ${profile.university.name}.${location ? ` Расположение: ${location}.` : ''}`)
  if (identityText) chunks.push({ id: `identity:${profile.university.id}`, kind: 'identity', text: identityText, sourceUrl: profile.university.url, sourceLabel: 'Wikidata', category: null, confidence: null })
  const descriptionText = profile.university.description ? boundedText(profile.university.description) : ''
  if (descriptionText) chunks.push({ id: `description:${profile.university.id}`, kind: 'description', text: descriptionText, sourceUrl: profile.summarySourceUrl, sourceLabel: 'Wikidata', category: null, confidence: null })

  const admissions = (profile as LocusProfile & { admissions?: { evidence?: AdmissionsEvidenceLike[] } }).admissions
  for (const [evidenceIndex, evidence] of (admissions?.evidence ?? []).entries()) {
    for (const [requirementIndex, requirement] of evidence.requirements.entries()) {
      const section = Object.entries(requirement.sectionMinimums ?? {}).map(([key, value]) => `Section minimum ${key}: ${value}.`).join(' ')
      const scope = requirement.scope ?? evidence.scope ?? 'university-wide'
      const details = [
        `Scope: ${scope}.`,
        requirement.program || evidence.program ? `Program: ${requirement.program ?? evidence.program}.` : '',
        requirement.level || evidence.level ? `Level: ${requirement.level ?? evidence.level}.` : '',
        requirement.intake || evidence.intake ? `Intake: ${requirement.intake ?? evidence.intake}.` : '',
        requirement.sourceDate || evidence.sourceDate ? `Source date: ${requirement.sourceDate ?? evidence.sourceDate}.` : '',
      ].join(' ')
      const text = boundedText(`Official admissions requirement. Exam: ${requirement.exam}. Minimum score: ${requirement.minimumScore}. ${section}${details} Exact source quote: ${requirement.quote}`)
      if (!text) continue
      chunks.push({ id: `admissions:${profile.university.id}:${evidenceIndex}:${requirementIndex}:${requirement.exam}`, kind: 'admissions', text, sourceUrl: requirement.sourceUrl || evidence.sourceUrl, sourceLabel: requirement.sourceLabel || evidence.sourceLabel, category: null, confidence: null })
    }
  }
  for (const asset of profile.assets) {
    const text = assetEvidence(asset)
    if (!text) continue
    chunks.push({ id: `image:${asset.id}`, kind: 'image', text, sourceUrl: asset.landingUrl, sourceLabel: asset.sourceLabel, category: asset.primaryCategory, confidence: asset.confidence.score })
  }
  return chunks.slice(0, MAX_CHUNKS)
}
