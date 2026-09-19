import { NextResponse } from 'next/server'
import { LocusProviderError } from '@lib/locus/http'
import { buildLocusProfile } from '@lib/locus/pipeline'
import { cacheProfile } from '@lib/locus/profile-cache'
import { saveProfile } from '@lib/locus/trace-store'
import { validateProfileRequest } from '@lib/locus/types'
import { clientRateLimitKey, takeRateLimit } from '@lib/locus/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', message: 'Введите название университета.' },
      { status: 400 },
    )
  }

  const validation = validateProfileRequest(body)
  if (!validation.ok) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', message: validation.message },
      { status: 400 },
    )
  }

  const rateLimit = takeRateLimit('profile', clientRateLimitKey(request), 8)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  try {
    const result = await buildLocusProfile(validation.value)
    if (result.status === 'ready') {
      const profileToken = cacheProfile(result.profile)
      await saveProfile(result.profile)
      return NextResponse.json({ ...result, profileToken }, { status: 200 })
    }
    if (result.status === 'not_found') {
      return NextResponse.json(result, { status: 404 })
    }
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof LocusProviderError) {
      return NextResponse.json(
        { code: 'UPSTREAM_UNAVAILABLE', message: 'Сервис источников временно недоступен.' },
        { status: 502 },
      )
    }
    return NextResponse.json(
      { code: 'UPSTREAM_UNAVAILABLE', message: 'Сервис источников временно недоступен.' },
      { status: 502 },
    )
  }
}
