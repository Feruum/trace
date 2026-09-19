import { POST as locusAssistantPOST } from '../../locus/assistant/route'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { captureTraceError } from '@lib/locus/observability'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request): Promise<Response> {
  try {
    return applyTraceSecurityHeaders(await locusAssistantPOST(request))
  } catch (error) {
    captureTraceError(error, { operation: 'trace_assistant' })
    return applyTraceSecurityHeaders(new Response(JSON.stringify({ code: 'ASSISTANT_PROVIDER_ERROR', message: 'Ассистент источников временно недоступен.' }), { status: 502, headers: { 'Content-Type': 'application/json' } }))
  }
}

