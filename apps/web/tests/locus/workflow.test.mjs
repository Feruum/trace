import { describe, expect, test } from 'bun:test'
import { buildTraceProfileRequest, getTraceProgressStage } from '../../lib/locus/workflow.ts'

describe('TRACE search workflow', () => {
  test('advances through deterministic evidence stages without claiming completion', () => {
    expect(getTraceProgressStage(0)).toBe('wikidata')
    expect(getTraceProgressStage(3999)).toBe('wikidata')
    expect(getTraceProgressStage(4000)).toBe('official')
    expect(getTraceProgressStage(8000)).toBe('images')
    expect(getTraceProgressStage(12000)).toBe('dedupe')
    expect(getTraceProgressStage(16000)).toBe('profile')
    expect(getTraceProgressStage(90000)).toBe('profile')
  })

  test('preserves the complete validated applicant context in profile requests', () => {
    const applicant = {
      country: 'Canada',
      city: 'Toronto',
      degree: 'master',
      field: 'Computer Science',
      interest: 'AI',
      intake: '2027',
      budget: '30k-plus',
      exams: [{ name: 'IELTS', score: 7 }],
    }
    expect(buildTraceProfileRequest('University of Toronto', 'en', applicant, 'Q180865')).toEqual({
      query: 'University of Toronto',
      entityId: 'Q180865',
      locale: 'en',
      applicant,
    })
  })
})
