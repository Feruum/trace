import {
  CATEGORY_QUOTA,
  CATEGORY_SEARCH_TERMS,
  MAX_ASSETS,
  MAX_ASSETS_PER_CATEGORY,
  MAX_CANDIDATES_BEFORE_HASHING,
  PIPELINE_DEADLINE_MS,
  PROVIDER_CONCURRENCY,
} from './constants'
import { scoreAndAssign, scoreCandidate } from './confidence'
import { dedupeAssets } from './dedupe'
import { buildPreliminaryAdmissionsChecks, collectOfficialAdmissionsEvidence } from './sources/admissions'
import { LocusProviderError, remainingSignal, type LocusFetch } from './http'
import { fixtureFetchIfEnabled } from './fixture'
import { recordProviderRequest } from './metrics'
import { fetchOpenverseCategory } from './sources/openverse'
import { resolveUniversity, type UniversityResolution } from './sources/wikidata'
import { fetchWikimediaCategory } from './sources/wikimedia'
import {
  LOCUS_CATEGORIES,
  type ApplicantContext,
  type LocusCategory,
  type LocusProfile,
  type PhotoAsset,
  type PhotoCandidate,
  type ProfileRequest,
  type ProfileResponse,
  type ProviderDiagnostic,
  type UniversityContext,
} from './types'

const CATEGORY_LIST = [...LOCUS_CATEGORIES]

export interface PipelineOptions {
  fetchImpl?: LocusFetch
  now?: () => number
}

export interface CandidateCollection {
  candidates: PhotoCandidate[]
  warnings: string[]
  providerCandidates: number
  providerDiagnostics?: ProviderDiagnostic[]
}

export function capCandidatesFairly(candidates: PhotoCandidate[], limit: number): PhotoCandidate[] {
  const queues = new Map(
    CATEGORY_LIST.map((category) => [category, candidates.filter((candidate) => candidate.requestedCategory === category)]),
  )
  const result: PhotoCandidate[] = []
  while (result.length < limit && [...queues.values()].some((queue) => queue.length > 0)) {
    for (const category of CATEGORY_LIST) {
      const candidate = queues.get(category)?.shift()
      if (candidate) result.push(candidate)
      if (result.length === limit) break
    }
  }
  return result
}
function normalizedUrl(value: string): string {
  try {
    const url = new URL(value)
    url.hash = ''
    url.hostname = url.hostname.toLocaleLowerCase()
    return url.toString()
  } catch {
    return value.trim()
  }
}

function metadataCompleteness(candidate: PhotoCandidate): number {
  return [candidate.title, candidate.description, candidate.creator, candidate.licenseUrl,
    candidate.width != null && candidate.height != null ? 'dimensions' : null].filter(Boolean).length
}

export function rankCandidatesByCategory(candidates: PhotoCandidate[], context: UniversityContext): PhotoCandidate[] {
  const result: PhotoCandidate[] = []
  for (const category of CATEGORY_LIST) {
    const ranked = candidates.filter((candidate) => candidate.requestedCategory === category).map((candidate, index) => ({ candidate, index, score: scoreCandidate(candidate, context, category).score }))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        const provider = (right.candidate.source === 'wikimedia_commons' ? 1 : 0) - (left.candidate.source === 'wikimedia_commons' ? 1 : 0)
        if (provider !== 0) return provider
        const metadata = metadataCompleteness(right.candidate) - metadataCompleteness(left.candidate)
        if (metadata !== 0) return metadata
        const area = (right.candidate.width ?? 0) * (right.candidate.height ?? 0) - (left.candidate.width ?? 0) * (left.candidate.height ?? 0)
        if (area !== 0) return area
        const url = normalizedUrl(left.candidate.landingUrl).localeCompare(normalizedUrl(right.candidate.landingUrl))
        return url !== 0 ? url : left.candidate.id.localeCompare(right.candidate.id) || left.index - right.index
      })
    result.push(...ranked.slice(0, CATEGORY_QUOTA).map((item) => item.candidate))
  }
  return result
}

function failureReason(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : ''
  const status = message.match(/HTTP\s+(\d{3})/i)?.[1]
  if (status) return `HTTP ${status}`
  if (/timeout|timed out|abort/i.test(message)) return 'timeout'
  if (/invalid json/i.test(message)) return 'invalid JSON'
  if (/invalid provider data/i.test(message)) return 'invalid provider data'
  return 'request failed'
}

