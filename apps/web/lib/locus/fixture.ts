import type { LocusFetch } from './http'
import type { LocusCategory } from './types'

/**
 * Deterministic, network-free provider responses used only by TRACE_E2E_MODE=fixture.
 * This module deliberately never delegates unknown URLs to the real fetch function.
 */
const IMAGE_BYTES = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
))

const CATEGORIES: Array<{ category: LocusCategory; terms: string[] }> = [
  { category: 'campus', terms: ['campus'] },
  { category: 'dormitory', terms: ['dormitory'] },
  { category: 'classroom', terms: ['classroom'] },
  { category: 'library', terms: ['library'] },
  { category: 'city', terms: ['landmark'] },
  { category: 'sport', terms: ['sports'] },
  { category: 'laboratory', terms: ['laboratory'] },
  { category: 'student_life', terms: ['students'] },
]

function categoryFromQuery(query: string): LocusCategory {
  const normalized = query.toLocaleLowerCase()
  return CATEGORIES.find(({ terms }) => terms.some((term) => normalized.includes(term)))?.category ?? 'campus'
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function imageResult(category: LocusCategory, index: number) {
  const slug = `${category}-${index}`
  return {
    id: `fixture-${slug}`,
    title: `Example University ${category.replace('_', ' ')} ${index}`,
    url: `https://images.example/trace-fixture/${slug}.png`,
    thumbnail: `https://images.example/trace-fixture/${slug}-thumb.png`,
    foreign_landing_url: `https://example.edu/trace-source/${slug}`,
    creator: 'TRACE fixture archive',
    license: 'by-sa',
    license_version: '4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    width: 1600,
    height: 900,
    created_on: '2024-01-01T00:00:00Z',
    tags: [{ name: category.replace('_', ' ') }, { name: 'Example University' }],
    category,
    source: 'TRACE deterministic fixture',
    provider: 'TRACE',
  }
}

function wikimediaPage(category: LocusCategory, index: number) {
  const slug = `${category}-${index}`
  return {
    pageid: 10_000 + CATEGORIES.findIndex((item) => item.category === category) * 10 + index,
    title: `File:Example University ${category.replace('_', ' ')} ${index}.jpg`,
    imageinfo: [{
      url: `https://images.example/trace-fixture/commons-${slug}.png`,
      thumburl: `https://images.example/trace-fixture/commons-${slug}-thumb.png`,
      descriptionurl: `https://commons.wikimedia.org/wiki/File:Example_University_${slug}`,
      mime: 'image/png',
      width: 1600,
      height: 900,
      extmetadata: {
        LicenseShortName: { value: '<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>' },
        LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
        Artist: { value: 'TRACE fixture archive' },
        ImageDescription: { value: `Example University ${category.replace('_', ' ')} fixture image` },
        Categories: { value: `Example University ${category.replace('_', ' ')}` },
        DateTimeOriginal: { value: '2024-01-01T00:00:00Z' },
      },
    }],
  }
}

function wikidataEntity(id: string) {
  const isLocation = id === 'Q515' || id === 'Q30'
  return {
    id,
    labels: { en: { value: isLocation ? (id === 'Q515' ? 'Example City' : 'Example Country') : 'Example University' }, ru: { value: isLocation ? 'Пример' : 'Примерный университет' } },
    descriptions: { en: { value: isLocation ? (id === 'Q515' ? 'city' : 'country') : 'research university' } },
    aliases: {},
    claims: isLocation ? {} : {
      P31: [{ mainsnak: { datavalue: { value: { id: 'Q3918' } } } }],
      P856: [{ mainsnak: { datavalue: { value: 'https://example.edu/admissions' } } }],
      P131: [{ mainsnak: { datavalue: { value: { id: 'Q515' } } } }],
      P17: [{ mainsnak: { datavalue: { value: { id: 'Q30' } } } }],
      P625: [{ mainsnak: { datavalue: { value: { latitude: 42.0, longitude: -71.0 } } } }],
    },
    sitelinks: {},
  }
}
function admissionsHtml(): string {
  return '<!doctype html><html><head><title>Example University Admissions</title><meta property="article:modified_time" content="2024-01-15T00:00:00Z"></head><body><h1>Admissions requirements</h1><p>International applicants need IELTS minimum 6.5 and TOEFL iBT minimum 90.</p><a href="/programs/computer-science">Computer Science program requirements</a></body></html>'
}

function asUrl(input: RequestInfo | URL): URL {
  return new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)
}

export function createTraceFixtureFetch(): LocusFetch {
  return async (input, _init) => {
    const url = asUrl(input)
    if (url.hostname === 'images.example') return new Response(IMAGE_BYTES, { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(IMAGE_BYTES.byteLength) } })
    if (url.hostname === 'www.wikidata.org' && url.pathname.endsWith('/w/api.php')) {
      const action = url.searchParams.get('action')
      if (action === 'wbsearchentities') return json({ search: [{ id: 'Q1', label: 'Example University', description: 'research university', url: 'https://www.wikidata.org/entity/Q1' }] })
      if (action === 'wbgetentities') {
        const ids = (url.searchParams.get('ids') ?? 'Q1').split('|')
        return json({ entities: Object.fromEntries(ids.map((id) => [id, wikidataEntity(/^Q[1-9][0-9]*$/.test(id) ? id : 'Q1')])) })
      }
    }
    if (url.hostname === 'api.openverse.org') {
      const category = categoryFromQuery(url.searchParams.get('q') ?? '')
      return json({ results: [imageResult(category, 0), imageResult(category, 1)] })
    }
    if (url.hostname === 'commons.wikimedia.org' && url.pathname.endsWith('/w/api.php')) {
      const category = categoryFromQuery(url.searchParams.get('gsrsearch') ?? '')
      return json({ query: { pages: { '1': wikimediaPage(category, 0), '2': wikimediaPage(category, 1) } } })
    }
    if (url.hostname === 'example.edu') return new Response(admissionsHtml(), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    return new Response('TRACE fixture route not found', { status: 404 })
  }
}

export function fixtureFetchIfEnabled(fetchImpl?: LocusFetch): LocusFetch | undefined {
  if (fetchImpl) return fetchImpl
  return process.env.TRACE_E2E_MODE === 'fixture' ? createTraceFixtureFetch() : undefined
}
