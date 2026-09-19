import { POST as locusProfilePOST } from '../../locus/profile/route'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { captureTraceError } from '@lib/locus/observability'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request): Promise<Response> {
  try {
    return applyTraceSecurityHeaders(await locusProfilePOST(request))
  } catch (error) {
    captureTraceError(error, { operation: 'trace_profile' })
    return applyTraceSecurityHeaders(new Response(JSON.stringify({ code: 'UPSTREAM_UNAVAILABLE', message: 'Сервис источников временно недоступен.' }), { status: 502, headers: { 'Content-Type': 'application/json' } }))
  }
}

