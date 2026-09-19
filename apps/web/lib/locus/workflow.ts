import type { ApplicantContext, ProfileRequest } from './types'

export type TraceProgressStage = 'wikidata' | 'official' | 'images' | 'dedupe' | 'profile'

const STAGE_INTERVAL_MS = 4_000

export function getTraceProgressStage(elapsedMs: number): TraceProgressStage {
  const index = Math.min(Math.floor(Math.max(0, elapsedMs) / STAGE_INTERVAL_MS), 4)
  return (['wikidata', 'official', 'images', 'dedupe', 'profile'] as const)[index]
}

export function buildTraceProfileRequest(query: string, locale: ProfileRequest['locale'], applicant: ApplicantContext, entityId?: string): ProfileRequest {
  return {
    query: query.trim(),
    ...(entityId ? { entityId } : {}),
    ...(locale ? { locale } : {}),
    ...(applicant.exams.length || applicant.country || applicant.city || applicant.degree || applicant.field || applicant.interest || applicant.intake || applicant.budget ? { applicant } : {}),
  }
}
