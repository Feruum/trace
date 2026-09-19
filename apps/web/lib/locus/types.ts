import type {
  AdmissionsEvidence,
  AdmissionsMatch,
  AdmissionsPreliminaryCheck,
} from './sources/admissions'

export const LOCUS_CATEGORIES = [
  'campus',
  'dormitory',
  'classroom',
  'library',
  'city',
  'sport',
  'laboratory',
  'student_life',
] as const

export type LocusCategory = (typeof LOCUS_CATEGORIES)[number]
export type SourceKind = 'wikidata' | 'wikimedia_commons' | 'openverse'
export type ConfidenceLevel = 'high' | 'review'

export interface UniversityCandidate {
  id: string
  label: string
  description: string | null
  url: string
}

export interface UniversityContext {
  id: string
  name: string
  aliases: string[]
  city: string | null
  country: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  url: string
  officialUrl?: string
}

export interface Confidence {
  score: number
  level: ConfidenceLevel
  reasonCodes: string[]
}

export interface PhotoAsset {
  id: string
  imageUrl: string
  thumbnailUrl: string
  landingUrl: string
  source: SourceKind
  sourceLabel: string
  title: string
  creator: string | null
  license: string
  licenseUrl: string | null
  publishedAt: string | null
  primaryCategory: LocusCategory
  tags: LocusCategory[]
  width: number | null
  height: number | null
  confidence: Confidence
  visualDeduplication: 'checked' | 'unavailable'
}

/** Provider-normalized evidence before confidence and category assignment. */
export interface PhotoCandidate {
  id: string
  imageUrl: string
  thumbnailUrl: string
  landingUrl: string
  source: SourceKind
  sourceLabel: string
  title: string
  description: string | null
  creator: string | null
  license: string
  licenseUrl: string | null
  publishedAt: string | null
  requestedCategory: LocusCategory
  width: number | null
  height: number | null
  metadataText: string
  collectionText: string | null
}

export type ApplicantExamName = 'IELTS' | 'TOEFL' | 'SAT' | 'ACT' | 'Duolingo' | 'GRE' | 'GMAT' | 'GPA' | 'other'

export interface ApplicantExam {
  name: ApplicantExamName
  score: number
  sections?: Record<string, number>
}

export interface ApplicantContext {
  country?: string
  city?: string
  degree?: 'bachelor' | 'master' | 'phd'
  field?: string
  interest?: string
  intake?: string
  budget?: string
  exams: ApplicantExam[]
}
export interface ProviderDiagnostic {
  provider: string
  category: LocusCategory | null
  status: 'success' | 'empty' | 'failed' | 'skipped'
  candidateCount: number
  reason: string | null
  durationMs: number
}

export interface LocusProfile {
  university: UniversityContext
  summary: string
  summarySourceUrl: string
  assets: PhotoAsset[]
  categories: Record<LocusCategory, PhotoAsset[]>
  providerDiagnostics?: ProviderDiagnostic[]
  lastCheckedAt: string
  admissions?: {
    status: 'preliminary_source_check'
    evidence: AdmissionsEvidence[]
    preliminaryChecks: AdmissionsPreliminaryCheck[]
    /** Compatibility field for the existing renderer; always empty. */
    matches: AdmissionsMatch[]
  }
  generatedAt: string
  durationMs: number
  warnings: string[]
  stats: {
    providerCandidates: number
    rejectedForProvenance: number
    duplicatesRemoved: number
    verifiedAssets: number
  }
}

export type ProfileResponse =
  | { status: 'selection_required'; candidates: UniversityCandidate[]; warnings: string[] }
  | { status: 'ready'; profile: LocusProfile; profileToken?: string }
  | {
      status: 'not_found'
      code: 'UNIVERSITY_NOT_FOUND' | 'NOT_AN_INSTITUTION'
      message: string
    }

export type ProfileRequest = {
  query: string
  entityId?: string
  locale?: 'ru' | 'en'
  applicant?: ApplicantContext
}

export type ProfileRequestValidation =
  | { ok: true; value: ProfileRequest }
  | { ok: false; message: 'Введите название университета.' }

