import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { LocusFetch } from '../http'
import type { ApplicantContext, UniversityContext } from '../types'

const ADMISSIONS_TIMEOUT_MS = 8_000
const MAX_ADMISSIONS_BYTES = 2 * 1024 * 1024
const MAX_LINKS = 24
const MAX_PAGES = 6

type Exam = 'IELTS' | 'TOEFL' | 'SAT' | 'ACT' | 'Duolingo' | 'GRE' | 'GMAT' | 'GPA'
type Scope = 'university-wide' | 'program-specific'
type Level = 'bachelor' | 'master' | 'phd' | null

export interface AdmissionsRequirement {
  exam: Exam
  minimumScore: number
  sectionMinimums: Record<string, number>
  sourceUrl: string
  sourceLabel: string
  quote: string
  scope: Scope
  program: string | null
  level: Level
  intake: string | null
  sourceDate: string | null
}

export interface AdmissionsEvidence {
  sourceUrl: string
  sourceLabel: string
  pageTitle: string
  scope: Scope
  program: string | null
  level: Level
  intake: string | null
  sourceDate: string | null
  requirements: AdmissionsRequirement[]
}

export interface AdmissionsPreliminaryCheck {
  exam: Exam | string
  result: 'published_minimum_met' | 'published_minimum_below' | 'no_program_specific_requirement'
  checkStatus: 'preliminary_source_check'
  scope: Scope
  program: string | null
  level: Level
  intake: string | null
  userScore: number | null
  minimumScore: number | null
  sourceUrl: string | null
  quote: string | null
}

export interface AdmissionsDiagnostic {
  sourceUrl: string
  status: 'success' | 'empty' | 'failed' | 'skipped'
  reason: string | null
}

export interface AdmissionsResult {
  status: 'preliminary_source_check'
  evidence: AdmissionsEvidence[]
  preliminaryChecks: AdmissionsPreliminaryCheck[]
  warnings: string[]
  diagnostics: AdmissionsDiagnostic[]
}

const EXAMS: Array<{ exam: Exam; pattern: RegExp; range: [number, number]; step?: number }> = [
  { exam: 'IELTS', pattern: /\bIELTS\b/i, range: [0, 9], step: 0.5 },
  { exam: 'TOEFL', pattern: /\bTOEFL(?:\s+iBT)?\b/i, range: [0, 120] },
  { exam: 'SAT', pattern: /\bSAT\b/i, range: [400, 1600] },
  { exam: 'ACT', pattern: /\bACT\b/i, range: [1, 36] },
  { exam: 'Duolingo', pattern: /\bDuolingo(?:\s+English\s+Test)?\b/i, range: [10, 160] },
  { exam: 'GRE', pattern: /\bGRE\b/i, range: [260, 340] },
  { exam: 'GMAT', pattern: /\bGMAT\b/i, range: [200, 805] },
  { exam: 'GPA', pattern: /\bGPA\b/i, range: [0, 4] },
]
const CUE = /\b(?:minimum|min|at\s+least|overall|required|requirement|score|band)\b|минимальн|требован|балл/i

function decodeEntities(value: string): string {
  return value.replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>/gi, '. ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function pageTitle(html: string, fallback: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
  return stripHtml(title ?? '').slice(0, 300) || fallback
}

