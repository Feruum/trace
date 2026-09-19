import type { EvidenceChunk, EvidenceKind } from '../evidence'
import { expandSynonyms } from './synonyms'
import { allowedEvidenceKinds, classifyQuestion, EVIDENCE_KIND_WEIGHTS, type QuestionType } from './question'

export type RetrievalRefusalReason = 'admissions_program_requirement_missing'

export interface RetrievedEvidence {
  chunk: EvidenceChunk
  lexicalScore: number
  rank: number
}

export interface RetrievalOptions {
  applicant?: { degree?: string; field?: string; intake?: string }
}

const STOP_WORDS = new Set(['the', 'is', 'are', 'what', 'where', 'when', 'which', 'and', 'or', 'this', 'that', 'это', 'как', 'что', 'где', 'когда', 'какой', 'и', 'или'])
const KIND_TIE_PRIORITY: Record<EvidenceKind, number> = { identity: 0, admissions: 1, image: 2, description: 3 }

function tokens(value: string): string[] {
  return value.toLocaleLowerCase().replace(/ё/g, 'е').match(/[\p{L}\p{N}]+/gu) ?? []
}

function applicantMatchesProgram(chunk: EvidenceChunk, applicant: RetrievalOptions['applicant']): boolean {
  if (!applicant) return true
  const text = chunk.text.toLocaleLowerCase()
  if (!/scope:\s*program-specific/.test(text)) return false
  if (applicant.degree && !text.includes(applicant.degree.toLocaleLowerCase())) return false
  if (applicant.field && !text.includes(applicant.field.toLocaleLowerCase())) return false
  if (applicant.intake && !text.includes(applicant.intake.toLocaleLowerCase())) return false
  return true
}

export function hasProgramSpecificAdmissionsEvidence(chunks: EvidenceChunk[], applicant?: RetrievalOptions['applicant']): boolean {
  return chunks.some((chunk) => chunk.kind === 'admissions' && applicantMatchesProgram(chunk, applicant))
}

export function classifyRetrievedQuestion(question: string): QuestionType {
  return classifyQuestion(question)
}

export function retrieveEvidence(chunks: EvidenceChunk[], question: string, limit = 8, options: RetrievalOptions = {}): RetrievedEvidence[] {
  const questionType = classifyQuestion(question)
  const allowed = new Set(allowedEvidenceKinds(questionType))
  const queryTokens = tokens(question)
  const meaningfulQuery = queryTokens.filter((token) => !STOP_WORDS.has(token))
  const querySet = expandSynonyms(meaningfulQuery)
  const queryText = question.toLocaleLowerCase()
  const candidates = chunks
    .map((chunk, index) => ({ chunk, index }))
    .filter(({ chunk }) => allowed.has(chunk.kind))

  if (questionType === 'admissions' && options.applicant && !hasProgramSpecificAdmissionsEvidence(chunks, options.applicant)) return []

  const scored = candidates.map(({ chunk, index }) => {
    const chunkTokens = expandSynonyms(tokens(chunk.text))
    const matched = [...querySet].filter((token) => chunkTokens.has(token)).length
    const phraseBoost = meaningfulQuery.length > 1 && chunk.text.toLocaleLowerCase().includes(meaningfulQuery.join(' ')) ? 3 : 0
    const categoryBoost = chunk.category && querySet.has(chunk.category) ? 2 : 0
    const evidenceMatch = matched + phraseBoost + categoryBoost
    const lexicalScore = evidenceMatch > 0 ? evidenceMatch + (EVIDENCE_KIND_WEIGHTS[questionType][chunk.kind] ?? 0) : 0
    return { chunk, index, lexicalScore }
  })
  return scored
    .filter((item) => item.lexicalScore > 0)
    .sort((left, right) => right.lexicalScore - left.lexicalScore || KIND_TIE_PRIORITY[left.chunk.kind] - KIND_TIE_PRIORITY[right.chunk.kind] || left.index - right.index || left.chunk.id.localeCompare(right.chunk.id))
    .slice(0, limit)
    .map((item, index) => ({ chunk: item.chunk, lexicalScore: item.lexicalScore, rank: index + 1 }))
}
