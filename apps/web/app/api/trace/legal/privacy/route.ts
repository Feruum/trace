import { NextResponse } from 'next/server'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 3600

const PRIVACY = `TRACE Privacy Notice\nVersion: 2026-09-19\n\nTRACE operates anonymously and does not require registration. Public university evidence may be kept transiently in process memory or, when configured by the operator, in Redis-backed storage. Provider links, attribution, and license metadata are returned with evidence and remain subject to the provider's terms.\n\nOperational errors may be sent to Sentry with limited operational context. TRACE does not intentionally send raw questions, source bodies, applicant scores, credentials, or API keys to monitoring. Retention depends on the configured storage and monitoring policies.\n\nTRACE is a research and evidence interface, not an admissions service or guarantee. For questions about this service, contact the project maintainers.\n`

export function GET(): Response {
  return applyTraceSecurityHeaders(new NextResponse(PRIVACY, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
}
