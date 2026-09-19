/* global Bun */
import { describe, expect, test } from 'bun:test'
import { buildEvidenceChunks } from '../../lib/locus/evidence.ts'
import { retrieveEvidence } from '../../lib/locus/rag/retrieve.ts'
import { answerFromProfile } from '../../lib/locus/rag/service.ts'
import { ragSystemPrompt } from '../../lib/locus/rag/prompt.ts'
import { LocusProviderError } from '../../lib/locus/http.ts'

const profile = {
  university: { id: 'Q1', name: 'North University', aliases: [], city: 'Astana', country: 'Kazakhstan', description: 'research university in Astana', latitude: null, longitude: null, url: 'https://www.wikidata.org/entity/Q1' },
  summary: 'research university in Astana',
  summarySourceUrl: 'https://www.wikidata.org/entity/Q1',
  assets: [{ id: 'campus-1', imageUrl: 'https://img.test/campus.jpg', thumbnailUrl: 'https://img.test/campus-thumb.jpg', landingUrl: 'https://commons.wikimedia.org/wiki/File:Campus.jpg', source: 'wikimedia_commons', sourceLabel: 'Wikimedia Commons', title: 'North University campus', creator: 'A. Creator', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', publishedAt: null, primaryCategory: 'campus', tags: [], width: 1000, height: 600, confidence: { score: 88, level: 'high', reasonCodes: ['university_phrase'] }, visualDeduplication: 'checked' }],
  categories: { campus: [], dormitory: [], classroom: [], library: [], city: [], sport: [], laboratory: [], student_life: [] },
  generatedAt: '2026-01-01T00:00:00.000Z', durationMs: 1000, warnings: [], stats: { providerCandidates: 1, rejectedForProvenance: 0, duplicatesRemoved: 0, verifiedAssets: 1 },
}

describe('TRACE grounded RAG', () => {
  test('builds bounded source chunks and retrieves relevant evidence', () => {
    const chunks = buildEvidenceChunks(profile)
    expect(chunks.length).toBe(3)
    expect(retrieveEvidence(chunks, 'What is the campus source and license?').map((item) => item.chunk.id)).toContain('image:campus-1')
    expect(chunks.every((chunk) => chunk.text.length <= 700)).toBe(true)
  })

  test('generates only from retrieved evidence and attaches server-owned citations', async () => {
    const calls = []
    const result = await answerFromProfile({ profile, question: 'What is the campus source and license?' }, {
      model: 'gpt-5.6-luna',
      chatClient: {
        complete: async (input) => {
          calls.push(input)
          return JSON.stringify({ status: 'answered', answer: 'The campus record is licensed as CC BY-SA 4.0.', claims: [{ text: 'The campus record is licensed as CC BY-SA 4.0.', citations: [{ chunkId: 'image:campus-1', quote: 'Название / Title: North University campus.' }] }], citations: [{ chunkId: 'image:campus-1', quote: 'Название / Title: North University campus.' }] })
        },
      },
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].system).toContain('untrusted data')
    expect(result.status).toBe('answered')
    expect(result.citations).toEqual([{ chunkId: 'image:campus-1', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Campus.jpg', sourceLabel: 'Wikimedia Commons', quote: 'Название / Title: North University campus.' }])
  })

  test('returns a visible insufficient-evidence result for unsupported questions', async () => {
    let calls = 0
    const result = await answerFromProfile({ profile, question: 'What is the tuition cost and climate?' }, {
      chatClient: { complete: async () => { calls += 1; return '' } },
    })
    expect(result).toMatchObject({ status: 'insufficient_evidence', citations: [] })
    expect(calls).toBe(0)
  })

  test('surfaces provider failure as a typed server error', async () => {
    await expect(answerFromProfile({ profile, question: 'What is the campus source?' }, {
      chatClient: { complete: async () => { throw new LocusProviderError('Wikivibe', 'HTTP 503') } },
    })).rejects.toMatchObject({ provider: 'Wikivibe' })
  })

  test('rejects fabricated or mismatched model citations', async () => {
    await expect(answerFromProfile({ profile, question: 'What is the campus source?' }, {
      chatClient: { complete: async () => JSON.stringify({ status: 'answered', answer: 'The campus is verified.', claims: [{ text: 'The campus is verified.', citations: [{ chunkId: 'image:campus-1', quote: 'fabricated quote' }] }], citations: [{ chunkId: 'image:campus-1', quote: 'fabricated quote' }] }) },
    })).rejects.toBeInstanceOf(LocusProviderError)
  })

  test('renders the validated claim set instead of trusting unsupported answer text', async () => {
    const result = await answerFromProfile({ profile, question: 'What is the campus source?' }, {
      chatClient: { complete: async () => JSON.stringify({ status: 'answered', answer: 'Supported claim. Unsupported claim.', claims: [{ text: 'Supported claim.', citations: [{ chunkId: 'image:campus-1', quote: 'Название / Title: North University campus.' }] }], citations: [{ chunkId: 'image:campus-1', quote: 'Название / Title: North University campus.' }] }) },
    })
    expect(result.answer).toBe('Supported claim.')
    expect(result.answer).not.toContain('Unsupported claim')
  })

  test('returns a visible insufficient-evidence result for invalid questions', async () => {
    const result = await answerFromProfile({ profile, question: ' '.repeat(3) })
    expect(result.status).toBe('insufficient_evidence')
    expect(result.citations).toEqual([])
  })
  test('rejects the removed alternate claim and quotes shape', async () => {
    await expect(answerFromProfile({ profile, question: 'What is the campus source?' }, {
      chatClient: { complete: async () => JSON.stringify({ status: 'answered', answer: 'Ignored model summary.', claims: [{ claim: 'The campus title is documented.', quotes: ['Название / Title: North University campus.'] }], citations: [{ chunkId: 'image:campus-1', quote: 'Название / Title: North University campus.' }] }) },
    })).rejects.toBeInstanceOf(LocusProviderError)
  })

  test('refuses admissions comparison without program-specific evidence before model work', async () => {
    let calls = 0
    const result = await answerFromProfile({ profile, question: 'Do my scores meet the published requirements?', applicant: { degree: 'bachelor', field: 'Computer Science', exams: [{ name: 'IELTS', score: 7, sections: { writing: 6.5 } }] } }, {
      chatClient: { complete: async () => { calls += 1; return '' } },
    })
    expect(result).toMatchObject({ status: 'insufficient_evidence', refusalReason: 'admissions_program_requirement_missing' })
    expect(result.explanation).toBeTruthy()
    expect(calls).toBe(0)
  })
  test('uses the provider adapter timeout budget above observed latency', async () => {
    const source = await Bun.file(new URL('../../lib/locus/rag/wikivibe.ts', import.meta.url)).text()
    expect(source).toContain('REQUEST_TIMEOUT_MS = 35_000')
  })

  test('states the exact claim object schema required by strict validation', () => {
    const prompt = ragSystemPrompt()
    expect(prompt).toContain('status must be exactly answered or insufficient_evidence')
    expect(prompt).toContain('claims entries must use exactly text and citations')
    expect(prompt).toContain('Each citation must use exactly chunkId and quote')
  })
  test('requires official admissions evidence for score matching answers', async () => {
    let calls = 0
    const result = await answerFromProfile({ profile, question: 'Does my IELTS meet the published minimum?', applicant: { exams: [{ name: 'IELTS', score: 7 }] } }, {
      chatClient: { complete: async () => { calls += 1; return '' } },
    })
    expect(result.refusalReason).toBe('admissions_program_requirement_missing')
    expect(calls).toBe(0)
  })

  test('retrieves official admissions evidence when available', () => {
    const admissionsProfile = {
      ...profile,
      university: { ...profile.university, officialUrl: 'https://example.edu/admissions' },
      admissions: {
        evidence: [{
          sourceUrl: 'https://example.edu/admissions',
          sourceLabel: 'Official university source',
          requirements: [{ exam: 'IELTS', minimumScore: 6.5, sectionMinimums: { band: 6 }, sourceUrl: 'https://example.edu/admissions', sourceLabel: 'Official university source', quote: 'IELTS overall 6.5, with no band below 6.0.' }],
        }],
        matches: [],
      },
    }
    const chunks = buildEvidenceChunks(admissionsProfile)

    expect(chunks.some((chunk) => chunk.kind === 'admissions' && chunk.text.includes('IELTS'))).toBe(true)
    expect(retrieveEvidence(chunks, 'What is the official IELTS minimum?').some((item) => item.chunk.kind === 'admissions')).toBe(true)
  })
})
