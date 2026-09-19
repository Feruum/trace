import type { EvidenceKind } from '../evidence'

export type QuestionType = 'identity' | 'admissions' | 'media' | 'general'

const EXAM_TERMS = ['ielts', 'toefl', 'sat', 'act', 'duolingo', 'gre', 'gmat', 'gpa', 'айелтс', 'тоефл']
const ADMISSIONS_TERMS = ['admission', 'admissions', 'requirement', 'requirements', 'minimum', 'apply', 'application', 'score', 'exam', 'поступ', 'требован', 'минимум', 'балл', 'экзамен', 'приём', 'прием']
const IDENTITY_TERMS = ['name', 'named', 'location', 'located', 'where', 'who', 'university', 'city', 'country', 'название', 'называется', 'располож', 'где', 'кто', 'университет', 'город', 'страна']
const MEDIA_TERMS = ['image', 'images', 'photo', 'photograph', 'picture', 'license', 'licence', 'creator', 'source', 'изображен', 'фото', 'лиценз', 'автор', 'источник']

type EvidenceWeights = Readonly<Record<EvidenceKind, number>>
export const EVIDENCE_KIND_WEIGHTS: Readonly<Record<QuestionType, EvidenceWeights>> = {
  identity: { identity: 6, description: 5, image: 0, admissions: 0 },
  admissions: { identity: 0, description: 0, image: 0, admissions: 10 },
  media: { identity: 1, description: 1, image: 8, admissions: 0 },
  general: { identity: 4, description: 2, image: 3, admissions: 5 },
}

export const ALLOWED_EVIDENCE_KINDS: Readonly<Record<QuestionType, readonly EvidenceKind[]>> = {
  identity: ['identity', 'description'],
  admissions: ['admissions'],
  media: ['image'],
  general: ['identity', 'description', 'image', 'admissions'],
}

function questionTokens(question: string): string[] {
  return question.toLocaleLowerCase().replace(/ё/g, 'е').match(/[\p{L}\p{N}]+/gu) ?? []
}

function includesAny(tokens: string[], terms: string[]): boolean {
  return terms.some((term) => tokens.some((token) => token.includes(term)))
}

export function classifyQuestion(question: string): QuestionType {
  const tokens = questionTokens(question)
  if (includesAny(tokens, EXAM_TERMS) || includesAny(tokens, ADMISSIONS_TERMS)) return 'admissions'
  if (includesAny(tokens, MEDIA_TERMS)) return 'media'
  if (includesAny(tokens, IDENTITY_TERMS)) return 'identity'
  return 'general'
}

export function allowedEvidenceKinds(type: QuestionType): readonly EvidenceKind[] {
  return ALLOWED_EVIDENCE_KINDS[type]
}
