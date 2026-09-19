import { describe, expect, test } from 'bun:test'
import { fetchOpenverseCategory } from '../../lib/locus/sources/openverse.ts'
import { fetchWikimediaCategory } from '../../lib/locus/sources/wikimedia.ts'
import { resolveUniversity } from '../../lib/locus/sources/wikidata.ts'
import { clearProviderResponseCache, providerResponseCache } from '../../lib/locus/provider-cache.ts'


const context = {
  id: 'Q34433',
  name: 'University of Oxford',
  aliases: ['Oxford University'],
  city: 'Oxford',
  country: 'United Kingdom',
  description: 'research university',
  latitude: null,
  longitude: null,
  url: 'https://www.wikidata.org/entity/Q34433',
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('LOCUS source adapters', () => {

  test('does not cache malformed Openverse response shapes', async () => {
    clearProviderResponseCache()
    let calls = 0
    const fetchImpl = async () => { calls += 1; return jsonResponse({}) }
    const options = { fetchImpl, cacheStore: providerResponseCache }
    await expect(fetchOpenverseCategory(context, 'campus', options)).rejects.toThrow('invalid provider data')
    await expect(fetchOpenverseCategory(context, 'campus', options)).rejects.toThrow('invalid provider data')
    expect(calls).toBe(2)
  })

  test('does not cache malformed Wikimedia response shapes', async () => {
    clearProviderResponseCache()
    let calls = 0
    const fetchImpl = async () => { calls += 1; return jsonResponse({}) }
    const options = { fetchImpl, cacheStore: providerResponseCache }
    await expect(fetchWikimediaCategory(context, 'campus', options)).rejects.toThrow('invalid provider data')
    await expect(fetchWikimediaCategory(context, 'campus', options)).rejects.toThrow('invalid provider data')
    expect(calls).toBe(2)
  })

  test('does not cache malformed Wikidata response shapes', async () => {
    clearProviderResponseCache()
    let calls = 0
    const fetchImpl = async () => { calls += 1; return jsonResponse({}) }
    const options = { fetchImpl, cacheStore: providerResponseCache }
    await expect(resolveUniversity({ query: 'Oxford campus', entityId: 'Q34433', locale: 'en' }, options)).rejects.toThrow('invalid provider data')
    await expect(resolveUniversity({ query: 'Oxford campus', entityId: 'Q34433', locale: 'en' }, options)).rejects.toThrow('invalid provider data')
    expect(calls).toBe(2)
  })
  test('requires explicit institution selection when Wikidata search is ambiguous', async () => {
    const fetchImpl = async () => jsonResponse({ search: [
      { id: 'Q1', label: 'University of Oxford', description: 'university' },
      { id: 'Q2', label: 'Oxford Brookes University', description: 'university' },
    ] })
    const result = await resolveUniversity({ query: 'Oxford campus', locale: 'en' }, { fetchImpl })
    expect(result.kind).toBe('selection_required')
  })

  test('drops Openverse records without a landing URL or recognized license', async () => {
    const fetchImpl = async () => jsonResponse({ results: [
      { id: 'accepted', title: 'Oxford campus', url: 'https://images.example/accepted.jpg', thumbnail: 'https://images.example/accepted-thumb.jpg', foreign_landing_url: 'https://example.org/photo/accepted', license: 'by-sa' },
      { id: 'no-source', title: 'No source', url: 'https://images.example/no-source.jpg', license: 'by' },
      { id: 'no-license', title: 'No license', url: 'https://images.example/no-license.jpg', foreign_landing_url: 'https://example.org/photo/no-license', license: 'all-rights-reserved' },
    ] })
    const result = await fetchOpenverseCategory(context, 'campus', { fetchImpl })
    expect(result).toHaveLength(1)
    expect(result[0].landingUrl).toBe('https://example.org/photo/accepted')
    expect(result[0].license).toContain('BY-SA')
  })

  test('maps Commons attribution, license, dates, and category metadata', async () => {
    const fetchImpl = async () => jsonResponse({ query: { pages: { '42': {
      pageid: 42,
      title: 'File:Oxford campus.jpg',
      imageinfo: [{
        url: 'https://upload.wikimedia.org/original.jpg',
        thumburl: 'https://upload.wikimedia.org/thumb.jpg',
        descriptionurl: 'https://commons.wikimedia.org/wiki/File:Oxford_campus.jpg',
        width: 1000,
        height: 600,
        extmetadata: {
          LicenseShortName: { value: 'CC BY-SA 4.0' },
          LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
          Artist: { value: 'Example creator' },
          DateTimeOriginal: { value: '2020-01-02' },
          Categories: { value: 'University of Oxford campus' },
          ImageDescription: { value: 'Main campus' },
        },
      }],
    } } } })
    const result = await fetchWikimediaCategory(context, 'campus', { fetchImpl })
    expect(result[0]).toMatchObject({ title: 'Oxford campus.jpg', creator: 'Example creator', license: 'CC BY-SA 4.0', publishedAt: '2020-01-02T00:00:00.000Z', collectionText: 'University of Oxford campus' })
  })

  test('uses Wikidata official website claims for admissions source checks', async () => {
    const fetchImpl = async () => jsonResponse({ entities: { Q1: { id: 'Q1', labels: { en: { value: 'Example University' } }, descriptions: { en: { value: 'university' } }, claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q3918' } } } }], P856: [{ mainsnak: { datavalue: { value: 'https://example.edu/admissions' } } }] }, sitelinks: { enwiki: { url: 'https://en.wikipedia.org/wiki/Example_University' } } } } })
    const result = await resolveUniversity({ query: 'Example University', entityId: 'Q1', locale: 'en' }, { fetchImpl })

    expect(result).toMatchObject({ kind: 'resolved', context: { officialUrl: 'https://example.edu/admissions' } })
  })

  test('does not treat an encyclopedia sitelink as an official admissions source', async () => {
    const fetchImpl = async () => jsonResponse({ entities: { Q2: { id: 'Q2', labels: { en: { value: 'Example University' } }, descriptions: { en: { value: 'university' } }, claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q3918' } } } } ] }, sitelinks: { enwiki: { url: 'https://en.wikipedia.org/wiki/Example_University' } } } } })
    const result = await resolveUniversity({ query: 'Example University', entityId: 'Q2', locale: 'en' }, { fetchImpl })

    expect(result.kind).toBe('resolved')
    expect('officialUrl' in result.context).toBe(false)
  })
})