function diagnosticWarning(diagnostic: ProviderDiagnostic): string {
  const category = diagnostic.category ? ` / категория ${diagnostic.category}` : ''
  const reason = diagnostic.reason ?? (diagnostic.status === 'empty' ? 'нет пригодных записей' : diagnostic.status === 'skipped' ? 'pipeline deadline reached' : 'request failed')
  return `Источник ${diagnostic.provider}${category}: ${reason}.`
}

export async function collectCandidates(
  context: UniversityContext,
  deadline: number,
  options: PipelineOptions = {},
): Promise<CandidateCollection> {
  const fetchImpl = options.fetchImpl ?? fetch
  const tasks = CATEGORY_LIST.flatMap((category) => [
    { provider: 'Openverse', category, run: () => fetchOpenverseCategory(context, category, { fetchImpl, signal: remainingSignal(deadline) }) },
    { provider: 'Wikimedia Commons', category, run: () => fetchWikimediaCategory(context, category, { fetchImpl, signal: remainingSignal(deadline) }) },
  ])
  const results: Array<{ candidates: PhotoCandidate[]; diagnostic: ProviderDiagnostic }> = []
  let cursor = 0
  const worker = async () => {
    while (true) {
      const index = cursor++
      const task = tasks[index]
      if (!task) return
      if (Date.now() >= deadline) {
        results[index] = { candidates: [], diagnostic: { provider: task.provider, category: task.category, status: 'skipped', candidateCount: 0, reason: 'pipeline deadline reached', durationMs: 0 } }
        continue
      }
      const started = Date.now()
      try {
        const candidates = await task.run()
        results[index] = { candidates, diagnostic: { provider: task.provider, category: task.category, status: candidates.length ? 'success' : 'empty', candidateCount: candidates.length, reason: candidates.length ? null : 'нет пригодных записей', durationMs: Date.now() - started } }
      } catch (error) {
        results[index] = { candidates: [], diagnostic: { provider: error instanceof LocusProviderError ? error.provider : task.provider, category: task.category, status: 'failed', candidateCount: 0, reason: failureReason(error), durationMs: Date.now() - started } }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PROVIDER_CONCURRENCY, tasks.length) }, () => worker()))
  const providerDiagnostics = results.map((result) => result.diagnostic)
  const allCandidates = results.flatMap((result) => result.candidates)
  const candidates = rankCandidatesByCategory(allCandidates, context)
  const warnings = providerDiagnostics.filter((diagnostic) => diagnostic.status !== 'success').map(diagnosticWarning)
  return {
    candidates: candidates.slice(0, MAX_CANDIDATES_BEFORE_HASHING),
    warnings: [...new Set(warnings)],
    providerCandidates: allCandidates.length,
    providerDiagnostics,
  }
}

export function scoreAndAssignCandidates(
  candidates: PhotoCandidate[],
  context: UniversityContext,
): { assets: PhotoAsset[]; rejected: number } {
  const assets: PhotoAsset[] = []
  let rejected = 0
  for (const candidate of candidates) {
    const result = scoreAndAssign(candidate, context)
    if (result.asset) assets.push(result.asset)
    else rejected += 1
  }
  return { assets, rejected }
}

export async function dedupeAndLimit(
  assets: PhotoAsset[],
  options: { fetchImpl?: LocusFetch; deadline?: number } = {},
): Promise<{ assets: PhotoAsset[]; duplicatesRemoved: number; warnings: string[] }> {
  const deduped = await dedupeAssets(assets, options)
  const categoryCounts = Object.fromEntries(CATEGORY_LIST.map((category) => [category, 0])) as Record<LocusCategory, number>
  const limited: PhotoAsset[] = []
  for (const asset of deduped.assets) {
    if (limited.length >= MAX_ASSETS) break
    if (categoryCounts[asset.primaryCategory] >= MAX_ASSETS_PER_CATEGORY) continue
    categoryCounts[asset.primaryCategory] += 1
    limited.push(asset)
  }
  return { ...deduped, assets: limited }
}

