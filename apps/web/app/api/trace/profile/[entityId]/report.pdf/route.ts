import { NextResponse } from 'next/server'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { loadProfile } from '@lib/locus/trace-store'
import { validateProfileFilters } from '@lib/locus/profile-view'
import { generateProfileReport } from '@lib/locus/report'

function traceJson<T>(body: T, init?: ResponseInit): Response {
  return applyTraceSecurityHeaders(NextResponse.json(body, init))
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Context = { params: Promise<{ entityId: string }> }

export async function GET(request: Request, context: Context): Promise<Response> {
  const { entityId } = await context.params
  if (!/^Q[1-9][0-9]*$/.test(entityId)) return traceJson({ code: 'INVALID_ENTITY_ID' }, { status: 400 })
  const filters = validateProfileFilters(new URL(request.url).searchParams)
  if ('error' in filters) return traceJson({ code: 'INVALID_FILTER', message: filters.error }, { status: 400 })
  const loaded = await loadProfile(entityId)
  if (!loaded.ok) return traceJson({ code: loaded.code }, { status: 503 })
  if (!loaded.value) return traceJson({ code: 'PROFILE_NOT_FOUND' }, { status: 404 })
  const bytes = generateProfileReport(loaded.value, filters)
  const response = new Response(bytes as BodyInit, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="trace-${entityId}.pdf"`, 'Cache-Control': 'no-store' },
  })
  return applyTraceSecurityHeaders(response)
}
