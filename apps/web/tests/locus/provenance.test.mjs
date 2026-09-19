import { describe, expect, test } from 'bun:test'
import { isSafeRemoteMediaUrl, normalizeHtmlMetadata, normalizeHttpUrl, normalizeLicense } from '../../lib/locus/provenance.ts'

describe('provenance normalization', () => {
  test('accepts canonical public URLs and drops fragments', () => {
    expect(normalizeHttpUrl(' HTTPS://example.org/photo#fragment ')).toBe('https://example.org/photo')
    expect(normalizeHttpUrl('file:///tmp/a')).toBeNull()
    expect(normalizeHttpUrl('https://user:pass@example.org/a')).toBeNull()
    expect(isSafeRemoteMediaUrl('http://127.0.0.1/a')).toBe(false)
    expect(isSafeRemoteMediaUrl('https://example.org/a')).toBe(true)
  })

  test('normalizes supported licenses and rejects prose', () => {
    expect(normalizeLicense('<a>CC BY-SA 4.0</a>&nbsp;')).toEqual({ label: 'CC BY-SA 4.0', family: 'cc-by-sa' })
    expect(normalizeLicense('by')).toEqual({ label: 'CC BY', family: 'cc-by' })
    expect(normalizeLicense('all rights reserved')).toBeNull()
  })

  test('strips HTML and decodes entities', () => {
    expect(normalizeHtmlMetadata('Hello <b>world</b><br> &amp; &#x41;')).toBe('Hello world & A')
    expect(normalizeHtmlMetadata('<!-- hidden --> <p> </p>')).toBeNull()
  })
})
