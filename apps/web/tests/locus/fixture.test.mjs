import { describe, expect, test } from 'bun:test'
import { createTraceFixtureFetch } from '../../lib/locus/fixture.ts'

describe('TRACE fixture fetch', () => {
  test('routes Wikidata, media, and admissions requests to deterministic valid responses', async () => {
    const fetchImpl = createTraceFixtureFetch()
    const search = await fetchImpl('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Example', {})
    expect(search.ok).toBe(true)
    expect((await search.json()).search[0].id).toBe('Q1')

    const openverse = await fetchImpl('https://api.openverse.org/v1/images/?q=Example%20campus', {})
    expect((await openverse.json()).results[0]).toMatchObject({ license: 'by-sa', foreign_landing_url: expect.stringContaining('example.edu') })

    const admissions = await fetchImpl('https://example.edu/admissions', {})
    expect(admissions.headers.get('content-type')).toContain('text/html')
    expect(await admissions.text()).toContain('IELTS minimum 6.5')
  })
})
