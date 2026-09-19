import { NextResponse } from 'next/server'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { buildLocusProfile } from '@lib/locus/pipeline'
import { cacheProfile } from '@lib/locus/profile-cache'
import { loadProfile, saveProfile } from '@lib/locus/trace-store'
import { profileView, validateProfileFilters } from '@lib/locus/profile-view'
import { clientRateLimitKey, takeRateLimit } from '@lib/locus/rate-limit'
import { parseApplicantContext } from '@lib/locus/types'
import { captureTraceError } from '@lib/locus/observability'
import { isWikidataId } from '@lib/locus/profile-loader'

function traceJson<T>(body: T, init?: ResponseInit): Response {
  return applyTraceSecurityHeaders(NextResponse.json(body, init))
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Context = { params: Promise<{ entityId: string }> }

export async function GET(request: Request, context: Context): Promise<Response> {
  const { entityId } = await context.params
  if (!isWikidataId(entityId)) return traceJson({ code: 'INVALID_ENTITY_ID', message: 'Некорректный идентификатор Wikidata.' }, { status: 400 })
  const filters = validateProfileFilters(new URL(request.url).searchParams)
  if ('error' in filters) return traceJson({ code: 'INVALID_FILTER', message: filters.error }, { status: 400 })

  const rateLimit = takeRateLimit('profile', clientRateLimitKey(request), 8)
  if (!rateLimit.allowed) return traceJson({ code: 'RATE_LIMITED', message: 'Слишком много запросов. Попробуйте позже.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } })

  const locale = new URL(request.url).searchParams.get('locale') === 'ru' ? 'ru' : 'en'
  try {
    const loaded = await loadProfile(entityId)
    if (!loaded.ok) return traceJson({ code: 'STORAGE_UNAVAILABLE', message: 'Постоянное хранилище профиля временно недоступно.' }, { status: 503 })
    let profile = loaded.value
    if (!profile) {
      const result = await buildLocusProfile({ query: entityId, entityId, locale })
      if (result.status !== 'ready') return traceJson(result, { status: result.status === 'not_found' ? 404 : 200 })
      profile = result.profile
      const stored = await saveProfile(profile)
      if (!stored.ok && process.env.TRACE_REDIS_URL?.trim()) return traceJson({ code: 'STORAGE_UNAVAILABLE', message: 'Постоянное хранилище профиля временно недоступно.' }, { status: 503 })
    }
    const profileToken = cacheProfile(profile)
    const view = profileView(profile, filters)
    return traceJson({ status: 'ready', profile: view, profileToken, canonicalUrl: `/api/trace/profile/${entityId}`, lastCheckedAt: view.lastCheckedAt })
  } catch (error) {
    captureTraceError(error, { operation: 'trace_profile_get', entityId })
    return traceJson({ code: 'UPSTREAM_UNAVAILABLE', message: 'Сервис источников временно недоступен.' }, { status: 502 })
  }
}

export function parseProfileApplicant(value: unknown) { return parseApplicantContext(value) }
