import { NextResponse } from 'next/server'
import { LocusProviderError } from '@lib/locus/http'
import { getCachedProfile } from '@lib/locus/profile-cache'
import { answerManyFromProfile } from '@lib/locus/rag/service'
import { parseApplicantContext, type ApplicantContext } from '@lib/locus/types'
import { clientRateLimitKey, takeRateLimit } from '@lib/locus/rate-limit'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { captureTraceError } from '@lib/locus/observability'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_QUESTIONS = 8
const MAX_QUESTION_CHARS = 500

export interface BatchAssistantRequest {
  profileToken: string
  questions: string[]
  locale?: 'ru' | 'en'
  applicant?: ApplicantContext
}

export function validateBatchAssistantRequest(input: unknown): BatchAssistantRequest | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const body = input as Record<string, unknown>
  if (typeof body.profileToken !== 'string' || !UUID_PATTERN.test(body.profileToken)) return null
  if (!Array.isArray(body.questions) || body.questions.length < 1 || body.questions.length > MAX_QUESTIONS) return null
  const questions: string[] = []
  for (const value of body.questions) {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed.length === 0 || trimmed.length > MAX_QUESTION_CHARS) return null
    questions.push(trimmed)
  }
  if (body.locale !== undefined && body.locale !== 'ru' && body.locale !== 'en') return null
  const applicant = parseApplicantContext(body.applicant)
  if (body.applicant !== undefined && !applicant) return null
  return {
    profileToken: body.profileToken,
    questions,
    ...(body.locale ? { locale: body.locale } : {}),
    ...(applicant ? { applicant } : {}),
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return applyTraceSecurityHeaders(NextResponse.json({ code: 'INVALID_REQUEST', message: 'Введите вопросы.' }, { status: 400 }))
  }

  const input = validateBatchAssistantRequest(body)
  if (!input) return applyTraceSecurityHeaders(NextResponse.json({ code: 'INVALID_REQUEST', message: 'Введите вопросы.' }, { status: 400 }))

  const rateLimit = takeRateLimit('assistant-batch', clientRateLimitKey(request), 12)
  if (!rateLimit.allowed) {
    return applyTraceSecurityHeaders(NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Слишком много вопросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    ))
  }

  try {
    const profile = getCachedProfile(input.profileToken)
    if (!profile) return applyTraceSecurityHeaders(NextResponse.json({ code: 'PROFILE_EXPIRED', message: 'Профиль устарел. Сначала заново проверьте университет.' }, { status: 409 }))

    const answers = await answerManyFromProfile(
      { profile, questions: input.questions, applicant: input.applicant, signal: request.signal },
      { locale: input.locale },
    )
    return applyTraceSecurityHeaders(NextResponse.json({ status: 'ready', answers }))
  } catch (error) {
    if (error instanceof LocusProviderError) {
      const timeout = error.message.includes('request failed') || error.message.includes('timeout')
      return applyTraceSecurityHeaders(NextResponse.json(
        { code: timeout ? 'ASSISTANT_TIMEOUT' : 'ASSISTANT_PROVIDER_ERROR', message: timeout ? 'Ассистент не ответил вовремя.' : 'Ассистент источников временно недоступен.' },
        { status: timeout ? 504 : 502 },
      ))
    }
    captureTraceError(error, { operation: 'trace_assistant_batch' })
    return applyTraceSecurityHeaders(NextResponse.json({ code: 'ASSISTANT_PROVIDER_ERROR', message: 'Ассистент источников временно недоступен.' }, { status: 502 }))
  }
}
