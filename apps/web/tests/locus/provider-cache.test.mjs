import { describe, expect, test } from 'bun:test'
import { clearProviderResponseCache, providerResponseCache } from '../../lib/locus/provider-cache.ts'
import { fetchJson } from '../../lib/locus/http.ts'

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
}

describe('provider response cache', () => {
  test('clones successful values and expires entries', async () => {
    clearProviderResponseCache()
    let calls = 0
    const fetchImpl = async () => { calls += 1; return jsonResponse({ nested: { value: 1 } }) }
    const first = await fetchJson({ provider: 'test', url: 'https://example.org/api#x', fetchImpl, cacheTtlMs: 20, cacheStore: providerResponseCache })
    first.nested.value = 9
    const second = await fetchJson({ provider: 'test', url: 'https://example.org/api', fetchImpl, cacheTtlMs: 20, cacheStore: providerResponseCache })
    expect(second.nested.value).toBe(1)
    expect(calls).toBe(1)
    await new Promise((resolve) => setTimeout(resolve, 25))
    await fetchJson({ provider: 'test', url: 'https://example.org/api', fetchImpl, cacheTtlMs: 20, cacheStore: providerResponseCache })
    expect(calls).toBe(2)
  })

  test('does not cache failures or malformed JSON', async () => {
    clearProviderResponseCache()
    let calls = 0
    const bad = async () => { calls += 1; return new Response('{', { status: 200 }) }
    await expect(fetchJson({ provider: 'bad', url: 'https://example.org/bad', fetchImpl: bad, cacheTtlMs: 100, cacheStore: providerResponseCache })).rejects.toThrow()
    await expect(fetchJson({ provider: 'bad', url: 'https://example.org/bad', fetchImpl: bad, cacheTtlMs: 100, cacheStore: providerResponseCache })).rejects.toThrow()
    expect(calls).toBe(2)
  })
})
