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
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[4/3] bg-slate-100">
        {imageFailed ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">{t('locus.image_unavailable')}</div>
        ) : (
          <Image src={asset.thumbnailUrl} alt={`${asset.title} — ${categoryLabel}`} className="h-full w-full object-cover" width={asset.width ?? 640} height={asset.height ?? 480} sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" loading="lazy" onError={() => setImageFailed(true)} />
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{asset.title}</h3><p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{categoryLabel}</p></div>
          <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-slate-400">{asset.sourceLabel}</span>
        </div>
        <p className="text-xs leading-5 text-slate-600">{creator} · {asset.license || t('locus.license_unknown')} · {date}</p>
        {asset.licenseUrl && <a href={asset.licenseUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-700 underline-offset-4 hover:underline">{asset.license} ↗</a>}
        <ConfidenceBadge confidence={asset.confidence} />
        <a href={asset.landingUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-800 underline-offset-4 hover:bg-slate-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">{t('locus.open_source')}</a>
      </div>
    </article>
  )
}
