import { isIP } from 'node:net'

/** Canonicalize an untrusted URL for provenance and source identity. */
export function normalizeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const url = new URL(raw.trim())
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password || !url.hostname) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"', ndash: '–', mdash: '—', hellip: '…',
  }
  return value
    .replace(/&#(x[0-9a-f]+|[0-9]+);?/gi, (_, token: string) => {
      const code = token.toLocaleLowerCase().startsWith('x') ? Number.parseInt(token.slice(1), 16) : Number.parseInt(token, 10)
      return Number.isFinite(code) ? String.fromCodePoint(Math.min(code, 0x10ffff)) : ''
    })
    .replace(/&([a-z][a-z0-9]+);/gi, (_, name: string) => named[name.toLocaleLowerCase()] ?? `&${name};`)
}

/** Strip provider HTML and decode entities while preserving readable text. */
export function normalizeHtmlMetadata(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = decodeHtmlEntities(raw
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

const LICENSE_PATTERNS: Array<{ family: string; pattern: RegExp; label: string }> = [
  { family: 'cc0', pattern: /^(?:cc\s*0|cc0)$/i, label: 'CC0' },
  { family: 'pdm', pattern: /^(?:pdm|public\s+domain\s+mark)$/i, label: 'PDM' },
  { family: 'cc-by', pattern: /^cc\s*[- ]?by(?:\s+(\d+(?:\.\d+)?))?$/i, label: 'CC BY' },
  { family: 'cc-by-sa', pattern: /^cc\s*[- ]?by\s*[- ]?sa(?:\s+(\d+(?:\.\d+)?))?$/i, label: 'CC BY-SA' },
  { family: 'cc-by-nc', pattern: /^cc\s*[- ]?by\s*[- ]?nc(?:\s+(\d+(?:\.\d+)?))?$/i, label: 'CC BY-NC' },
  { family: 'cc-by-nd', pattern: /^cc\s*[- ]?by\s*[- ]?nd(?:\s+(\d+(?:\.\d+)?))?$/i, label: 'CC BY-ND' },
  { family: 'cc-by-nc-sa', pattern: /^cc\s*[- ]?by\s*[- ]?nc\s*[- ]?sa(?:\s+(\d+(?:\.\d+)?))?$/i, label: 'CC BY-NC-SA' },
  { family: 'cc-by-nc-nd', pattern: /^cc\s*[- ]?by\s*[- ]?nc\s*[- ]?nd(?:\s+(\d+(?:\.\d+)?))?$/i, label: 'CC BY-NC-ND' },
  { family: 'gfdl', pattern: /^gfdl(?:\s+(\d+(?:\.\d+)?))?$/i, label: 'GFDL' },
  { family: 'free-art', pattern: /^free\s+art\s+license(?:\s+(\d+(?:\.\d+)?))?$/i, label: 'Free Art License' },
]

export function normalizeLicense(raw: unknown): { label: string; family: string } | null {
  const value = normalizeHtmlMetadata(raw)
  if (!value) return null
  const normalized = value.replace(/\s+/g, ' ').trim().toLocaleLowerCase()
  const licenseBody = normalized.replace(/^cc\s*/, '')
  const match = licenseBody.match(/^(0|pdm|by(?:\s*-?\s*(?:sa|nc|nd)(?:\s*-?\s*(?:sa|nd))?)?)(?:\s+(\d+(?:\.\d+)?))?$/)
  if (!match) {
    if (/^public\s+domain\s+mark$/.test(normalized)) return { label: 'PDM', family: 'pdm' }
    if (/^gfdl(?:\s+\d+(?:\.\d+)?)?$/.test(normalized)) return { label: normalized.toUpperCase(), family: 'gfdl' }
    if (/^free\s+art\s+license(?:\s+\d+(?:\.\d+)?)?$/.test(normalized)) return { label: normalized.replace(/\b\w/g, (char) => char.toUpperCase()), family: 'free-art' }
    return null
  }
  const token = match[1]
  if (token === '0') return { label: 'CC0', family: 'cc0' }
  if (token === 'pdm') return { label: 'PDM', family: 'pdm' }
  const family = `cc-${token.replace(/\s*[- ]\s*/g, '-')}`
  const labels: Record<string, string> = { 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA', 'cc-by-nc': 'CC BY-NC', 'cc-by-nd': 'CC BY-ND', 'cc-by-nc-sa': 'CC BY-NC-SA', 'cc-by-nc-nd': 'CC BY-NC-ND' }
  const label = labels[family]
  return label ? { label: `${label}${match[2] ? ` ${match[2]}` : ''}`, family } : null
}

function blockedIpv4(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b, c] = parts
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)
}

export function isSafeResolvedAddress(address: string): boolean {
  const normalized = address.toLocaleLowerCase()
  if (isIP(normalized) === 4) return !blockedIpv4(normalized)
  if (isIP(normalized) !== 6) return false
  if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd')) return false
  if (/^fe[89ab]/.test(normalized)) return false
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  return mapped ? !blockedIpv4(mapped) : true
}

/** Synchronous syntax and literal-address guard for server-side media downloads. */
export function isSafeRemoteMediaUrl(raw: string): boolean {
  const normalized = normalizeHttpUrl(raw)
  if (!normalized) return false
  const url = new URL(normalized)
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLocaleLowerCase()
  return !(hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || (isIP(hostname) !== 0 && !isSafeResolvedAddress(hostname)))
}
