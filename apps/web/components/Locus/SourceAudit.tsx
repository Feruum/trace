'use client'

import { useTranslation } from 'react-i18next'
import type { LocusProfile } from '@lib/locus/types'

export default function SourceAudit({ profile }: { profile: LocusProfile }) {
  const { t } = useTranslation()
  const providers = Array.from(new Set(profile.assets.map((asset) => asset.sourceLabel)))
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-slate-100 sm:p-8" aria-labelledby="audit-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">{t('locus.audit_eyebrow')}</p><h2 id="audit-title" className="mt-1 text-2xl font-black">{t('locus.audit_title')}</h2></div><span className="text-sm text-slate-400">{t('locus.no_keys')}</span></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-2xl font-black">{profile.stats.providerCandidates}</p><p className="text-xs text-slate-400">{t('locus.provider_candidates')}</p></div>
        <div><p className="text-2xl font-black">{profile.stats.rejectedForProvenance}</p><p className="text-xs text-slate-400">{t('locus.rejected_for_evidence')}</p></div>
        <div><p className="text-2xl font-black">{profile.stats.duplicatesRemoved}</p><p className="text-xs text-slate-400">{t('locus.duplicates_removed')}</p></div>
        <div><p className="text-2xl font-black">{profile.stats.verifiedAssets}</p><p className="text-xs text-slate-400">{t('locus.verified_assets')}</p></div>
      </div>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-300">{t('locus.score_legend')}</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{t('locus.audit_method')}</p>
      <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">{t('locus.audit_assistant_note')}</p>
      <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">{t('locus.audit_boundary_note')}</p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
        {providers.map((provider) => <span key={provider} className="rounded-full border border-slate-700 px-3 py-1.5">{provider}</span>)}
        <a href="https://www.wikidata.org/" target="_blank" rel="noreferrer" className="rounded-full border border-slate-700 px-3 py-1.5 underline-offset-4 hover:underline">Wikidata</a>
        <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer" className="rounded-full border border-slate-700 px-3 py-1.5 underline-offset-4 hover:underline">Wikimedia Commons</a>
        <a href="https://openverse.org/" target="_blank" rel="noreferrer" className="rounded-full border border-slate-700 px-3 py-1.5 underline-offset-4 hover:underline">Openverse</a>
      </div>
    </section>
  )
}
