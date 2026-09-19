'use client'

import { useTranslation } from 'react-i18next'
import type { LocusProfile } from '@lib/locus/types'

export default function SourceAudit({ profile }: { profile: LocusProfile }) {
  const { t } = useTranslation()
  const providers = Array.from(new Set(profile.assets.map((asset) => asset.sourceLabel)))
  return (
    <section className="rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8" aria-labelledby="audit-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('locus.audit_eyebrow')}</p><h2 id="audit-title" className="mt-1 text-2xl font-bold">{t('locus.audit_title')}</h2></div><span className="text-sm text-muted-foreground">{t('locus.no_keys')}</span></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['providerCandidates','locus.provider_candidates'],['rejectedForProvenance','locus.rejected_for_evidence'],['duplicatesRemoved','locus.duplicates_removed'],['verifiedAssets','locus.verified_assets']].map(([field,label]) => <div key={field}><p className="text-2xl font-bold">{profile.stats[field as keyof typeof profile.stats]}</p><p className="text-xs text-muted-foreground">{t(label)}</p></div>)}</div>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-muted-foreground">{t('locus.score_legend')}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{t('locus.audit_method')}</p><p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground">{t('locus.audit_assistant_note')}</p><p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground">{t('locus.audit_boundary_note')}</p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">{providers.map((provider) => <span key={provider} className="rounded-md border border-border px-3 py-1.5">{provider}</span>)}<a href="https://www.wikidata.org/" target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 underline-offset-4 hover:underline">Wikidata</a><a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 underline-offset-4 hover:underline">Wikimedia Commons</a><a href="https://openverse.org/" target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 underline-offset-4 hover:underline">Openverse</a></div>
    </section>
  )
}
