import type { LocusProfile } from '@lib/locus/types'
import { useTranslation } from 'react-i18next'

export default function ProfileHeader({ profile }: { profile: LocusProfile }) {
  const { t } = useTranslation()
  const high = profile.assets.filter((asset) => asset.confidence.level === 'high').length
  const review = profile.assets.length - high
  const location = [profile.university.city, profile.university.country].filter(Boolean).join(', ')
  return (
    <header className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">{t('locus.visual_profile_label')}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{profile.university.name}</h1>{location && <p className="mt-2 text-sm text-slate-500">{location}</p>}</div><a href={profile.university.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline">{t('locus.wikidata')} →</a></div>
      <p className="max-w-3xl text-base leading-7 text-slate-700">{profile.summary}</p>
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">{t('locus.confirmed', { count: high })}</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-900">{t('locus.review', { count: review })}</span><span className="rounded-full bg-slate-100 px-3 py-1.5">{t('locus.seconds', { value: (profile.durationMs / 1000).toFixed(1) })}</span><span className="rounded-full bg-slate-100 px-3 py-1.5">{t('locus.rejected', { count: profile.stats.rejectedForProvenance })}</span></div>
      {profile.admissions && profile.admissions.evidence.length > 0 && <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-900">{t('locus.admissions_evidence_title')}</p><p className="mt-2 text-xs leading-5 text-teal-950">{t('locus.admissions_evidence_description')}</p><div className="mt-3 flex flex-wrap gap-2">{profile.admissions.evidence.map((evidence) => <a key={evidence.sourceUrl} href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="rounded-full border border-teal-900/25 bg-white px-3 py-1.5 text-xs font-semibold text-teal-950 underline-offset-4 hover:underline">{evidence.sourceLabel} ↗</a>)}</div></div>}
      {profile.admissions && profile.admissions.matches.length > 0 && <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-900">{t('locus.admissions_title')}</p><div className="mt-3 flex flex-wrap gap-2">{profile.admissions.matches.map((match) => <span key={match.exam} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${match.status === 'meets' ? 'bg-emerald-100 text-emerald-900' : match.status === 'below' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{match.exam}: {t(`locus.admissions_${match.status}`)}</span>)}</div><p className="mt-3 text-xs leading-5 text-teal-950">{t('locus.admissions_disclaimer')}</p></div>}
    </header>
  )
}
