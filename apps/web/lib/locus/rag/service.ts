import { buildEvidenceChunks, type EvidenceChunk } from '../evidence'
import { LocusProviderError } from '../http'
import { recordRagRefusal, recordRagRequest } from '../metrics'
import type { ApplicantContext, LocusProfile } from '../types'
import { evidenceOnlyFallback, refusalExplanation, type RefusalReason } from './fallback'
import { promptWithEvidence, ragSystemPrompt } from './prompt'
import { retrieveEvidence, hasProgramSpecificAdmissionsEvidence } from './retrieve'
import { RAG_MODEL, wikivibeClient, type WikivibeChatClient } from './wikivibe'
import type { ModelClaim, ModelCitation, RAGAnswer, RAGClaim, RAGCitation } from './types'

export const MAX_QUESTION_CHARS = 500
export const MAX_PROMPT_CHARS = 9_000
export const MAX_CLAIMS = 16
export const MAX_CITATIONS = 32
export const MAX_FIELD_CHARS = 1_000

export interface RagServiceOptions {
  chatClient?: WikivibeChatClient
  model?: string
  locale?: 'ru' | 'en'
}

export interface RagServiceInput {
  profile: LocusProfile
  question: string
  applicant?: ApplicantContext
  signal?: AbortSignal
}

interface ModelPayload {
  status: 'answered' | 'insufficient_evidence'
  answer: string
  claims: ModelClaim[]
  citations: ModelCitation[]
  model?: string
}

function boundedString(value: unknown, max = MAX_FIELD_CHARS): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function safeQuestion(question: string): string | null {
  const value = question.trim()
  return value.length > 0 && value.length <= MAX_QUESTION_CHARS ? value : null
}

function isModelCitation(value: unknown): value is ModelCitation {
  if (typeof value !== 'object' || value === null) return false
  const citation = value as Partial<ModelCitation>
  return boundedString(citation.chunkId, 300) && boundedString(citation.quote, MAX_FIELD_CHARS)
}

function isModelClaim(value: unknown): value is ModelClaim {
  if (typeof value !== 'object' || value === null) return false
  const claim = value as Partial<ModelClaim>
  return boundedString(claim.text) && Array.isArray(claim.citations) && claim.citations.length > 0 && claim.citations.every(isModelCitation)
}

export function parseModelPayload(raw: string, model: string): ModelPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new LocusProviderError('Wikivibe', 'returned invalid JSON', error)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new LocusProviderError('Wikivibe', 'returned invalid JSON')
  const value = parsed as Record<string, unknown>
  const keys = Object.keys(value)
  if (keys.some((key) => !['status', 'answer', 'claims', 'citations', 'model'].includes(key))) throw new LocusProviderError('Wikivibe', 'returned unknown fields')
  if (value.status !== 'answered' && value.status !== 'insufficient_evidence') throw new LocusProviderError('Wikivibe', 'returned an invalid answer status')
  if (!boundedString(value.answer) || !Array.isArray(value.claims) || !Array.isArray(value.citations)) throw new LocusProviderError('Wikivibe', 'returned an invalid answer shape')
  if (value.claims.length > MAX_CLAIMS || value.citations.length > MAX_CITATIONS || !value.citations.every(isModelCitation)) throw new LocusProviderError('Wikivibe', 'returned invalid citations')
  if (!value.claims.every(isModelClaim)) throw new LocusProviderError('Wikivibe', 'returned an invalid answer shape')
  if (value.model !== undefined && !boundedString(value.model, 200)) throw new LocusProviderError('Wikivibe', 'returned an invalid model')
  if (value.status === 'insufficient_evidence' && (value.claims.length !== 0 || value.citations.length !== 0)) throw new LocusProviderError('Wikivibe', 'returned invalid insufficient-evidence response')
  if (!value.claims.every((claim) => isModelClaim(claim) && claim.citations.length <= MAX_CITATIONS)) throw new LocusProviderError('Wikivibe', 'returned an invalid answer shape')
  return { status: value.status, answer: value.answer.trim(), claims: value.claims as ModelClaim[], citations: value.citations as ModelCitation[], model: typeof value.model === 'string' ? value.model.trim() : model }
}

