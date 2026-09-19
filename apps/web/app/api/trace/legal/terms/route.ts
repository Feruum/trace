import { NextResponse } from 'next/server'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 3600

const TERMS = `TRACE Terms of Use\nVersion: 2026-09-19\n\nTRACE provides anonymous access to public university evidence and source links. Evidence is collected from third-party providers; availability, accuracy, licensing, and continued access are not guaranteed. You must follow the terms and licenses of linked providers when using any source or media.\n\nTRACE does not make admissions, eligibility, ranking, or compliance guarantees. Preliminary source checks are informational only and are not decisions by a university.\n\nThe service may use transient process memory or operator-configured Redis storage and may report limited operational errors to Sentry. No registration or account is required.\n\nTRACE is provided under the project license (AGPL where applicable), without warranties to the extent permitted by law. Contact the project maintainers with legal or service questions.\n`

export function GET(): Response {
  return applyTraceSecurityHeaders(new NextResponse(TERMS, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
}
