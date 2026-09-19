import { describe, expect, test } from 'bun:test'
import { GET as explicitProfileGET } from '../../app/api/trace/profile/[entityId]/route.ts'
import { explicitProfileRequest, isWikidataId } from '../../lib/locus/profile-loader.ts'

describe('TRACE explicit profile route', () => {
  test('accepts only positive Wikidata Q-ids and preserves the canonical request shape', () => {
    expect(isWikidataId('Q180865')).toBe(true)
    expect(isWikidataId('Q1')).toBe(true)
    expect(isWikidataId('q180865')).toBe(false)
    expect(isWikidataId('Q0')).toBe(false)
    expect(isWikidataId('University of Toronto')).toBe(false)
    expect(explicitProfileRequest('Q180865', 'en')).toEqual({ query: 'Q180865', entityId: 'Q180865', locale: 'en' })
  })

  test('rejects an invalid path id before contacting providers', async () => {
    const response = await explicitProfileGET(new Request('http://localhost/api/trace/profile/not-a-qid'), { params: Promise.resolve({ entityId: 'not-a-qid' }) })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'INVALID_ENTITY_ID' })
  })
})
