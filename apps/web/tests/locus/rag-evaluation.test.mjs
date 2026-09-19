/* global Bun */
import { describe, expect, test } from 'bun:test'
import { buildEvidenceChunks } from '../../lib/locus/evidence.ts'
import { retrieveEvidence } from '../../lib/locus/rag/retrieve.ts'
import { answerFromProfile } from '../../lib/locus/rag/service.ts'
import { classifyQuestion } from '../../lib/locus/rag/question.ts'

const cases = await Bun.file(new URL('./fixtures/rag-evaluation.json', import.meta.url)).json()

const profile = {
  university: {
    id: 'Q1',
    name: 'North University',
    aliases: [],
    city: 'Astana',
    country: 'Kazakhstan',
    description: 'research university in Astana',
    latitude: null,
    longitude: null,
    url: 'https://www.wikidata.org/entity/Q1',
  },
  summary: 'research university in Astana',
  summarySourceUrl: 'https://www.wikidata.org/entity/Q1',
  assets: [{
    id: 'campus-1',
    imageUrl: 'https://img.test/campus.jpg',
    thumbnailUrl: 'https://img.test/campus-thumb.jpg',
    landingUrl: 'https://commons.wikimedia.org/wiki/File:Campus.jpg',
    source: 'wikimedia_commons',
    sourceLabel: 'Wikimedia Commons',
    title: 'North University campus',
    creator: 'A. Creator',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    publishedAt: null,
    primaryCategory: 'campus',
    tags: [],
    width: 1000,
    height: 600,
    confidence: { score: 88, level: 'high', reasonCodes: ['university_phrase'] },
    visualDeduplication: 'checked',
  }],
  categories: { campus: [], dormitory: [], classroom: [], library: [], city: [], sport: [], laboratory: [], student_life: [] },
  admissions: {
    evidence: [{
      sourceUrl: 'https://example.edu/programs/computer-science',
      sourceLabel: 'Official university source',
      pageTitle: 'Computer Science Bachelor Admissions',
      scope: 'program-specific',
      program: 'Computer Science',
      level: 'bachelor',
      intake: '2026',
      sourceDate: '2026-01-10',
      requirements: [{
        exam: 'IELTS',
        minimumScore: 6.5,
        sectionMinimums: { band: 6 },
        sourceUrl: 'https://example.edu/programs/computer-science',
        sourceLabel: 'Official university source',
        quote: 'IELTS overall 6.5, with no band below 6.0.',
        scope: 'program-specific',
        program: 'Computer Science',
        level: 'bachelor',
        intake: '2026',
        sourceDate: '2026-01-10',
      }],
    }],
    preliminaryChecks: [],
    matches: [],
  },
  generatedAt: '2026-01-01T00:00:00.000Z',
  lastCheckedAt: '2026-01-01T00:00:00.000Z',
  durationMs: 1000,
  warnings: [],
  providerDiagnostics: [],
  stats: { providerCandidates: 1, rejectedForProvenance: 0, duplicatesRemoved: 0, verifiedAssets: 1 },
}

const chunks = buildEvidenceChunks(profile)
const answerCitation = {
  identity: chunks.find((chunk) => chunk.kind === 'identity'),
  media: chunks.find((chunk) => chunk.kind === 'image'),
  admissions: chunks.find((chunk) => chunk.kind === 'admissions'),
}

function categoryFromId(value) {
  const id = typeof value === 'string' ? value : value.id
  return id.match(/(?:identity|media|admissions|unsupported|false-premise|prompt-injection)/)?.[0] ?? 'unknown'
}

function expectedAnswerFor(item) {
  const kind = item.expectedType === 'identity' ? 'identity' : item.expectedType === 'media' ? 'media' : 'admissions'
  const chunk = answerCitation[kind]
  if (!chunk) throw new Error(`No fixed evidence chunk for ${kind}`)
  return JSON.stringify({
    status: 'answered',
    answer: `Grounded ${kind} evidence.`,
    claims: [{ text: `Grounded ${kind} evidence.`, citations: [{ chunkId: chunk.id, quote: chunk.text }] }],
    citations: [{ chunkId: chunk.id, quote: chunk.text }],
  })
}

