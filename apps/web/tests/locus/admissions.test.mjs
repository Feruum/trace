import { describe, expect, test } from 'bun:test'
import { fetchOfficialAdmissions, matchApplicantToAdmissions } from '../../lib/locus/sources/admissions.ts'

const context = {
  id: 'Q1', name: 'Example University', aliases: [], city: 'London', country: 'United Kingdom', description: 'university', latitude: null, longitude: null, url: 'https://www.wikidata.org/entity/Q1', officialUrl: 'https://example.edu',
}

function htmlResponse(html, status = 200) {
  return new Response(html, { status, headers: { 'content-type': 'text/html' } })
}

describe('TRACE official admissions evidence', () => {
  test('blocks private and credential-bearing official URLs before fetching', async () => {
    for (const officialUrl of ['http://127.0.0.1/admin', 'http://[::1]/', 'http://user:pass@example.edu/']) {
      let called = false
      const result = await fetchOfficialAdmissions({ ...context, officialUrl }, { fetchImpl: async () => { called = true; return htmlResponse('IELTS 6.5') } })
      expect(called).toBe(false)
      expect(result.evidence).toEqual([])
      expect(result.warnings[0]).toContain('blocked')
    }
  })

  test('does not over-block public addresses next to documentation ranges', async () => {
    let called = false
    const result = await fetchOfficialAdmissions({ ...context, officialUrl: 'http://198.51.101.10/admissions' }, { fetchImpl: async () => { called = true; return htmlResponse('IELTS minimum 6.5') } })

    expect(called).toBe(true)
    expect(result.evidence).toHaveLength(1)
  })

  test('rejects redirects and oversized official HTML', async () => {
    const redirected = await fetchOfficialAdmissions(context, { fetchImpl: async () => htmlResponse('', 302) })
    expect(redirected.evidence).toEqual([])
    expect(redirected.warnings[0]).toContain('redirect')

    const oversized = await fetchOfficialAdmissions(context, { fetchImpl: async () => htmlResponse(`IELTS 6.5 ${'x'.repeat(2 * 1024 * 1024)}`) })
    expect(oversized.evidence).toEqual([])
    expect(oversized.warnings[0]).toContain('too large')
  })

  test('aborts slow official sources within the configured timeout', async () => {
    const result = await fetchOfficialAdmissions(context, {
      timeoutMs: 5,
      fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      }),
    })

    expect(result.evidence).toEqual([])
    expect(result.warnings[0]).toContain('timed out')
  })

  test('extracts same-origin official exam requirements with exact quotes', async () => {
    const result = await fetchOfficialAdmissions(context, { fetchImpl: async () => htmlResponse('<html><title>English requirements</title><main>International applicants need IELTS overall 6.5, with no band below 6.0. TOEFL iBT minimum 90. SAT minimum 1300.</main></html>') })
    expect(result.evidence).toHaveLength(1)
    expect(result.evidence[0].sourceUrl).toBe('https://example.edu/')
    expect(result.evidence[0].requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ exam: 'IELTS', minimumScore: 6.5, sectionMinimums: { band: 6 } }),
      expect.objectContaining({ exam: 'TOEFL', minimumScore: 90 }),
      expect.objectContaining({ exam: 'SAT', minimumScore: 1300 }),
    ]))
    expect(result.evidence[0].requirements[0].quote).toContain('IELTS overall 6.5')
  })

  test('does not claim admission when official requirements are absent', async () => {
    const result = await fetchOfficialAdmissions({ ...context, officialUrl: undefined }, { fetchImpl: async () => htmlResponse('IELTS 9') })
    expect(result.evidence).toEqual([])
    expect(result.warnings).toContain('Official admissions source is not available.')
  })

  test('matches user exam scores to published requirements conservatively', () => {
    const matches = matchApplicantToAdmissions({ exams: [{ name: 'IELTS', score: 7, sections: { band: 6.5 } }, { name: 'SAT', score: 1200 }] }, [
      { exam: 'IELTS', minimumScore: 6.5, sectionMinimums: { band: 6 }, sourceUrl: 'https://example.edu/', sourceLabel: 'Official university source', quote: 'IELTS overall 6.5, with no band below 6.0.' },
      { exam: 'SAT', minimumScore: 1300, sectionMinimums: {}, sourceUrl: 'https://example.edu/', sourceLabel: 'Official university source', quote: 'SAT minimum 1300.' },
    ])
    expect(matches).toEqual(expect.arrayContaining([
      expect.objectContaining({ exam: 'IELTS', status: 'meets' }),
      expect.objectContaining({ exam: 'SAT', status: 'below' }),
    ]))
  })
})

describe('TRACE bounded official crawl contracts', () => {
  test('crawls ranked same-site admissions links and ignores years/random numbers', async () => {
    const pages = new Map([
      ['https://example.edu/', '<html><title>Example University</title><a href="/admissions">Admissions</a><a href="https://evil.example/apply">Apply</a><a href="/programs/computer-science">Computer Science MSc</a></html>'],
      ['https://example.edu/admissions', '<title>Admissions</title><p>IELTS minimum 6.5; academic year 2026.</p>'],
      ['https://example.edu/programs/computer-science', '<title>Computer Science MSc Admissions</title><p>TOEFL minimum 90 for intake 2026.</p>'],
    ])
    const result = await (await import('../../lib/locus/sources/admissions.ts')).collectOfficialAdmissionsEvidence(context, {
      fetchImpl: async (url) => pages.has(String(url)) ? htmlResponse(pages.get(String(url))) : htmlResponse('', 404),
    })
    expect(result.status).toBe('preliminary_source_check')
    expect(result.evidence.flatMap((item) => item.requirements).map((item) => item.minimumScore)).not.toContain(2026)
    expect(result.evidence.flatMap((item) => item.requirements)).toEqual(expect.arrayContaining([
      expect.objectContaining({ exam: 'IELTS', minimumScore: 6.5 }),
      expect.objectContaining({ exam: 'TOEFL', minimumScore: 90, scope: 'program-specific', level: 'master' }),
    ]))
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(2)
  })

  test('only compares scores against matching program-specific evidence', async () => {
    const { buildPreliminaryAdmissionsChecks } = await import('../../lib/locus/sources/admissions.ts')
    const checks = buildPreliminaryAdmissionsChecks({ field: 'Computer Science', degree: 'master', intake: '2026', exams: [{ name: 'TOEFL', score: 95 }] }, [{
      sourceUrl: 'https://example.edu/programs/computer-science', sourceLabel: 'Official university source', pageTitle: 'Computer Science MSc Admissions', scope: 'program-specific', program: 'Computer Science', level: 'master', intake: '2026', sourceDate: null,
      requirements: [{ exam: 'TOEFL', minimumScore: 90, sectionMinimums: {}, sourceUrl: 'https://example.edu/programs/computer-science', sourceLabel: 'Official university source', quote: 'TOEFL minimum 90.', scope: 'program-specific', program: 'Computer Science', level: 'master', intake: '2026', sourceDate: null }],
    }])
    expect(checks).toEqual([expect.objectContaining({ result: 'published_minimum_met', checkStatus: 'preliminary_source_check', sourceUrl: 'https://example.edu/programs/computer-science' })])
  })
})
