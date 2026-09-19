import { NextRequest, NextResponse } from 'next/server'
import { snapshotMetrics } from '@lib/locus/metrics'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { captureTraceError } from '@lib/locus/observability'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

export async function GET(request: NextRequest): Promise<Response> {
  const configuredKey = process.env.TRACE_INTERNAL_KEY
  const suppliedKey = request.headers.get('x-trace-internal-key') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!configuredKey) return applyTraceSecurityHeaders(new NextResponse(null, { status: 404 }))
  if (!constantTimeEqual(suppliedKey, configuredKey)) return applyTraceSecurityHeaders(new NextResponse(null, { status: 403 }))
  try {
    return applyTraceSecurityHeaders(NextResponse.json({ status: 'ready', metrics: snapshotMetrics() }))
  } catch (error) {
    captureTraceError(error, { operation: 'trace_metrics' })
    return applyTraceSecurityHeaders(NextResponse.json({ code: 'METRICS_UNAVAILABLE' }, { status: 503 }))
  }
}

export { constantTimeEqual }