function validateApplicant(value: unknown): ApplicantContext | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const body = value as Record<string, unknown>
  if (body.country !== undefined && (typeof body.country !== 'string' || body.country.length > 80)) return undefined
  if (body.city !== undefined && (typeof body.city !== 'string' || body.city.length > 80)) return undefined
  if (body.degree !== undefined && body.degree !== 'bachelor' && body.degree !== 'master' && body.degree !== 'phd') return undefined
  if (body.field !== undefined && (typeof body.field !== 'string' || body.field.length > 120)) return undefined
  if (body.interest !== undefined && (typeof body.interest !== 'string' || body.interest.length > 120)) return undefined
  if (body.intake !== undefined && (typeof body.intake !== 'string' || body.intake.length > 40)) return undefined
  if (body.budget !== undefined && (typeof body.budget !== 'string' || body.budget.length > 80)) return undefined
  if (!Array.isArray(body.exams) || body.exams.length > 8) return undefined
  const exams = body.exams.filter((exam): exam is ApplicantExam => {
    if (typeof exam !== 'object' || exam === null || Array.isArray(exam)) return false
    const item = exam as Record<string, unknown>
    const names: ApplicantExamName[] = ['IELTS', 'TOEFL', 'SAT', 'ACT', 'Duolingo', 'GRE', 'GMAT', 'GPA', 'other']
    if (typeof item.name !== 'string' || !names.includes(item.name as ApplicantExamName)) return false
    if (typeof item.score !== 'number' || !Number.isFinite(item.score) || item.score < 0 || item.score > 2000) return false
    return item.sections === undefined || (typeof item.sections === 'object' && item.sections !== null && !Array.isArray(item.sections))
  })
  if (exams.length !== body.exams.length) return undefined
  return {
    ...(typeof body.country === 'string' && body.country.trim() ? { country: body.country.trim() } : {}),
    ...(typeof body.city === 'string' && body.city.trim() ? { city: body.city.trim() } : {}),
    ...(body.degree ? { degree: body.degree as ApplicantContext['degree'] } : {}),
    ...(typeof body.field === 'string' && body.field.trim() ? { field: body.field.trim() } : {}),
    ...(typeof body.interest === 'string' && body.interest.trim() ? { interest: body.interest.trim() } : {}),
    ...(typeof body.intake === 'string' && body.intake.trim() ? { intake: body.intake.trim() } : {}),
    ...(typeof body.budget === 'string' && body.budget.trim() ? { budget: body.budget.trim() } : {}),
    exams,
  }
}

export function parseApplicantContext(value: unknown): ApplicantContext | undefined {
  return validateApplicant(value)
}

export function validateProfileRequest(input: unknown): ProfileRequestValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, message: 'Введите название университета.' }
  const body = input as Record<string, unknown>
  if (typeof body.query !== 'string') return { ok: false, message: 'Введите название университета.' }
  const query = body.query.trim()
  if (query.length === 0 || Array.from(query).length > 120 || Array.from(query).length < 2) return { ok: false, message: 'Введите название университета.' }
  const entityId = body.entityId
  if (entityId !== undefined && (typeof entityId !== 'string' || !/^Q[1-9][0-9]*$/.test(entityId))) return { ok: false, message: 'Введите название университета.' }
  const locale = body.locale
  if (locale !== undefined && locale !== 'ru' && locale !== 'en') return { ok: false, message: 'Введите название университета.' }
  const applicant = parseApplicantContext(body.applicant)
  if (body.applicant !== undefined && !applicant) return { ok: false, message: 'Введите название университета.' }
  return { ok: true, value: { query, ...(entityId !== undefined ? { entityId } : {}), ...(locale !== undefined ? { locale } : {}), ...(applicant ? { applicant } : {}) } }
}

export function emptyCategoryRecord<T>(value: () => T[] = () => []): Record<LocusCategory, T[]> {
  return Object.fromEntries(LOCUS_CATEGORIES.map((category) => [category, value()])) as Record<LocusCategory, T[]>
}
