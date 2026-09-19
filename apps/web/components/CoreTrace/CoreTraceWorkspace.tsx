'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Search, GitCompareArrows, RotateCcw, X } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'
import ApplicantOnboarding from '@components/Locus/ApplicantOnboarding'
import CategoryGallery from '@components/Locus/CategoryGallery'
import ProfileHeader from '@components/Locus/ProfileHeader'
import SourceAssistant from '@components/Locus/SourceAssistant'
import SourceAudit from '@components/Locus/SourceAudit'
import type { ProfileComparison } from '@lib/locus/comparison'
import { compareProfiles, toggleShortlistProfile } from '@lib/locus/comparison'
import { buildTraceProfileRequest, getTraceProgressStage, type TraceProgressStage } from '@lib/locus/workflow'
import { parseApplicantContext, type ApplicantContext, type LocusCategory, type LocusProfile, type ProfileRequest, type ProfileResponse, type UniversityCandidate } from '@lib/locus/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@components/ui/dialog'

const SHORTLIST_STORAGE_KEY = 'trace-shortlist-v1'
const APPLICANT_STORAGE_KEY = 'trace-applicant-v1'

const progressKey: Record<TraceProgressStage, string> = {
  wikidata: 'progress_wikidata',
  official: 'progress_official',
  images: 'progress_images',
  dedupe: 'progress_dedupe',
  profile: 'progress_profile',
}