function uniqueCitations(citations: RAGCitation[]): RAGCitation[] {
  const seen = new Set<string>()
  return citations.filter((citation) => {
    const key = `${citation.chunkId}\u0000${citation.quote}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function serverCitations(citations: ModelCitation[], chunks: EvidenceChunk[]): RAGCitation[] | null {
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]))
  const result: RAGCitation[] = []
  for (const citation of citations) {
    const chunk = byId.get(citation.chunkId)
    if (!chunk || !boundedString(citation.quote) || !chunk.text.includes(citation.quote)) return null
    result.push({ chunkId: chunk.id, sourceUrl: chunk.sourceUrl, sourceLabel: chunk.sourceLabel, quote: citation.quote })
  }
  return uniqueCitations(result)
}

function serverClaims(claims: ModelClaim[], chunks: EvidenceChunk[]): RAGClaim[] | null {
  const result: RAGClaim[] = []
  for (const claim of claims) {
    if (!boundedString(claim.text) || claim.citations.length === 0) return null
    const citations = serverCitations(claim.citations, chunks)
    if (!citations || citations.length === 0) return null
    result.push({ text: claim.text.trim(), citations })
  }
  return result
}

function insufficient(reason: RefusalReason, locale: 'ru' | 'en', model: string, retrievedCount: number): RAGAnswer {
  const explanation = refusalExplanation(reason, locale)
  return { status: 'insufficient_evidence', answer: explanation, claims: [], citations: [], model, retrievedCount, refusalReason: reason, explanation }
}

function refusalForError(error: unknown): RefusalReason {
  if (error instanceof LocusProviderError && /not configured|API key/i.test(error.message)) return 'provider_unconfigured'
  if (error instanceof LocusProviderError && /invalid|fabricated|mismatched|ungrounded|shape|citation/i.test(error.message)) return 'invalid_model_response'
  return 'provider_unavailable'
}

async function trackedAnswer(input: RagServiceInput, chunks: EvidenceChunk[], options: RagServiceOptions, model: string, locale: 'ru' | 'en'): Promise<RAGAnswer> {
  try {
    const answer = await answerPrepared(input, chunks, options, model, locale)
    recordRagRequest(answer.status)
    if (answer.status === 'insufficient_evidence') recordRagRefusal(answer.refusalReason)
    else if (answer.model === 'deterministic-evidence-fallback') recordRagRefusal('provider_unconfigured')
    return answer
  } catch (error) {
    recordRagRequest('failed')
    recordRagRefusal(refusalForError(error))
    throw error
  }
}

async function answerPrepared(input: RagServiceInput, chunks: EvidenceChunk[], options: RagServiceOptions, model: string, locale: 'ru' | 'en'): Promise<RAGAnswer> {
  const normalizedQuestion = safeQuestion(input.question)
  if (!normalizedQuestion) return insufficient('invalid_question', locale, model, 0)
  const retrievalOptions = { applicant: input.applicant ? { degree: input.applicant.degree, field: input.applicant.field, intake: input.applicant.intake } : undefined }
  const retrieved = retrieveEvidence(chunks, normalizedQuestion, 8, retrievalOptions)
  if (retrieved.length === 0) {
    const reason: RefusalReason = input.applicant && /\b(?:ielts|toefl|sat|act|duolingo|gre|gmat|gpa|admission|requirement|minimum|поступ|требован|балл)/i.test(normalizedQuestion) && !hasProgramSpecificAdmissionsEvidence(chunks, retrievalOptions.applicant) ? 'admissions_program_requirement_missing' : 'no_relevant_evidence'
    return insufficient(reason, locale, model, 0)
  }
  const selected = retrieved.map((item) => item.chunk)
  if (!options.chatClient && !process.env.WIKIVIBE_API_KEY?.trim()) return evidenceOnlyFallback(selected, locale, model)
  let raw: string
  try {
    raw = await (options.chatClient || wikivibeClient).complete({ system: ragSystemPrompt(), user: promptWithEvidence(selected, normalizedQuestion, MAX_PROMPT_CHARS, input.applicant), model, signal: input.signal })
  } catch (error) {
    if (error instanceof LocusProviderError) throw error
    throw new LocusProviderError('Wikivibe', 'request failed', error)
  }
  let parsed: ModelPayload
  try {
    parsed = parseModelPayload(raw, model)
  } catch (error) {
    if (error instanceof LocusProviderError) throw error
    throw new LocusProviderError('Wikivibe', 'invalid model response', error)
  }
  const citations = serverCitations(parsed.citations, selected)
  const claims = serverClaims(parsed.claims, selected)
  if (!citations || !claims) throw new LocusProviderError('Wikivibe', 'returned fabricated or mismatched citations')
  if (parsed.status === 'insufficient_evidence') return insufficient('no_relevant_evidence', locale, parsed.model || model, selected.length)
  if (claims.length === 0 || citations.length === 0) throw new LocusProviderError('Wikivibe', 'returned an ungrounded answer')
  const dedupedClaims = claims.filter((claim, index, all) => all.findIndex((other) => other.text === claim.text && other.citations[0]?.chunkId === claim.citations[0]?.chunkId && other.citations[0]?.quote === claim.citations[0]?.quote) === index)
  return { status: 'answered', answer: dedupedClaims.map((claim) => claim.text).join('\n\n'), claims: dedupedClaims, citations: uniqueCitations(dedupedClaims.flatMap((claim) => claim.citations)), model: parsed.model || model, retrievedCount: selected.length }
}

export async function answerFromProfile(input: RagServiceInput, options: RagServiceOptions = {}): Promise<RAGAnswer> {
  return trackedAnswer(input, buildEvidenceChunks(input.profile), options, options.model || RAG_MODEL, options.locale || 'ru')
}

export interface RagServiceBatchInput {
  profile: LocusProfile
  questions: string[]
  applicant?: ApplicantContext
  signal?: AbortSignal
}

export async function answerManyFromProfile(inputs: RagServiceBatchInput, options: RagServiceOptions = {}): Promise<RAGAnswer[]> {
  const chunks = buildEvidenceChunks(inputs.profile)
  const model = options.model || RAG_MODEL
  const locale = options.locale || 'ru'
  const answers: RAGAnswer[] = []
  let next = 0
  const worker = async () => {
    while (next < inputs.questions.length) {
      const index = next++
      answers[index] = await trackedAnswer({ profile: inputs.profile, question: inputs.questions[index], applicant: inputs.applicant, signal: inputs.signal }, chunks, options, model, locale)
    }
  }
  await Promise.all([worker(), worker()])
  return answers
}
