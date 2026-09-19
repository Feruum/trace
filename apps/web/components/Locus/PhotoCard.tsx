'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoAsset } from '@lib/locus/types'
import ConfidenceBadge from './ConfidenceBadge'

export default function PhotoCard({ asset, categoryLabel }: { asset: PhotoAsset; categoryLabel: string }) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const creator = asset.creator ? t('locus.author', { value: asset.creator }) : t('locus.author_unknown')
  const date = asset.publishedAt ? new Date(asset.publishedAt).toLocaleDateString() : t('locus.date_unknown')
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"><div className="aspect-[4/3] bg-muted">{imageFailed ? <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{t('locus.image_unavailable')}</div> : <Image src={asset.thumbnailUrl} alt={`${asset.title} — ${categoryLabel}`} className="h-full w-full object-cover" width={asset.width ?? 640} height={asset.height ?? 480} sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" loading="lazy" onError={() => setImageFailed(true)} />}</div><div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="line-clamp-2 text-sm font-semibold leading-5 text-card-foreground">{asset.title}</h3><p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{categoryLabel}</p></div><span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{asset.sourceLabel}</span></div><p className="text-xs leading-5 text-muted-foreground">{creator} · {asset.license || t('locus.license_unknown')} · {date}</p>{asset.licenseUrl && <a href={asset.licenseUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline-offset-4 hover:underline">{asset.license} ↗</a>}<ConfidenceBadge confidence={asset.confidence} /><a href={asset.landingUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-md border border-input px-3 text-xs font-semibold text-foreground underline-offset-4 hover:bg-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t('locus.open_source')}</a></div></article>
  )
}
