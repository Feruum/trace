import { describe, expect, test } from 'bun:test'
import { scoreAndAssign } from '../../lib/locus/confidence.ts'

const context = {
  id: 'Q34433', name: 'University of Oxford', aliases: ['Oxford University'], city: 'Oxford', country: 'United Kingdom', description: null, latitude: null, longitude: null, url: 'https://www.wikidata.org/entity/Q34433',
}

function candidate(overrides = {}) {
  return {
    id: 'asset', imageUrl: 'https://images.example/asset.jpg', thumbnailUrl: 'https://images.example/asset-thumb.jpg', landingUrl: 'https://example.org/asset', source: 'openverse', sourceLabel: 'Openverse', title: 'University of Oxford main campus', description: null, creator: 'Creator', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', publishedAt: null, requestedCategory: 'campus', width: 1000, height: 600, metadataText: 'Oxford university campus', collectionText: 'University of Oxford', ...overrides,
  }
}

describe('LOCUS evidence scoring', () => {
  test('rejects generic metadata below the evidence threshold', () => {
    const result = scoreAndAssign(candidate({ title: 'Beautiful building', metadataText: 'architecture', collectionText: null }), context)
    expect(result.asset).toBeNull()
    expect(result.confidence.reasonCodes).toContain('below_threshold')
  })

  test('rejects a candidate without landing URL or license', () => {
    expect(scoreAndAssign(candidate({ landingUrl: '' }), context).asset).toBeNull()
    expect(scoreAndAssign(candidate({ license: '' }), context).asset).toBeNull()
  })

  test('assigns evidence-backed campus and city categories separately', () => {
    const campus = scoreAndAssign(candidate(), context)
    expect(campus.asset.primaryCategory).toBe('campus')
    expect(campus.confidence.score).toBeGreaterThanOrEqual(70)
    const city = scoreAndAssign(candidate({ requestedCategory: 'city', title: 'Oxford street landmark', metadataText: 'Oxford street city landmark', collectionText: 'Oxford city photographs' }), context)
    expect(city.asset.primaryCategory).toBe('city')
  })
})
