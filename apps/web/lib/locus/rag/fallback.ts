import type { EvidenceChunk } from '../evidence'
import type { RAGAnswer, RAGClaim, RAGCitation } from './types'

export type RefusalReason = 'invalid_question' | 'no_relevant_evidence' | 'question_type_uncovered' | 'admissions_program_requirement_missing' | 'provider_unconfigured' | 'provider_unavailable' | 'invalid_model_response'

export function refusalExplanation(reason: RefusalReason, locale: 'ru' | 'en' = 'ru'): string {
  const explanations: Record<RefusalReason, { ru: string; en: string }> = {
    invalid_question: { ru: 'Задайте непустой вопрос длиной не более 500 символов.', en: 'Ask a non-empty question of at most 500 characters.' },
    no_relevant_evidence: { ru: 'В доступных источниках нет достаточных данных для ответа.', en: 'The available sources do not contain enough evidence to answer.' },
    question_type_uncovered: { ru: 'Этот тип вопроса не покрыт доступными доказательствами.', en: 'This question type is not covered by the available evidence.' },
    admissions_program_requirement_missing: { ru: 'Нет официального требования для соответствующей программы, уровня и набора.', en: 'No official requirement was found for the matching program, level, and intake.' },
    provider_unconfigured: { ru: 'Модельный провайдер не настроен; ответ сформирован только из проверенных источников.', en: 'The model provider is not configured; the response uses verified sources only.' },
    provider_unavailable: { ru: 'Модельный провайдер временно недоступен.', en: 'The model provider is temporarily unavailable.' },
    invalid_model_response: { ru: 'Модель вернула ответ, который не удалось безопасно проверить.', en: 'The model returned a response that could not be safely validated.' },
  }
  return explanations[reason][locale]
}

function citationForChunk(chunk: EvidenceChunk): RAGCitation {
  return { chunkId: chunk.id, sourceUrl: chunk.sourceUrl, sourceLabel: chunk.sourceLabel, quote: chunk.text }
}

export function evidenceOnlyFallback(chunks: EvidenceChunk[], locale: 'ru' | 'en' = 'ru', model = 'deterministic-evidence-fallback'): RAGAnswer {
  if (chunks.length === 0) {
    const reason: RefusalReason = 'no_relevant_evidence'
    return { status: 'insufficient_evidence', answer: refusalExplanation(reason, locale), claims: [], citations: [], model, retrievedCount: 0, refusalReason: reason, explanation: refusalExplanation(reason, locale) }
  }
  const seen = new Set<string>()
  const claims: RAGClaim[] = []
  for (const chunk of chunks) {
    const key = `${chunk.id}\u0000${chunk.text}`
    if (seen.has(key)) continue
    seen.add(key)
    const citation = citationForChunk(chunk)
    claims.push({ text: chunk.text, citations: [citation] })
  }
  const citations = claims.flatMap((claim) => claim.citations)
  return { status: 'answered', answer: claims.map((claim) => claim.text).join('\n\n'), claims, citations, model, retrievedCount: chunks.length }
}