function levelFrom(text: string): Level {
  if (/\b(ph\.?d|doctor(?:ate|al))\b/i.test(text)) return 'phd'
  if (/\b(master(?:'s)?|msc|ma|graduate|postgraduate)\b/i.test(text)) return 'master'
  if (/\b(bachelor(?:'s)?|bsc|ba|undergraduate)\b/i.test(text)) return 'bachelor'
  return null
}

function programFrom(url: string, title: string, _seedHost: string): string | null {
  const source = `${title} ${new URL(url).pathname.replace(/[\/_-]+/g, ' ')}`
  const level = levelFrom(source)
  if (!level) return null
  const cleaned = title.replace(/\b(admissions?|requirements?|apply|international|undergraduate|graduate|postgraduate|master'?s?|bachelor'?s?|ph\.?d|msc|bsc|ma|ba|academic|year)\b/gi, ' ').replace(/[|:/()-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned || /^(home|university|programs?|admissions?|requirements?|international|graduate|undergraduate)$/i.test(cleaned) || /^\d{4}(?:\s+\d{4})*$/.test(cleaned)) return null
  if (!/[a-z]{3}/i.test(cleaned)) return null
  return cleaned.slice(0, 160)
}

function intakeFrom(text: string): string | null {
  const match = text.match(/\b(?:intake|entry|term|semester|academic\s+(?:year|term))\s*[:\-]?\s*((?:spring|summer|fall|autumn|winter)\s+\d{4}|\d{4})/i)
  return match?.[1]?.trim() ?? null
}

function sourceDate(response: Response, html: string): string | null {
  const header = response.headers.get('last-modified')
  if (header && !Number.isNaN(Date.parse(header))) return new Date(header).toISOString()
  const meta = html.match(/<meta[^>]+(?:name|property)=["'](?:dateModified|article:modified_time)["'][^>]+content=["']([^"']+)["']/i)?.[1]
  if (meta && !Number.isNaN(Date.parse(meta))) return new Date(meta).toISOString()
  const time = html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1]
  return time && !Number.isNaN(Date.parse(time)) ? new Date(time).toISOString() : null
}

function validScore(exam: typeof EXAMS[number], value: number): boolean {
  return Number.isFinite(value) && value >= exam.range[0] && value <= exam.range[1] && (exam.step === undefined || Math.abs(value / exam.step - Math.round(value / exam.step)) < 1e-8)
}

function parseRequirements(text: string, sourceUrl: string, meta: { pageTitle: string; scope: Scope; program: string | null; level: Level; intake: string | null; sourceDate: string | null }): AdmissionsRequirement[] {
  const requirements: AdmissionsRequirement[] = []
  const sentences = text.split(/(?<=[.!?;])\s+/)
  for (const sentence of sentences) {
    if (!CUE.test(sentence)) continue
    for (const exam of EXAMS) {
      if (!exam.pattern.test(sentence)) continue
      const numbers = [...sentence.matchAll(/\b\d+(?:\.\d+)?\b/g)]
      const candidate = numbers.map((item) => Number(item[0])).find((value) => validScore(exam, value))
      if (candidate === undefined) continue
      const sectionMinimums: Record<string, number> = {}
      if (exam.exam === 'IELTS') {
        const section = sentence.match(/(?:band|section)[^\d]{0,20}(\d+(?:\.\d+)?)/i)
        if (section && validScore(exam, Number(section[1]))) sectionMinimums.band = Number(section[1])
        const below = sentence.match(/(?:below|less\s+than)[^\d]{0,12}(\d+(?:\.\d+)?)/i)
        if (below && validScore(exam, Number(below[1]))) sectionMinimums.band = Number(below[1])
      }
      const quote = sentence.trim().slice(0, 500)
      requirements.push({ exam: exam.exam, minimumScore: candidate, sectionMinimums, sourceUrl, sourceLabel: 'Official university source', quote, scope: meta.scope, program: meta.program, level: meta.level, intake: meta.intake, sourceDate: meta.sourceDate })
    }
  }
  return requirements
}

function isBlockedIpv4(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b, c] = parts
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)
}

function isBlockedAddress(address: string): boolean {
  const normalized = address.toLowerCase()
  if (isIP(normalized) === 4) return isBlockedIpv4(normalized)
  if (isIP(normalized) !== 6) return true
  if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized)) return true
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  return mapped ? isBlockedIpv4(mapped) : false
}

async function validatePublicHttpUrl(raw: unknown, resolveDns: boolean): Promise<URL | null> {
  if (typeof raw !== 'string') return null
  let url: URL
  try { url = new URL(raw) } catch { return null }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname) return null
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || (isIP(hostname) !== 0 && isBlockedAddress(hostname))) return null
  if (resolveDns && isIP(hostname) === 0) {
    try {
      const addresses = await lookup(hostname, { all: true, verbatim: true })
      if (!addresses.length || addresses.some((entry) => isBlockedAddress(entry.address))) return null
    } catch { return null }
  }
  url.hash = ''
  return url
}

async function readBoundedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_ADMISSIONS_BYTES) throw new Error('too large')
  if (!response.body) return ''
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let total = 0; let text = ''
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break
    total += chunk.value.byteLength
    if (total > MAX_ADMISSIONS_BYTES) { await reader.cancel(); throw new Error('too large') }
    text += decoder.decode(chunk.value, { stream: true })
  }
  return text + decoder.decode()
}

function linksFrom(html: string, seed: URL): string[] {
  const links: string[] = []
  const baseHost = seed.hostname.toLowerCase().replace(/^www\./, '')
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url: URL
    try { url = new URL(decodeEntities(match[1]), seed) } catch { continue }
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (url.protocol !== seed.protocol && url.protocol !== 'http:' && url.protocol !== 'https:') continue
    if (!(host === baseHost || host.endsWith(`.${baseHost}`)) || url.username || url.password) continue
    url.hash = ''
    const text = stripHtml(match[2]); const relevance = `${url.pathname} ${url.search} ${text}`
    if (!/admission|apply|requirement|international|undergraduate|graduate|master|bachelor|phd|program|degree|language|intake/i.test(relevance)) continue
    const value = url.toString()
    if (!links.includes(value)) links.push(value)
  }
  return links.slice(0, MAX_LINKS)
}

