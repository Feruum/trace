import { NextResponse } from 'next/server'
import { LocusProviderError } from '@lib/locus/http'
import { getCachedProfile } from '@lib/locus/profile-cache'
import { answerFromProfile } from '@lib/locus/rag/service'
import { parseApplicantContext, type ApplicantContext } from '@lib/locus/types'
import { clientRateLimitKey, takeRateLimit } from '@lib/locus/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AssistantRequest {
  profileToken: string
  question: string
  locale?: 'ru' | 'en'
  applicant?: ApplicantContext
}

function validateAssistantRequest(input: unknown): AssistantRequest | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const body = input as Record<string, unknown>
  if (typeof body.profileToken !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.profileToken)) return null
  if (typeof body.question !== 'string' || body.question.trim().length === 0 || body.question.trim().length > 500) return null
  if (body.locale !== undefined && body.locale !== 'ru' && body.locale !== 'en') return null
  const applicant = parseApplicantContext(body.applicant)
  if (body.applicant !== undefined && !applicant) return null
  return { profileToken: body.profileToken, question: body.question.trim(), ...(body.locale ? { locale: body.locale } : {}), ...(applicant ? { applicant } : {}) }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Введите вопрос.' }, { status: 400 })
  }
  const input = validateAssistantRequest(body)
  if (!input) return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Введите вопрос.' }, { status: 400 })

  const rateLimit = takeRateLimit('assistant', clientRateLimitKey(request), 12)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Слишком много вопросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  try {
    const profile = getCachedProfile(input.profileToken)
    if (!profile) return NextResponse.json({ code: 'PROFILE_EXPIRED', message: 'Профиль устарел. Сначала заново проверьте университет.' }, { status: 409 })
    const answer = await answerFromProfile({ profile, question: input.question, applicant: input.applicant, signal: request.signal })
    return NextResponse.json({ status: 'ready', answer })
  } catch (error) {
    if (error instanceof LocusProviderError) {
      const timeout = error.message.includes('request failed') || error.message.includes('timeout')
      return NextResponse.json({ code: timeout ? 'ASSISTANT_TIMEOUT' : 'ASSISTANT_PROVIDER_ERROR', message: timeout ? 'Ассистент не ответил вовремя.' : 'Ассистент источников временно недоступен.' }, { status: timeout ? 504 : 502 })
    }
    return NextResponse.json({ code: 'ASSISTANT_PROVIDER_ERROR', message: 'Ассистент источников временно недоступен.' }, { status: 502 })
  }
}

export { validateAssistantRequest }
