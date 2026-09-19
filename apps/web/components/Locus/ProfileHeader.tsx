import type { LocusProfile } from '@lib/locus/types'
import { useTranslation } from 'react-i18next'

export default function ProfileHeader({ profile }: { profile: LocusProfile }) {
  const { t } = useTranslation()
  const high = profile.assets.filter((asset) => asset.confidence.level === 'high').length
  const review = profile.assets.length - high
  const location = [profile.university.city, profile.university.country].filter(Boolean).join(', ')
  return (
    <header className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('locus.visual_profile_label')}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-card-foreground sm:text-5xl">{profile.university.name}</h1>{location && <p className="mt-2 text-sm text-muted-foreground">{location}</p>}</div><a href={profile.university.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{t('locus.wikidata')} →</a></div>
      <p className="max-w-3xl text-base leading-7 text-muted-foreground">{profile.summary}</p>
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground"><span className="rounded-md bg-muted px-3 py-1.5 text-foreground">{t('locus.confirmed', { count: high })}</span><span className="rounded-md bg-muted px-3 py-1.5 text-foreground">{t('locus.review', { count: review })}</span><span className="rounded-md bg-muted px-3 py-1.5">{t('locus.seconds', { value: (profile.durationMs / 1000).toFixed(1) })}</span><span className="rounded-md bg-muted px-3 py-1.5">{t('locus.rejected', { count: profile.stats.rejectedForProvenance })}</span></div>
      {profile.admissions && profile.admissions.evidence.length > 0 && <div className="rounded-lg border border-border bg-muted p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">{t('locus.admissions_evidence_title')}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{t('locus.admissions_evidence_description')}</p><div className="mt-3 flex flex-wrap gap-2">{profile.admissions.evidence.map((evidence) => <a key={evidence.sourceUrl} href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground underline-offset-4 hover:underline">{evidence.sourceLabel} ↗</a>)}</div></div>}
      {profile.admissions && profile.admissions.matches.length > 0 && <div className="rounded-lg border border-border bg-muted p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">{t('locus.admissions_title')}</p><div className="mt-3 flex flex-wrap gap-2">{profile.admissions.matches.map((match) => <span key={match.exam} className="rounded-md bg-card px-3 py-1.5 text-xs font-semibold text-foreground">{match.exam}: {t(`locus.admissions_${match.status}`)}</span>)}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">{t('locus.admissions_disclaimer')}</p></div>}
    </header>
  )
}
