import { describe, expect, test } from 'bun:test'
import { POST, validateBatchAssistantRequest } from '../../app/api/trace/assistant/batch/route.ts'

const profileToken = '123e4567-e89b-42d3-a456-426614174000'
const request = (body) => new Request('http://localhost/api/trace/assistant/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

describe('TRACE batch assistant route', () => {
  test('validates the bounded batch contract and trims questions', () => {
    expect(validateBatchAssistantRequest({ profileToken, questions: ['  Where is it?  '], locale: 'en' })).toEqual({
      profileToken,
      questions: ['Where is it?'],
      locale: 'en',
    })
    expect(validateBatchAssistantRequest({ profileToken, questions: [] })).toBeNull()
    expect(validateBatchAssistantRequest({ profileToken, questions: [' '.repeat(1)] })).toBeNull()
    expect(validateBatchAssistantRequest({ profileToken, questions: ['x'.repeat(501)] })).toBeNull()
    expect(validateBatchAssistantRequest({ profileToken, questions: Array.from({ length: 9 }, () => 'Question') })).toBeNull()
    expect(validateBatchAssistantRequest({ profileToken, questions: ['Question'], applicant: { exams: [{ name: 'invalid', score: 1 }] } })).toBeNull()
  })

  test('rejects malformed JSON and invalid request bodies before profile lookup', async () => {
    const malformed = await POST(new Request('http://localhost/api/trace/assistant/batch', { method: 'POST', body: '{' }))
    expect(malformed.status).toBe(400)
    expect(await malformed.json()).toMatchObject({ code: 'INVALID_REQUEST' })
    expect(malformed.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
    expect(malformed.headers.get('x-content-type-options')).toBe('nosniff')
    expect(malformed.headers.get('referrer-policy')).toBe('no-referrer')
    expect(malformed.headers.get('cache-control')).toBe('no-store')

    const invalid = await POST(request({ profileToken, questions: ['Question'], locale: 'de' }))
    expect(invalid.status).toBe(400)
    expect(invalid.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
    expect(invalid.headers.get('x-content-type-options')).toBe('nosniff')
    expect(invalid.headers.get('referrer-policy')).toBe('no-referrer')
    expect(invalid.headers.get('cache-control')).toBe('no-store')
  })

  test('requires a transient cached profile and secures the response', async () => {
    const response = await POST(request({ profileToken, questions: ['What is documented?'] }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'PROFILE_EXPIRED' })
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
