import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'
import { dedupeAssets } from '../../lib/locus/dedupe.ts'

function asset(overrides = {}) {
  return { id: 'asset', imageUrl: 'https://images.example/asset.jpg', thumbnailUrl: 'https://images.example/asset.jpg', landingUrl: 'https://example.org/asset', source: 'openverse', sourceLabel: 'Openverse', title: 'Oxford campus', creator: null, license: 'CC BY', licenseUrl: null, publishedAt: null, primaryCategory: 'campus', tags: [], width: 100, height: 100, confidence: { score: 70, level: 'high', reasonCodes: [] }, visualDeduplication: 'unavailable', ...overrides }
}

function imageResponse(bytes) { return new Response(bytes, { status: 200, headers: { 'content-type': 'image/png' } }) }

describe('LOCUS image deduplication', () => {
  test('keeps the higher-confidence winner for a visually identical pair', async () => {
    const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: 128, g: 128, b: 128 } } }).png().toBuffer()
    const fetchImpl = async () => imageResponse(bytes)
    const result = await dedupeAssets([
      asset({ id: 'low', confidence: { score: 60, level: 'review', reasonCodes: [] } }),
      asset({ id: 'high', imageUrl: 'https://images.example/other.jpg', confidence: { score: 90, level: 'high', reasonCodes: [] } }),
    ], { fetchImpl })
    expect(result.assets.map((item) => item.id)).toEqual(['high'])
    expect(result.duplicatesRemoved).toBe(1)
    expect(result.assets[0].visualDeduplication).toBe('checked')
  })

  test('keeps a valid asset when thumbnail hashing is unavailable and discloses it', async () => {
    const fetchImpl = async () => new Response(null, { status: 503 })
    const result = await dedupeAssets([asset()], { fetchImpl })
    expect(result.assets[0].visualDeduplication).toBe('unavailable')
    expect(result.warnings).toHaveLength(1)
  })
})
