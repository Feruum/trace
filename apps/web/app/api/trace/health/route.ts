import { NextResponse } from 'next/server'
import { checkTraceStorage, isTraceStorageConfigured } from '@lib/locus/trace-store'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { captureTraceError } from '@lib/locus/observability'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(): Promise<Response> {
  const timestamp = new Date().toISOString()
  try {
    const configured = isTraceStorageConfigured()
    const storage = configured ? await checkTraceStorage() : { configured: false, reachable: false }
    const healthy = !configured || storage.reachable
    const body = {
      status: healthy ? 'healthy' : 'degraded',
      trace: 'ready',
      storage,
      rag: {
        wikivibeConfigured: Boolean(process.env.WIKIVIBE_API_KEY),
        mode: process.env.WIKIVIBE_API_KEY ? 'wikivibe' : 'deterministic-fallback',
      },
      timestamp,
    }
    return applyTraceSecurityHeaders(NextResponse.json(body, { status: healthy ? 200 : 503 }))
  } catch (error) {
    captureTraceError(error, { operation: 'trace_health' })
    return applyTraceSecurityHeaders(NextResponse.json({
      status: 'degraded',
      trace: 'unavailable',
      storage: { configured: isTraceStorageConfigured(), reachable: false },
      rag: { wikivibeConfigured: Boolean(process.env.WIKIVIBE_API_KEY), mode: process.env.WIKIVIBE_API_KEY ? 'wikivibe' : 'deterministic-fallback' },
      timestamp,
    }, { status: 503 }))
  }
}
