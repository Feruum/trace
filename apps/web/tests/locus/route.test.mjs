import { describe, expect, test } from 'bun:test'
import { POST as profilePOST } from '../../app/api/locus/profile/route.ts'
import { POST as assistantPOST, validateAssistantRequest } from '../../app/api/locus/assistant/route.ts'
import proxy from '../../proxy.ts'
import { NextRequest } from 'next/server'

function request(body) { return new Request('http://localhost/api/locus/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }

describe('TRACE public routes', () => {
  test('serves the Core TRACE workspace at its public alias', async () => {
    const response = await proxy(new NextRequest('http://localhost/workspace'))
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-rewrite')).toMatch(/\/orgs\/default\/?$/)
  })

  test('preserves workspace query parameters in the tenant rewrite', async () => {
    const response = await proxy(new NextRequest('http://localhost/workspace?source=hero'))
    expect(response.headers.get('x-middleware-rewrite')).toContain('/orgs/default/?source=hero')
  })
  test('rejects malformed JSON and invalid profile requests before contacting providers', async () => {
    const malformed = await profilePOST(new Request('http://localhost/api/locus/profile', { method: 'POST', body: '{' }))
    expect(malformed.status).toBe(400)
    expect(await malformed.json()).toEqual({ code: 'INVALID_REQUEST', message: 'Введите название университета.' })
    const invalid = await profilePOST(request({ query: '' }))
    expect(invalid.status).toBe(400)
  })

  test('returns JSON for a valid unknown profile request without requiring a session', async () => {
    const response = await profilePOST(request({ query: 'zzzz university 9f3c', locale: 'en' }))
    expect(response.headers.get('content-type')).toContain('application/json')
    expect([404, 502]).toContain(response.status)
  })

  test('validates assistant scope and requires an opaque profile token', async () => {
    const profileToken = '123e4567-e89b-42d3-a456-426614174000'
    expect(validateAssistantRequest({ profileToken, question: 'What is documented?' })).toEqual({ profileToken, question: 'What is documented?' })
    expect(validateAssistantRequest({ entityId: 'Q42', question: 'What is documented?' })).toBeNull()
    const response = await assistantPOST(request({ entityId: 'Q42', question: 'What is documented?' }))
    expect(response.status).toBe(400)
  })
  test('requires a server-cached profile before answering assistant questions', async () => {
    const response = await assistantPOST(request({ profileToken: '123e4567-e89b-42d3-a456-426614174000', question: 'What is documented?' }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'PROFILE_EXPIRED' })
  })

  test('rate limits repeated public assistant requests before provider work', async () => {
    const headers = { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.77' }
    const body = JSON.stringify({ profileToken: '123e4567-e89b-42d3-a456-426614174000', question: 'What is documented?' })
    let response
    for (let index = 0; index < 13; index += 1) {
      response = await assistantPOST(new Request('http://localhost/api/locus/assistant', { method: 'POST', headers, body }))
    }
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBeTruthy()
    expect(await response.json()).toMatchObject({ code: 'RATE_LIMITED' })
  })
})