function buildSummary(context: UniversityContext, assetCount: number): string {
  const location = [context.city, context.country].filter(Boolean).join(', ')
  return [context.description, location ? `Расположение: ${location}.` : null, `Принято источников и изображений: ${assetCount}.`]
    .filter((part): part is string => Boolean(part))
    .join(' ')
}

export async function buildProfile(
  context: UniversityContext,
  collected: CandidateCollection,
  startedAt: number,
  deadline: number,
  options: PipelineOptions = {},
  applicant?: ApplicantContext,
): Promise<LocusProfile> {
  const scored = scoreAndAssignCandidates(collected.candidates, context)
  const deduped = await dedupeAndLimit(scored.assets, { fetchImpl: options.fetchImpl, deadline }).catch((error) => ({ assets: scored.assets.map((asset) => ({ ...asset, visualDeduplication: 'unavailable' as const })), duplicatesRemoved: 0, warnings: [error instanceof Error ? `Visual deduplication unavailable: ${error.message}` : 'Visual deduplication unavailable.'] }))
  const categories = Object.fromEntries(CATEGORY_LIST.map((category) => [category, deduped.assets.filter((asset) => asset.primaryCategory === category)])) as Record<LocusCategory, PhotoAsset[]>
  let admissions
  const admissionsStartedAt = Date.now()
  try {
    admissions = await collectOfficialAdmissionsEvidence(context, { fetchImpl: options.fetchImpl, deadline })
    recordProviderRequest('Official admissions', 'collect', admissions.evidence.length > 0 ? 'success' : 'empty', Math.max(0, Date.now() - admissionsStartedAt))
  } catch (error) {
    recordProviderRequest('Official admissions', 'collect', 'failed', Math.max(0, Date.now() - admissionsStartedAt))
    throw error
  }
  const preliminaryChecks = applicant ? buildPreliminaryAdmissionsChecks(applicant, admissions.evidence) : []
  const warnings = [...collected.warnings, ...deduped.warnings, ...admissions.warnings]
  if (deduped.assets.length === 0) warnings.push('Недостаточно подтвержденных изображений.')
  if (Date.now() >= deadline) warnings.push('Проверка остановлена по ограничению времени; показаны доступные результаты.')
  const timestamp = options.now?.() ?? Date.now()
  return {
    university: context,
    summary: buildSummary(context, deduped.assets.length),
    summarySourceUrl: context.url,
    assets: deduped.assets,
    categories,
    providerDiagnostics: collected.providerDiagnostics ?? [],
    lastCheckedAt: new Date(timestamp).toISOString(),
    admissions: { status: 'preliminary_source_check', evidence: admissions.evidence, preliminaryChecks, matches: [] },
    generatedAt: new Date(timestamp).toISOString(),
    durationMs: Math.max(0, timestamp - startedAt),
    warnings: [...new Set(warnings)],
    stats: {
      providerCandidates: collected.providerCandidates,
      rejectedForProvenance: scored.rejected,
      duplicatesRemoved: deduped.duplicatesRemoved,
      verifiedAssets: deduped.assets.length,
    },
  }
}

export async function buildLocusProfile(
  request: ProfileRequest,
  options: PipelineOptions = {},
): Promise<ProfileResponse> {
  const now = options.now ?? Date.now
  const startedAt = now()
  const deadline = startedAt + PIPELINE_DEADLINE_MS
  const fixtureFetch = fixtureFetchIfEnabled(options.fetchImpl)
  const effectiveOptions: PipelineOptions = fixtureFetch ? { ...options, fetchImpl: fixtureFetch } : options
  let resolution: UniversityResolution
  try {
    resolution = await resolveUniversity(request, { fetchImpl: effectiveOptions.fetchImpl, signal: remainingSignal(deadline) })
  } catch (error) {
    if (error instanceof LocusProviderError) throw error
    throw new LocusProviderError('Wikidata', 'identity resolution failed', error)
  }
  if (resolution.kind === 'selection_required') return { status: 'selection_required', candidates: resolution.candidates, warnings: resolution.warnings }
  if (resolution.kind === 'not_found') return { status: 'not_found', code: resolution.code, message: resolution.message }
  const collected = await collectCandidates(resolution.context, deadline, effectiveOptions)
  return { status: 'ready', profile: await buildProfile(resolution.context, collected, startedAt, deadline, effectiveOptions, request.applicant) }
}

export { buildSummary }
