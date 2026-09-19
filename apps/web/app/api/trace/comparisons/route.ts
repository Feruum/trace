import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { applyTraceSecurityHeaders } from '@lib/locus/security-headers'
import { buildLocusProfile } from '@lib/locus/pipeline'
import { appendComparison, listComparisons, loadProfile, saveProfile } from '@lib/locus/trace-store'

function traceJson<T>(body: T, init?: ResponseInit): Response {
  return applyTraceSecurityHeaders(NextResponse.json(body, init))
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
const COOKIE = 'trace_session'

function secret(): string | null { return process.env.TRACE_SESSION_SECRET?.trim() || null }
function sign(id: string, key: string): string { return `${id}.${createHmac('sha256', key).update(id).digest('hex')}` }
function sessionId(request: Request): string | null {
  const key = secret()
  if (!key) return null
  const raw = request.headers.get('cookie')?.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!raw) return null
  const [id, signature] = raw.split('.')
  if (!id || !signature) return null
  const expected = createHmac('sha256', key).update(id).digest('hex')
  if (signature.length !== expected.length) return null
  try { if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null } catch { return null }
  return id
}
function sessionForRequest(request: Request): { id: string; cookie?: string } | null {
  const key = secret()
  if (!key) return null
  const existing = sessionId(request)
  if (existing) return { id: existing }
  const id = randomBytes(24).toString('hex')
  return { id, cookie: `${COOKIE}=${sign(id, key)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000` }
}
async function profileFor(entityId: string) {
  const loaded = await loadProfile(entityId)
  if (!loaded.ok) return loaded
  if (loaded.value) return loaded
  const result = await buildLocusProfile({ query: entityId, entityId })
  if (result.status !== 'ready') return { ok: true as const, value: null }
  const stored = await saveProfile(result.profile)
  if (!stored.ok) return stored
  return { ok: true as const, value: result.profile }
}

export async function GET(request: Request): Promise<Response> {
  const session = sessionForRequest(request)
  if (!session) return traceJson({ code: 'SESSION_STORAGE_UNAVAILABLE' }, { status: 503 })
  const result = await listComparisons(session.id)
  if (!result.ok) return traceJson({ code: result.code }, { status: 503 })
  const response = traceJson({ comparisons: result.value })
  if (session.cookie) response.headers.set('Set-Cookie', session.cookie)
  return response
}

export async function POST(request: Request): Promise<Response> {
  const session = sessionForRequest(request)
  if (!session) return traceJson({ code: 'SESSION_STORAGE_UNAVAILABLE' }, { status: 503 })
  let body: unknown
  try { body = await request.json() } catch { return traceJson({ code: 'INVALID_REQUEST' }, { status: 400 }) }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return traceJson({ code: 'INVALID_REQUEST' }, { status: 400 })
  const input = body as Record<string, unknown>
  const leftEntityId = input.leftEntityId
  const rightEntityId = input.rightEntityId
  if (typeof leftEntityId !== 'string' || typeof rightEntityId !== 'string' || !/^Q[1-9][0-9]*$/.test(leftEntityId) || !/^Q[1-9][0-9]*$/.test(rightEntityId) || leftEntityId === rightEntityId) return traceJson({ code: 'INVALID_ENTITY_ID' }, { status: 400 })
  const [left, right] = await Promise.all([profileFor(leftEntityId), profileFor(rightEntityId)])
  if (!left.ok || !right.ok) return traceJson({ code: (!left.ok ? left.code : !right.ok ? right.code : 'STORAGE_UNAVAILABLE') }, { status: 503 })
  if (!left.value || !right.value) return traceJson({ code: 'PROFILE_NOT_FOUND' }, { status: 404 })
  const entry = { comparisonId: randomUUID(), leftEntityId, rightEntityId, createdAt: new Date().toISOString() }
  const stored = await appendComparison(session.id, entry)
  if (!stored.ok) return traceJson({ code: stored.code }, { status: 503 })
  const response = traceJson({ ...entry, left: left.value, right: right.value }, { status: 201 })
  if (session.cookie) response.headers.set('Set-Cookie', session.cookie)
  return response
}
