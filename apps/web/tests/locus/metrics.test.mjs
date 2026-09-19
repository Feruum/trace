import { describe, expect, test } from 'bun:test'
import { fetchJson, LocusProviderError } from '../../lib/locus/http.ts'
import { resetMetrics, snapshotMetrics } from '../../lib/locus/metrics.ts'
import { answerFromProfile } from '../../lib/locus/rag/service.ts'

const profile = {
  university: { id: 'Q1', name: 'Metric University', aliases: [], city: 'Astana', country: 'Kazakhstan', description: 'research university', latitude: null, longitude: null, url: 'https://www.wikidata.org/entity/Q1' },
  summary: 'research university',
  summarySourceUrl: 'https://www.wikidata.org/entity/Q1',
  assets: [{ id: 'campus-1', imageUrl: 'https://img.test/campus.jpg', thumbnailUrl: 'https://img.test/campus-thumb.jpg', landingUrl: 'https://commons.wikimedia.org/wiki/File:Campus.jpg', source: 'wikimedia_commons', sourceLabel: 'Wikimedia Commons', title: 'Metric University campus', creator: 'Creator', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', publishedAt: null, primaryCategory: 'campus', tags: [], width: 1000, height: 600, confidence: { score: 88, level: 'high', reasonCodes: ['university_phrase'] }, visualDeduplication: 'checked' }],
  categories: { campus: [], dormitory: [], classroom: [], library: [], city: [], sport: [], laboratory: [], student_life: [] },
  providerDiagnostics: [], lastCheckedAt: '2026-01-01T00:00:00.000Z',
  admissions: { status: 'preliminary_source_check', evidence: [], preliminaryChecks: [], matches: [] },
  generatedAt: '2026-01-01T00:00:00.000Z', durationMs: 1, warnings: [], stats: { providerCandidates: 1, rejectedForProvenance: 0, duplicatesRemoved: 0, verifiedAssets: 1 },
}

function samples(family) { return snapshotMetrics()[family] }

describe('TRACE bounded metrics', () => {
  test('records successful and failed JSON provider requests without payload data', async () => {
    resetMetrics()
    const okFetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 })
    await fetchJson({ provider: 'Openverse', url: 'https://api.openverse.org/v1/images/?q=secret university', fetchImpl: okFetch })
    await expect(fetchJson({ provider: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/w/api.php?q=private applicant', fetchImpl: async () => new Response('denied', { status: 429 }) })).rejects.toBeInstanceOf(LocusProviderError)
    const metrics = snapshotMetrics()
    expect(samples('trace_provider_requests_total')).toEqual(expect.arrayContaining([
      expect.objectContaining({ labels: expect.objectContaining({ provider: 'Openverse', status: 'success' }), value: 1 }),
      expect.objectContaining({ labels: expect.objectContaining({ provider: 'Wikimedia Commons', status: 'failed' }), value: 1 }),
    ]))
    expect(samples('trace_provider_duration_ms')).toEqual(expect.arrayContaining([
      expect.objectContaining({ labels: expect.objectContaining({ provider: 'Openverse' }) }),
      expect.objectContaining({ labels: expect.objectContaining({ provider: 'Wikimedia Commons' }) }),
    ]))
    expect(JSON.stringify(metrics)).not.toContain('secret university')
    expect(JSON.stringify(metrics)).not.toContain('private applicant')
    expect(JSON.stringify(metrics)).not.toContain('denied')
  })

  test('records answered and refusal paths using only status and refusal codes', async () => {
    resetMetrics()
    const answered = await answerFromProfile({ profile, question: 'What is the campus source?' }, {
      chatClient: { complete: async () => JSON.stringify({ status: 'answered', answer: 'Campus is documented.', claims: [{ text: 'Campus is documented.', citations: [{ chunkId: 'image:campus-1', quote: 'Название / Title: Metric University campus.' }] }], citations: [{ chunkId: 'image:campus-1', quote: 'Название / Title: Metric University campus.' }] }) },
    })
    const refused = await answerFromProfile({ profile, question: 'What is the tuition for Secret Applicant?' }, { chatClient: { complete: async () => { throw new Error('must not call') } } })
    expect(answered.status).toBe('answered')
    expect(refused.status).toBe('insufficient_evidence')
    expect(samples('trace_rag_requests_total')).toEqual(expect.arrayContaining([
      expect.objectContaining({ labels: { status: 'answered' }, value: 1 }),
      expect.objectContaining({ labels: { status: 'insufficient_evidence' }, value: 1 }),
    ]))
    expect(samples('trace_rag_refusal_reason_total')).toEqual(expect.arrayContaining([
      expect.objectContaining({ labels: { reason: 'no_relevant_evidence' }, value: 1 }),
    ]))
    const serialized = JSON.stringify(snapshotMetrics())
    expect(serialized).not.toContain('Secret Applicant')
    expect(serialized).not.toContain('tuition')
    expect(serialized).not.toContain('Metric University')
  })

  test('records typed provider and invalid-model failures as safe refusals while preserving errors', async () => {
    resetMetrics()
    await expect(answerFromProfile({ profile, question: 'What is the campus source?', applicant: { field: 'Secret Applicant', exams: [] } }, {
      chatClient: { complete: async () => { throw new LocusProviderError('Wikivibe', 'HTTP 503') } },
    })).rejects.toBeInstanceOf(LocusProviderError)
    await expect(answerFromProfile({ profile, question: 'What is the campus source?' }, {
      chatClient: { complete: async () => '{"status":"answered","answer":"bad","claims":[],"citations":[]}' },
    })).rejects.toBeInstanceOf(LocusProviderError)
    expect(samples('trace_rag_requests_total')).toEqual(expect.arrayContaining([
      expect.objectContaining({ labels: { status: 'failed' }, value: 2 }),
    ]))
    expect(samples('trace_rag_refusal_reason_total')).toEqual(expect.arrayContaining([
      expect.objectContaining({ labels: { reason: 'provider_unavailable' }, value: 1 }),
      expect.objectContaining({ labels: { reason: 'invalid_model_response' }, value: 1 }),
    ]))
    const serialized = JSON.stringify(snapshotMetrics())
    expect(serialized).not.toContain('Secret Applicant')
    expect(serialized).not.toContain('campus source')
    expect(serialized).not.toContain('HTTP 503')
  })
})
