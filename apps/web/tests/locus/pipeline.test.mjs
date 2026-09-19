import { describe, expect, test } from 'bun:test'
import { buildLocusProfile, buildProfile, collectCandidates } from '../../lib/locus/pipeline.ts'

const context = { id: 'Q34433', name: 'University of Oxford', aliases: ['Oxford University'], city: 'Oxford', country: 'United Kingdom', description: 'collegiate research university in Oxford, England', latitude: null, longitude: null, url: 'https://www.wikidata.org/entity/Q34433' }
function candidate(id, overrides = {}) { return { id, imageUrl: `https://images.example/${id}.jpg`, thumbnailUrl: `https://images.example/${id}.jpg`, landingUrl: `https://example.org/${id}`, source: 'openverse', sourceLabel: 'Openverse', title: 'University of Oxford campus', description: null, creator: null, license: 'CC BY 4.0', licenseUrl: null, publishedAt: null, requestedCategory: 'campus', width: 1000, height: 600, metadataText: 'University of Oxford campus Oxford', collectionText: 'University of Oxford', ...overrides } }
function jsonResponse(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } }) }

describe('LOCUS pipeline', () => {
  test('preserves every requested category when the provider candidate cap is reached', async () => {
    let requestIndex = 0
    const fetchImpl = async (url) => {
      if (String(url).includes('wikimedia')) return jsonResponse({ query: { pages: {} } })
      const batch = requestIndex++
      return jsonResponse({ results: Array.from({ length: 10 }, (_, index) => ({ id: `${batch}-${index}`, title: `University of Oxford ${batch} ${index}`, url: `https://images.example/${batch}-${index}.jpg`, thumbnail: `https://images.example/${batch}-${index}.jpg`, foreign_landing_url: `https://example.org/${batch}-${index}`, creator: 'Archive', license: 'by' })) })
    }

    const collected = await collectCandidates(context, Date.now() + 20_000, { fetchImpl })

    expect(collected.candidates).toHaveLength(40)
    expect(new Set(collected.candidates.map((item) => item.requestedCategory)).size).toBe(8)
  })

  test('keeps Wikimedia results when Openverse fails and exposes a warning', async () => {
    const fetchImpl = async (url) => { const value = String(url); if (value.includes('openverse')) return jsonResponse({ error: 'rate limited' }, 429); if (value.includes('wikimedia')) return jsonResponse({ query: { pages: { '1': { pageid: 1, title: 'File:Oxford campus.jpg', imageinfo: [{ url: 'https://images.example/oxford.jpg', thumburl: 'https://images.example/oxford-thumb.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Oxford_campus.jpg', width: 1000, height: 600, extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' }, Categories: { value: 'University of Oxford campus' }, ImageDescription: { value: 'University of Oxford campus Oxford' } } }] } } } }); return jsonResponse({}) }
    const collected = await collectCandidates(context, Date.now() + 20_000, { fetchImpl })
    expect(collected.candidates.length).toBeGreaterThan(0)
    expect(collected.warnings.some((warning) => warning.includes('Openverse'))).toBe(true)
  })

  test('returns metadata-only output when every scored candidate is weak', async () => {
    const weak = candidate('weak', { title: 'Beautiful building', metadataText: 'architecture', collectionText: null })
    const fetchImpl = async (url) => { const value = String(url); if (value.includes('wbsearchentities')) return jsonResponse({ search: [{ id: 'Q34433', label: 'University of Oxford', description: 'university' }] }); if (value.includes('wbgetentities')) return jsonResponse({ entities: { Q34433: { labels: { en: { value: 'University of Oxford' } }, descriptions: { en: { value: 'research university' } }, aliases: {}, claims: {} } } }); if (value.includes('openverse')) return jsonResponse({ results: [{ id: 'weak', title: weak.title, url: weak.imageUrl, thumbnail: weak.thumbnailUrl, foreign_landing_url: weak.landingUrl, license: 'by' }] }); if (value.includes('wikimedia')) return jsonResponse({ query: { pages: {} } }); return jsonResponse({}) }
    const result = await buildLocusProfile({ query: 'University of Oxford', locale: 'en' }, { fetchImpl })
    expect(result.status).toBe('ready')
    expect(result.profile.assets).toEqual([])
    expect(result.profile.warnings).toContain('Недостаточно подтвержденных изображений.')
  })

  test('keeps assignments deterministic for the same provider responses', async () => {
    const fetchImpl = async (url) => { const value = String(url); if (value.includes('wbsearchentities')) return jsonResponse({ search: [{ id: 'Q34433', label: 'University of Oxford', description: 'university' }] }); if (value.includes('wbgetentities')) return jsonResponse({ entities: { Q34433: { labels: { en: { value: 'University of Oxford' } }, descriptions: { en: { value: 'research university' } }, aliases: {}, claims: {} } } }); if (value.includes('openverse') || value.includes('wikimedia')) return jsonResponse({ results: [] }); return jsonResponse({}) }
    const resultA = await buildLocusProfile({ query: 'University of Oxford' }, { fetchImpl, now: () => 1000 })
    const resultB = await buildLocusProfile({ query: 'University of Oxford' }, { fetchImpl, now: () => 1000 })
    expect(resultA).toEqual(resultB)
  })

  test('indexes accepted assets into their category gallery', async () => {
    const result = await buildProfile(context, { candidates: [candidate('campus-gallery')], warnings: [], providerCandidates: 1 }, 0, Date.now() + 10_000, { fetchImpl: async () => new Response(new Uint8Array([1, 2, 3])) })

    expect(result.assets).toHaveLength(1)
    expect(result.categories.campus).toHaveLength(1)
    expect(result.categories.campus[0].id).toBe(result.assets[0].id)
  })

  test('returns a ready profile with warning when visual dedupe fails', async () => {
    const result = await buildProfile(context, { candidates: [candidate('dedupe-failure')], warnings: [], providerCandidates: 1 }, 0, Date.now() + 10_000, { fetchImpl: async () => { throw new Error('image host unavailable') } })

    expect(result.assets).toHaveLength(1)
    expect(result.assets[0].visualDeduplication).toBe('unavailable')
    expect(result.warnings.some((warning) => warning.includes('Не удалось визуально проверить изображение'))).toBe(true)
  })
})
