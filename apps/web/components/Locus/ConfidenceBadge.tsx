'use client'

import { useTranslation } from 'react-i18next'
import type { Confidence } from '@lib/locus/types'

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { t } = useTranslation()
  const isHigh = confidence.level === 'high'
  const label = t(isHigh ? 'locus.confidence_high' : 'locus.confidence_review')

  return (
    <details className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"><summary className="cursor-pointer list-none font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label} · {confidence.score}/100</summary><div className="mt-2 text-[11px] font-normal"><p>{t('locus.reason_codes')}</p><ul className="mt-1 space-y-1">{confidence.reasonCodes.map((reason) => <li key={reason}>{reason}</li>)}</ul></div></details>
  )
}
