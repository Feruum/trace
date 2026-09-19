import { describe, expect, test } from 'bun:test'
import { NextRequest } from 'next/server'
import { applyTraceSecurityHeaders } from '../../lib/locus/security-headers.ts'
import { GET as healthGET } from '../../app/api/trace/health/route.ts'
import { GET as metricsGET } from '../../app/api/trace/metrics/route.ts'
import { GET as privacyGET } from '../../app/api/trace/legal/privacy/route.ts'
import { GET as termsGET } from '../../app/api/trace/legal/terms/route.ts'

function headerResponse() {
  return applyTraceSecurityHeaders(new Response('ok'))
}

describe('TRACE operational routes', () => {
  test('applies the strict TRACE security headers', () => {
    const response = headerResponse()
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  test('health reports configured RAG mode without contacting providers', async () => {
    const previousKey = process.env.WIKIVIBE_API_KEY
    delete process.env.WIKIVIBE_API_KEY
    let response
    try {
      response = await healthGET(new NextRequest('http://localhost/api/trace/health'))
    } finally {
      if (previousKey === undefined) delete process.env.WIKIVIBE_API_KEY
      else process.env.WIKIVIBE_API_KEY = previousKey
    }
    expect([200, 503]).toContain(response.status)
    const body = await response.json()
    expect(body.rag).toMatchObject({ wikivibeConfigured: false, mode: 'deterministic-fallback' })
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'")
  })

  test('metrics rejects absent and invalid internal credentials without leaking configuration', async () => {
    const absent = await metricsGET(new NextRequest('http://localhost/api/trace/metrics'))
    expect([403, 404]).toContain(absent.status)
    const wrong = await metricsGET(new NextRequest('http://localhost/api/trace/metrics', { headers: { 'x-trace-internal-key': 'wrong' } }))
    expect([403, 404]).toContain(wrong.status)
  })

  test('legal documents are versioned plain text with no-store headers', async () => {
    for (const route of [privacyGET, termsGET]) {
      const response = await route()
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/plain')
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.text()).toContain('TRACE')
    }
  })
})
