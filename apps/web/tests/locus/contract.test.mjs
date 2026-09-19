import { describe, expect, test } from 'bun:test'
import { LOCUS_CATEGORIES, emptyCategoryRecord, validateProfileRequest } from '../../lib/locus/types.ts'
import { cacheProfile, getCachedProfile } from '../../lib/locus/profile-cache.ts'

const profile = {
  university: { id: 'Q42', name: 'Example University' },
  assets: [],
  categories: emptyCategoryRecord(),
}

describe('LOCUS normalized contract', () => {
  test('validates and trims a request without changing its serialized shape', () => {
    expect(validateProfileRequest({ query: '  Oxford  ', locale: 'en' })).toEqual({
      ok: true,
      value: { query: 'Oxford', locale: 'en' },
    })
  })

  test('rejects an empty, overlong, or malformed request', () => {
    expect(validateProfileRequest({ query: ' ' })).toEqual({
      ok: false,
      message: 'Введите название университета.',
    })
    expect(validateProfileRequest({ query: 'x'.repeat(121) }).ok).toBe(false)
    expect(validateProfileRequest({ query: 'Oxford', entityId: 'not-a-qid' }).ok).toBe(false)
    expect(validateProfileRequest(null).ok).toBe(false)
  })

  test('keeps every required category in a serializable profile record', () => {
    const categories = emptyCategoryRecord()
    expect(Object.keys(categories)).toEqual([...LOCUS_CATEGORIES])
    expect(Object.values(categories).every((items) => Array.isArray(items))).toBe(true)
  })

  test('isolates repeated university profiles behind unique opaque tokens', () => {
    const first = cacheProfile(profile)
    const second = cacheProfile(profile)
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(second).not.toBe(first)
    expect(getCachedProfile(first)).toBe(profile)
    expect(getCachedProfile(second)).toBe(profile)
  })

  test('keeps optional applicant context fields and trims their values', () => {
    expect(validateProfileRequest({ query: 'MIT', applicant: { country: ' USA ', field: ' Computer science ', interest: ' Technology ', budget: '30k-plus', exams: [] } })).toMatchObject({
      ok: true,
      value: { applicant: { country: 'USA', field: 'Computer science', interest: 'Technology', budget: '30k-plus', exams: [] } },
    })
  })
})
