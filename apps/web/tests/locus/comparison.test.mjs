import { describe, expect, test } from 'bun:test'
import { compareProfiles, toggleShortlistProfile } from '../../lib/locus/comparison.ts'
import { LOCUS_CATEGORIES } from '../../lib/locus/types.ts'

function profile(id, name, assets = []) {
  const categories = Object.fromEntries(LOCUS_CATEGORIES.map((category) => [category, []]))
  for (const asset of assets) categories[asset.primaryCategory].push(asset)
  return {
    university: {
      id,
      name,
      aliases: [],
      city: null,
      country: null,
      description: null,
      latitude: null,
      longitude: null,
      url: `https://www.wikidata.org/entity/${id}`,
    },
    summary: '',
    summarySourceUrl: `https://www.wikidata.org/entity/${id}`,
    assets,
    categories,
    generatedAt: '2026-01-01T00:00:00.000Z',
    durationMs: 1200,
    warnings: [],
    stats: {
      providerCandidates: 4,
      rejectedForProvenance: 1,
      duplicatesRemoved: 1,
      verifiedAssets: assets.length,
    },
  }
}

function asset(id, category, level = 'high') {
  return {
    id,
    imageUrl: `https://images.example/${id}.jpg`,
    thumbnailUrl: `https://images.example/${id}-thumb.jpg`,
    landingUrl: `https://example.org/${id}`,
    source: 'openverse',
    sourceLabel: 'Openverse',
    title: id,
    creator: null,
    license: 'CC BY',
    licenseUrl: null,
    publishedAt: null,
    primaryCategory: category,
    tags: [],
    width: 100,
    height: 100,
    confidence: { score: level === 'high' ? 80 : 60, level, reasonCodes: [] },
    visualDeduplication: 'checked',
  }
}

describe('TRACE compare and shortlist', () => {
  test('compares evidence coverage without declaring a university winner', () => {
    const left = profile('Q1', 'North University', [asset('campus', 'campus')])
    const right = profile('Q2', 'South University', [asset('dorm', 'dormitory', 'review'), asset('city', 'city')])
    const comparison = compareProfiles(left, right)

    expect(comparison.left.name).toBe('North University')
    expect(comparison.right.name).toBe('South University')
    expect(comparison.left.confirmed).toBe(1)
    expect(comparison.right.review).toBe(1)
    expect(comparison.left.coverage).toBe(1)
    expect(comparison.right.coverage).toBe(2)
    expect(comparison.categories.find((item) => item.category === 'dormitory')).toMatchObject({ left: 0, right: 1 })
    expect(comparison.verdict).toBe('evidence_coverage_only')
  })

  test('keeps a browser-only shortlist capped at two unique profiles', () => {
    const first = profile('Q1', 'North University')
    const second = profile('Q2', 'South University')
    const third = profile('Q3', 'West University')

    expect(toggleShortlistProfile([], first).map((item) => item.university.id)).toEqual(['Q1'])
    expect(toggleShortlistProfile([first], first)).toEqual([])
    expect(toggleShortlistProfile([first, second], third).map((item) => item.university.id)).toEqual(['Q1', 'Q2'])
  })
})
