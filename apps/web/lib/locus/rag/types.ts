import type { EvidenceChunk } from '../evidence'

export interface ModelCitation {
  chunkId: string
  quote: string
}

export interface ModelClaim {
  text: string
  citations: ModelCitation[]
}

export interface RAGCitation {
  chunkId: string
  sourceUrl: string
  sourceLabel: string
  quote: string
}

export interface RAGClaim {
  text: string
  citations: RAGCitation[]
}

export type RAGRefusalReason = 'invalid_question' | 'no_relevant_evidence' | 'question_type_uncovered' | 'admissions_program_requirement_missing' | 'provider_unconfigured' | 'provider_unavailable' | 'invalid_model_response'

type RAGBase = {
  model: string
  retrievedCount: number
  refusalReason?: RAGRefusalReason
  explanation?: string
}

export type RAGAnswer =
  | ({ status: 'answered'; answer: string; claims: RAGClaim[]; citations: RAGCitation[] } & RAGBase)
  | ({ status: 'insufficient_evidence'; answer: string; claims: []; citations: [] } & RAGBase & { refusalReason: RAGRefusalReason; explanation: string })

export interface RetrievedContext {
  chunks: EvidenceChunk[]
  question: string
}
