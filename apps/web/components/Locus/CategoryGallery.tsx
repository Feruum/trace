import { CORE_CATEGORIES, FILTER_CATEGORIES } from '@lib/locus/constants'
import type { LocusCategory, LocusProfile } from '@lib/locus/types'
import { useTranslation } from 'react-i18next'
import PhotoCard from './PhotoCard'

const filterKeys = ['all', ...FILTER_CATEGORIES] as const
type CategoryGalleryProps = {
  profile: LocusProfile
  selected: 'all' | LocusCategory
  onSelect: (_value: 'all' | LocusCategory) => void
}

export default function CategoryGallery({ profile, selected, onSelect }: CategoryGalleryProps) {
  const { t } = useTranslation()
  const categories = selected === 'all' ? CORE_CATEGORIES : [selected]
  return (
    <section aria-labelledby="gallery-title" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('locus.category_gallery_eyebrow')}</p><h2 id="gallery-title" className="mt-1 text-2xl font-bold tracking-tight text-card-foreground">{t('locus.category_gallery_title')}</h2></div><div className="flex flex-wrap gap-2" role="group" aria-label={t('locus.category_filters_label')}>{filterKeys.map((category) => <button key={category} type="button" onClick={() => onSelect(category)} aria-pressed={selected === category} className={`min-h-10 rounded-md border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected === category ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background text-foreground hover:bg-accent'}`}>{t(`locus.filters.${category}`)}</button>)}</div></div>
      <div className="space-y-10">{categories.map((category) => { const assets = profile.categories[category]; return <section key={category} aria-labelledby={`category-${category}`}><div className="mb-4 flex items-center justify-between gap-3"><h3 id={`category-${category}`} className="text-lg font-semibold text-card-foreground">{t(`locus.categories.${category}`)}</h3><span className="text-xs font-semibold text-muted-foreground">{t('locus.materials_count', { count: assets.length })}</span></div>{assets.length === 0 ? <div className="rounded-lg border border-dashed border-border bg-muted p-6 text-sm leading-6 text-muted-foreground">{t('locus.empty_category')}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{assets.map((asset) => <PhotoCard key={asset.id} asset={asset} categoryLabel={t(`locus.categories.${asset.primaryCategory}`)} />)}</div>}</section> })}</div>
    </section>
  )
}
