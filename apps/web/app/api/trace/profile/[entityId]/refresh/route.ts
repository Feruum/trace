import { NextResponse } from 'next/server'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { buildLocusProfile } from '@lib/locus/pipeline'
import { saveProfile } from '@lib/locus/trace-store'
import { profileView, validateProfileFilters } from '@lib/locus/profile-view'

function traceJson<T>(body: T, init?: ResponseInit): Response {
  return applyTraceSecurityHeaders(NextResponse.json(body, init))
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Context = { params: Promise<{ entityId: string }> }

export async function POST(request: Request, context: Context): Promise<Response> {
  const { entityId } = await context.params
  if (!/^Q[1-9][0-9]*$/.test(entityId)) return traceJson({ code: 'INVALID_ENTITY_ID' }, { status: 400 })
  const filters = validateProfileFilters(new URL(request.url).searchParams)
  if ('error' in filters) return traceJson({ code: 'INVALID_FILTER', message: filters.error }, { status: 400 })
  const result = await buildLocusProfile({ query: entityId, entityId })
  if (result.status !== 'ready') return traceJson(result, { status: result.status === 'not_found' ? 404 : 200 })
  const stored = await saveProfile(result.profile)
  if (!stored.ok) return traceJson({ code: stored.code }, { status: 503 })
  const view = profileView(result.profile, filters)
  return traceJson({ status: 'ready', canonicalUrl: `/api/trace/profile/${entityId}`, profile: view, lastCheckedAt: view.lastCheckedAt })
}