function result(warnings: string[] = [], diagnostics: AdmissionsDiagnostic[] = [], evidence: AdmissionsEvidence[] = []): AdmissionsResult {
  return { status: 'preliminary_source_check', evidence, preliminaryChecks: [], warnings, diagnostics }
}

export async function collectOfficialAdmissionsEvidence(context: UniversityContext & { officialUrl?: string }, options: { fetchImpl?: LocusFetch; signal?: AbortSignal; deadline?: number; timeoutMs?: number } = {}): Promise<AdmissionsResult> {
  if (!context.officialUrl) return result(['Official admissions source is not available.'])
  const fetchImpl = options.fetchImpl ?? fetch
  const seed = await validatePublicHttpUrl(context.officialUrl, options.fetchImpl === undefined)
  if (!seed) return result(['Official admissions source was blocked by the public-network safety check.'])
  const deadline = options.deadline ?? (Date.now() + (options.timeoutMs ?? ADMISSIONS_TIMEOUT_MS))
  const diagnostics: AdmissionsDiagnostic[] = []; const evidence: AdmissionsEvidence[] = []; const warnings: string[] = []
  const fetchPage = async (url: string): Promise<{ html: string; response: Response } | null> => {
    const remaining = Math.min(options.timeoutMs ?? ADMISSIONS_TIMEOUT_MS, deadline - Date.now())
    if (remaining <= 0) { diagnostics.push({ sourceUrl: url, status: 'skipped', reason: 'deadline reached' }); return null }
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), remaining)
    const abort = () => controller.abort(); options.signal?.addEventListener('abort', abort, { once: true })
    try {
      if (options.signal?.aborted) controller.abort()
      const response = await fetchImpl(url, { headers: { Accept: 'text/html' }, cache: 'no-store', redirect: 'manual', signal: controller.signal })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) throw new Error('redirect blocked')
        const redirected = await validatePublicHttpUrl(new URL(location, url).toString(), options.fetchImpl === undefined)
        if (!redirected) throw new Error('unsafe redirect blocked')
        throw new Error('redirect blocked')
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) throw new Error('non-HTML response')
      const html = await readBoundedText(response)
      if (!html.trim()) throw new Error('empty page')
      return { html, response }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request failed'
      diagnostics.push({ sourceUrl: url, status: 'failed', reason: controller.signal.aborted ? 'timed out' : message })
      return null
    } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort) }
  }
  const seedPage = await fetchPage(seed.toString())
  if (!seedPage) {
    const reason = diagnostics.at(-1)?.reason ?? 'unavailable'
    warnings.push(reason === 'too large' ? 'Official admissions source is too large.' : reason === 'redirect blocked' ? 'Official admissions source redirect was blocked.' : reason === 'timed out' ? 'Official admissions source timed out.' : 'Official admissions source is unavailable.')
    return result(warnings, diagnostics)
  }
  const seedTitle = pageTitle(seedPage.html, seed.toString())
  const seedText = stripHtml(seedPage.html)
  const seedLevel = levelFrom(`${seedTitle} ${seed}`)
  const seedProgram = programFrom(seed.toString(), seedTitle, seed.hostname)
  const seedScope: Scope = seedProgram && seedLevel ? 'program-specific' : 'university-wide'
  const seedIntake = intakeFrom(seedText)
  const seedDate = sourceDate(seedPage.response, seedPage.html)
  const seedRequirements = parseRequirements(seedText, seed.toString(), { pageTitle: seedTitle, scope: seedScope, program: seedProgram, level: seedLevel, intake: seedIntake, sourceDate: seedDate })
  if (seedRequirements.length) evidence.push({ sourceUrl: seed.toString(), sourceLabel: 'Official university source', pageTitle: seedTitle, scope: seedScope, program: seedProgram, level: seedLevel, intake: seedIntake, sourceDate: seedDate, requirements: seedRequirements })
  diagnostics.push({ sourceUrl: seed.toString(), status: seedRequirements.length ? 'success' : 'empty', reason: seedRequirements.length ? null : 'no recognized official requirement' })
  const linkedCandidates: string[] = []
  for (const link of linksFrom(seedPage.html, seed)) {
    if (linkedCandidates.length >= MAX_PAGES - 1) break
    if (await validatePublicHttpUrl(link, options.fetchImpl === undefined)) linkedCandidates.push(link)
  }
  const candidates = [seed.toString(), ...linkedCandidates]
  let cursor = 0
  const worker = async () => {
    while (cursor < candidates.length) {
      const url = candidates[cursor++]
      if (url === seed.toString()) continue
      const page = await fetchPage(url); if (!page) continue
      const title = pageTitle(page.html, url); const level = levelFrom(`${title} ${url}`); const program = programFrom(url, title, seed.hostname)
      const text = stripHtml(page.html); const scope: Scope = program && level ? 'program-specific' : 'university-wide'; const intake = intakeFrom(text)
      const requirements = parseRequirements(text, url, { pageTitle: title, scope, program, level, intake, sourceDate: sourceDate(page.response, page.html) })
      if (requirements.length) {
        diagnostics.push({ sourceUrl: url, status: 'success', reason: null })
        evidence.push({ sourceUrl: url, sourceLabel: 'Official university source', pageTitle: title, scope, program, level, intake, sourceDate: sourceDate(page.response, page.html), requirements })
      } else diagnostics.push({ sourceUrl: url, status: 'empty', reason: 'no recognized official requirement' })
    }
  }
  await Promise.all([worker(), worker()])
  const candidateOrder = Object.fromEntries(candidates.map((url, index) => [url, index]))
  evidence.sort((left, right) => (candidateOrder[left.sourceUrl] ?? MAX_PAGES) - (candidateOrder[right.sourceUrl] ?? MAX_PAGES))
  diagnostics.sort((left, right) => (candidateOrder[left.sourceUrl] ?? MAX_PAGES) - (candidateOrder[right.sourceUrl] ?? MAX_PAGES))
  if (!evidence.length) warnings.push('Official source does not publish a recognized exam requirement.')
  return result(warnings, diagnostics, evidence)
}