async function fetchProfile(body: ProfileRequest, signal: AbortSignal): Promise<ProfileResponse> {
  const response = await fetch('/api/trace/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const data = await response.json()
  if (!response.ok && response.status !== 404) throw new Error(data.message || 'Сервис источников временно недоступен.')
  return data as ProfileResponse
}

function readSession<T>(key: string, parse: (_value: unknown) => T | null): T | null {
  try {
    const stored = window.sessionStorage.getItem(key)
    return stored ? parse(JSON.parse(stored)) : null
  } catch {
    return null
  }
}

function parseShortlist(value: unknown): LocusProfile[] | null {
  if (!Array.isArray(value)) return null
  const limited = value.slice(0, 2)
  const profiles = limited.filter((item): item is LocusProfile => {
    if (!item || typeof item !== 'object') return false
    const profile = item as Partial<LocusProfile>
    const university = profile.university
    return Boolean(university && typeof university === 'object' && typeof university.id === 'string' && typeof university.name === 'string' && typeof university.url === 'string' && typeof profile.summary === 'string' && Array.isArray(profile.assets) && profile.categories && typeof profile.categories === 'object' && Array.isArray(profile.warnings) && profile.stats && typeof profile.stats === 'object')
  })
  return profiles.length === limited.length ? profiles : null
}

function WarningPanel({ warnings }: { warnings: string[] }) {
  const { t } = useTranslation()
  if (!warnings.length) return null
  return <aside className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status"><p className="font-semibold">{t('locus.trace_ui.source_warnings')}</p><ul className="mt-2 list-disc space-y-1 ps-5">{warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></aside>
}

function CandidateDialog({ result, onSelect }: { result: Extract<ProfileResponse, { status: 'selection_required' }>; onSelect: (_candidate: UniversityCandidate) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button type="button" className="sr-only" aria-label={t('locus.trace_ui.selection_dialog_title')}>{t('locus.trace_ui.selection_dialog_title')}</button></DialogTrigger>
    {!open && <DialogTrigger asChild><Button type="button" variant="outline">{t('locus.trace_ui.selection_dialog_title')}</Button></DialogTrigger>}
    <DialogContent className="max-h-[85vh] overscroll-contain overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{t('locus.trace_ui.selection_dialog_title')}</DialogTitle><DialogDescription>{t('locus.trace_ui.selection_dialog_description')}</DialogDescription></DialogHeader>
      <WarningPanel warnings={result.warnings} />
      <div className="mt-4 grid gap-3">{result.candidates.map((candidate) => <article key={candidate.id} className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="font-semibold text-card-foreground">{candidate.label}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{candidate.description || t('locus.trace_ui.selection_description_missing')}</p><a className="mt-2 inline-block text-xs font-semibold text-primary underline-offset-4 hover:underline" href={candidate.url} target="_blank" rel="noreferrer">Wikidata ↗</a></div><Button type="button" onClick={() => { setOpen(false); onSelect(candidate) }}>{t('locus.trace_ui.selection_choose')}</Button></div></article>)}</div>
    </DialogContent>
  </Dialog>
}

function ComparisonPanel({ comparison, onClose }: { comparison: ProfileComparison; onClose: () => void }) {
  const { t } = useTranslation()
  const key = (name: string) => `locus.trace_ui.${name}`
  return <aside className="fixed inset-x-3 bottom-3 z-30 max-h-[82vh] overflow-y-auto rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:inset-x-auto sm:end-6 sm:w-[min(680px,calc(100vw-3rem))]" aria-labelledby="comparison-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">TRACE</p><h2 id="comparison-title" className="mt-1 text-xl font-bold">{t(key('comparison_title'))}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{t(key('comparison_disclaimer'))}</p></div><Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t(key('comparison_close'))}><X size={18} /></Button></div><div className="mt-6 grid grid-cols-[1fr_auto_1fr] gap-3 border-b border-border pb-4 text-center"><div><p className="text-sm font-semibold">{comparison.left.name}</p><p className="mt-2 text-3xl font-bold">{comparison.left.coverage}/8</p></div><span className="self-center text-muted-foreground">vs</span><div><p className="text-sm font-semibold">{comparison.right.name}</p><p className="mt-2 text-3xl font-bold">{comparison.right.coverage}/8</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div><p className="text-lg font-bold">{comparison.left.confirmed} / {comparison.right.confirmed}</p><p className="text-xs text-muted-foreground">{t('locus.confidence_high')}</p></div><div><p className="text-lg font-bold">{comparison.left.review} / {comparison.right.review}</p><p className="text-xs text-muted-foreground">{t(key('comparison_review'))}</p></div><div><p className="text-lg font-bold">{comparison.left.sources} / {comparison.right.sources}</p><p className="text-xs text-muted-foreground">{t(key('comparison_sources'))}</p></div></div><div className="mt-6 overflow-hidden rounded-lg border border-border">{comparison.categories.map((row) => <div key={row.category} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border px-3 py-2.5 text-xs last:border-0"><span>{t(`locus.categories.${row.category}`)}</span><span className={row.left ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{row.left}</span><span className={row.right ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{row.right}</span></div>)}</div></aside>
}

export type CoreTraceWorkspaceProps = { orgslug: string; org?: unknown }

export default function CoreTraceWorkspace({ orgslug: _orgslug, org: _org }: CoreTraceWorkspaceProps) {
  const { i18n, t } = useTranslation()
  const [query, setQuery] = useState('')
  const [applicant, setApplicant] = useState<ApplicantContext>({ exams: [] })
  const [hydrated, setHydrated] = useState(false)
  const [result, setResult] = useState<ProfileResponse | null>(null)
  const [shortlist, setShortlist] = useState<LocusProfile[]>([])
  const [comparison, setComparison] = useState<ProfileComparison | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'all' | LocusCategory>('all')
  const [elapsed, setElapsed] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const startedRef = useRef(0)
  const submittedQueryRef = useRef('')
  const mutation = useMutation({ mutationFn: (body: ProfileRequest) => { abortRef.current?.abort(); const controller = new AbortController(); abortRef.current = controller; return fetchProfile(body, controller.signal) }, onSuccess: setResult })

  useEffect(() => {
    const storedShortlist = readSession(SHORTLIST_STORAGE_KEY, parseShortlist) ?? []
    const storedApplicant = readSession(APPLICANT_STORAGE_KEY, parseApplicantContext) ?? { exams: [] }
    const frame = window.requestAnimationFrame(() => { setShortlist(storedShortlist); setApplicant(storedApplicant); setHydrated(true) })
    return () => window.cancelAnimationFrame(frame)
  }, [])
  useEffect(() => { if (!hydrated) return; try { window.sessionStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(shortlist)) } catch {} }, [hydrated, shortlist])
  useEffect(() => { if (!hydrated) return; try { window.sessionStorage.setItem(APPLICANT_STORAGE_KEY, JSON.stringify(applicant)) } catch {} }, [applicant, hydrated])
  useEffect(() => { if (!mutation.isPending) return; const timer = window.setInterval(() => setElapsed(Date.now() - startedRef.current), 100); return () => window.clearInterval(timer) }, [mutation.isPending])

  const submit = (entityId?: string, explicitQuery?: string) => {
    const nextQuery = (explicitQuery ?? query).trim()
    if (nextQuery.length < 2) return
    if (explicitQuery !== undefined) setQuery(explicitQuery)
    submittedQueryRef.current = nextQuery
    setResult(null); setComparison(null); setSelectedCategory('all'); setElapsed(0); startedRef.current = Date.now()
    mutation.mutate(buildTraceProfileRequest(nextQuery, i18n.language.startsWith('ru') ? 'ru' : 'en', applicant, entityId))
  }
  const reset = () => { abortRef.current?.abort(); mutation.reset(); setResult(null); setComparison(null); setSelectedCategory('all'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const compare = () => { if (shortlist.length === 2) setComparison(compareProfiles(shortlist[0], shortlist[1])) }
  const selectCandidate = (candidate: UniversityCandidate) => submit(candidate.id, submittedQueryRef.current || query)
  const error = mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(t('locus.unknown_error')) : null
  const ready = result?.status === 'ready' ? result.profile : null
  const profileToken = result?.status === 'ready' ? result.profileToken : undefined
  const inShortlist = ready ? shortlist.some((profile) => profile.university.id === ready.university.id) : false
  const key = (name: string) => `locus.trace_ui.${name}`
  return <GeneralWrapperStyled><div className="space-y-6 pb-8"><section id="trace-workspace" className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="trace-workspace-title"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><div className="flex items-center gap-3"><Image src="/logo_with_alphabet.png" alt="TRACE" width={220} height={74} className="h-9 w-auto object-contain" priority /><span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(key('workspace_label'))}</span></div><h1 id="trace-workspace-title" className="mt-5 text-3xl font-bold tracking-tight text-card-foreground sm:text-4xl">{t(key('hero_title'))}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{t(key('hero_description'))}</p></div><form className="w-full max-w-xl" onSubmit={(event) => { event.preventDefault(); submit() }}><label htmlFor="core-trace-query" className="text-sm font-semibold text-card-foreground">{t('locus.input_label')}</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} aria-hidden="true" /><Input id="core-trace-query" name="university" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t(key('search_placeholder'))} className="h-11 ps-10" /></div><Button type="submit" disabled={mutation.isPending || query.trim().length < 2}>{mutation.isPending ? `${(elapsed / 1000).toFixed(1)} s` : <><Search size={16} />{t(key('start'))}</>}</Button></div><p className="mt-2 text-xs text-muted-foreground">Wikidata · Wikimedia Commons · Openverse</p></form></div></section>
    {(mutation.isPending || error || result) && <section className="space-y-5" aria-labelledby="trace-results-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(key('workspace_eyebrow'))}</p><h2 id="trace-results-title" className="mt-1 text-2xl font-bold text-foreground">{t(key('workspace_title'))}</h2></div>{shortlist.length === 2 && <Button type="button" variant="outline" onClick={compare}><GitCompareArrows size={16} />{t(key('compare'))}</Button>}</div>{mutation.isPending && <div className="rounded-lg border border-border bg-card p-5" role="status" aria-live="polite"><p className="font-semibold">{t(`locus.trace_ui.${progressKey[getTraceProgressStage(elapsed)]}`)}</p><p className="mt-1 text-sm text-muted-foreground">{t('locus.searching_description')} · {(elapsed / 1000).toFixed(1)} s</p></div>}{error && !mutation.isPending && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5" role="alert"><h3 className="font-semibold text-destructive">{t('locus.error_title')}</h3><p className="mt-2 text-sm text-muted-foreground">{error.message}</p><Button type="button" variant="outline" className="mt-4" onClick={() => submit()}><RotateCcw size={15} />{t('locus.retry')}</Button></div>}{result?.status === 'selection_required' && <CandidateDialog result={result} onSelect={selectCandidate} />}{result?.status === 'not_found' && <div className="rounded-lg border border-amber-200 bg-amber-50 p-5" role="alert"><h3 className="font-semibold text-amber-950">{t('locus.not_found_title')}</h3><p className="mt-2 text-sm text-amber-900">{result.message}</p><Button type="button" variant="outline" className="mt-4" onClick={reset}><RotateCcw size={15} />{t('locus.edit_search')}</Button></div>}{ready && <div className="space-y-6"><p role="status" aria-live="polite" className="text-sm text-muted-foreground">{t('locus.profile_ready', { seconds: (ready.durationMs / 1000).toFixed(1), count: ready.assets.length })}</p><WarningPanel warnings={ready.warnings} /><ApplicantOnboarding value={applicant} onChange={setApplicant} /><ProfileHeader profile={ready} /><div className="flex flex-wrap items-center gap-3"><Button type="button" variant={inShortlist ? 'default' : 'outline'} disabled={!inShortlist && shortlist.length >= 2} onClick={() => setShortlist((items) => toggleShortlistProfile(items, ready))}>{inShortlist ? t(key('shortlist_remove')) : t(key('shortlist_add'))}</Button>{shortlist.length > 0 && <span className="text-sm text-muted-foreground">{t(key('shortlist_count'), { count: shortlist.length })}</span>}</div><CategoryGallery profile={ready} selected={selectedCategory} onSelect={setSelectedCategory} /><SourceAudit profile={ready} />{profileToken ? <SourceAssistant profileToken={profileToken} applicant={applicant} /> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{t(key('assistant_profile_required'))}</div>}</div>}</section>}
    {comparison && <ComparisonPanel comparison={comparison} onClose={() => setComparison(null)} />}
  </div></GeneralWrapperStyled>
}
