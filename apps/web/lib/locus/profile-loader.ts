import { buildLocusProfile, type PipelineOptions } from './pipeline'
import { cacheProfile } from './profile-cache'
import type { ProfileRequest, ProfileResponse } from './types'

export const WIKIDATA_ID_PATTERN = /^Q[1-9][0-9]*$/

export function isWikidataId(value: string): boolean {
  return WIKIDATA_ID_PATTERN.test(value)
}

export function explicitProfileRequest(entityId: string, locale: ProfileRequest['locale'] = 'en'): ProfileRequest {
  return { query: entityId, entityId, locale }
}

export async function buildExplicitProfile(entityId: string, locale: ProfileRequest['locale'] = 'en', options?: PipelineOptions): Promise<ProfileResponse> {
  const result = await buildLocusProfile(explicitProfileRequest(entityId, locale), options)
  return result.status === 'ready' ? { ...result, profileToken: cacheProfile(result.profile) } : result
}