export function buildPreliminaryAdmissionsChecks(applicant: ApplicantContext, evidence: AdmissionsEvidence[]): AdmissionsPreliminaryCheck[] {
  return applicant.exams.map((exam) => {
    const matching = evidence.flatMap((item) => item.requirements).find((item) => item.exam === exam.name && item.scope === 'program-specific' && (!applicant.field || !item.program || item.program.toLowerCase().includes(applicant.field.toLowerCase()) || applicant.field.toLowerCase().includes(item.program.toLowerCase())) && (!applicant.degree || item.level === applicant.degree) && (!applicant.intake || item.intake === applicant.intake))
    if (!matching) return { exam: exam.name, result: 'no_program_specific_requirement', checkStatus: 'preliminary_source_check', scope: 'university-wide', program: null, level: applicant.degree ?? null, intake: applicant.intake ?? null, userScore: exam.score, minimumScore: null, sourceUrl: null, quote: null }
    const sectionPass = Object.entries(matching.sectionMinimums).every(([key, minimum]) => (exam.sections?.[key] ?? -Infinity) >= minimum)
    return { exam: exam.name, result: exam.score >= matching.minimumScore && sectionPass ? 'published_minimum_met' : 'published_minimum_below', checkStatus: 'preliminary_source_check', scope: matching.scope, program: matching.program, level: matching.level, intake: matching.intake, userScore: exam.score, minimumScore: matching.minimumScore, sourceUrl: matching.sourceUrl, quote: matching.quote }
  })
}

export async function fetchOfficialAdmissions(context: UniversityContext & { officialUrl?: string }, options: { fetchImpl?: LocusFetch; signal?: AbortSignal; deadline?: number; timeoutMs?: number } = {}): Promise<AdmissionsResult> { return collectOfficialAdmissionsEvidence(context, options) }

export type AdmissionsMatch = { exam: string; status: 'meets' | 'below' | 'not_found'; userScore?: number; minimumScore?: number; sourceUrl?: string; quote?: string }
export function matchApplicantToAdmissions(applicant: ApplicantContext, requirements: AdmissionsRequirement[]): AdmissionsMatch[] {
  return applicant.exams.map((exam) => {
    const requirement = requirements.find((item) => item.exam === exam.name)
    if (!requirement) return { exam: exam.name, status: 'not_found', userScore: exam.score }
    const sectionPass = Object.entries(requirement.sectionMinimums).every(([key, minimum]) => (exam.sections?.[key] ?? -Infinity) >= minimum)
    return { exam: exam.name, status: exam.score >= requirement.minimumScore && sectionPass ? 'meets' : 'below', userScore: exam.score, minimumScore: requirement.minimumScore, sourceUrl: requirement.sourceUrl, quote: requirement.quote }
  })
}