describe('TRACE bilingual RAG evaluation set', () => {
  test('contains exactly 100 balanced, schema-conformant deterministic cases', () => {
    expect(cases).toHaveLength(100)
    const required = ['id', 'locale', 'question', 'expectedType', 'expectedOutcome', 'requiresOfficialProgramEvidence']
    const allowedTypes = new Set(['identity', 'media', 'admissions', 'general'])
    const allowedOutcomes = new Set(['answered', 'insufficient_evidence', 'safe_refusal'])
    const ids = new Set()
    for (const item of cases) {
      expect(Object.keys(item).sort()).toEqual([...required].sort())
      expect(ids.has(item.id)).toBe(false)
      ids.add(item.id)
      expect(['ru', 'en']).toContain(item.locale)
      expect(typeof item.question).toBe('string')
      expect(item.question.length).toBeGreaterThan(0)
      expect(allowedTypes.has(item.expectedType)).toBe(true)
      expect(allowedOutcomes.has(item.expectedOutcome)).toBe(true)
      expect(typeof item.requiresOfficialProgramEvidence).toBe('boolean')
    }
    for (const locale of ['ru', 'en']) {
      const localized = cases.filter((item) => item.locale === locale)
      expect(localized).toHaveLength(50)
      expect(new Set(localized.map(categoryFromId))).toEqual(new Set(['identity', 'media', 'admissions', 'unsupported', 'false-premise', 'prompt-injection']))
      expect(localized.filter((item) => categoryFromId(item.id) === 'identity' || categoryFromId(item.id) === 'media')).toHaveLength(10)
      expect(localized.filter((item) => categoryFromId(item.id) === 'admissions')).toHaveLength(10)
      expect(localized.filter((item) => categoryFromId(item.id) === 'unsupported')).toHaveLength(10)
      expect(localized.filter((item) => categoryFromId(item.id) === 'false-premise')).toHaveLength(10)
      expect(localized.filter((item) => categoryFromId(item.id) === 'prompt-injection')).toHaveLength(10)
    }
  })

  test('runs all cases grounded, without a live key, fabricated citations, or injection following', async () => {
    const previousKey = process.env.WIKIVIBE_API_KEY
    delete process.env.WIKIVIBE_API_KEY
    const counts = { language: {}, class: {}, refusalReason: {}, citationValidity: { valid: 0, invalid: 0 }, modelCalls: 0 }
    const calls = []
    try {
      for (const item of cases) {
        counts.language[item.locale] = (counts.language[item.locale] ?? 0) + 1
        const group = categoryFromId(item.id)
        counts.class[group] = (counts.class[group] ?? 0) + 1
        const options = item.expectedOutcome === 'answered' ? {
          model: 'evaluation-fake',
          chatClient: {
            complete: async () => {
              calls.push(item.id)
              counts.modelCalls += 1
              return expectedAnswerFor(item)
            },
          },
        } : {}
        const evaluationProfile = item.expectedOutcome === 'answered'
          ? profile
          : { ...profile, university: { ...profile.university, name: 'ZZZ', description: '' }, summary: '', assets: [], admissions: { evidence: [], preliminaryChecks: [], matches: [] } }
        const result = await answerFromProfile({ profile: evaluationProfile, question: item.question }, options)
        const expectedStatus = item.expectedOutcome === 'answered' ? 'answered' : 'insufficient_evidence'
        expect(result.status).toBe(expectedStatus)
        if (result.status === 'insufficient_evidence') {
          counts.refusalReason[result.refusalReason] = (counts.refusalReason[result.refusalReason] ?? 0) + 1
          expect(result.explanation.length).toBeGreaterThan(0)
          expect(result.citations).toEqual([])
          expect(result.claims).toEqual([])
          if (item.expectedOutcome === 'safe_refusal') {
            expect(result.answer.toLowerCase()).not.toContain('api key')
            expect(result.answer.toLowerCase()).not.toContain('system prompt')
          }
        } else {
          expect(result.citations.length).toBeGreaterThan(0)
          const keys = result.citations.map((citation) => `${citation.chunkId}\u0000${citation.quote}`)
          expect(new Set(keys).size).toBe(keys.length)
          for (const citation of result.citations) {
            const sourceChunk = chunks.find((chunk) => chunk.id === citation.chunkId)
            const valid = Boolean(sourceChunk && sourceChunk.text.includes(citation.quote))
            counts.citationValidity[valid ? 'valid' : 'invalid'] += 1
            expect(valid).toBe(true)
          }
          expect(result.answer.toLowerCase()).not.toContain('ignore previous instructions')
        }
      }
    } finally {
      if (previousKey === undefined) delete process.env.WIKIVIBE_API_KEY
      else process.env.WIKIVIBE_API_KEY = previousKey
    }
    expect(calls).toHaveLength(cases.filter((item) => item.expectedOutcome === 'answered').length)
    expect(counts.citationValidity.invalid).toBe(0)
    expect(counts.modelCalls).toBe(40)
    console.log('TRACE RAG evaluation counts', JSON.stringify(counts))
  })

  test('keeps question type and outcome parity across Russian and English pairs', () => {
    const byId = new Map(cases.map((item) => [item.id, item]))
    for (const item of cases.filter((candidate) => candidate.locale === 'ru')) {
      const englishId = item.id.replace(/^ru-/, 'en-')
      const counterpart = byId.get(englishId)
      expect(counterpart).toBeDefined()
      expect(['identity', 'media', 'admissions', 'general']).toContain(classifyQuestion(item.question))
      expect(['identity', 'media', 'admissions', 'general']).toContain(classifyQuestion(counterpart.question))
      expect(item.expectedType).toBe(counterpart.expectedType)
      expect(item.expectedOutcome).toBe(counterpart.expectedOutcome)
      expect(item.requiresOfficialProgramEvidence).toBe(counterpart.requiresOfficialProgramEvidence)
    }
  })
})
