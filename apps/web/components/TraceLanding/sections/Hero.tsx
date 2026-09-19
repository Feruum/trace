"use client";

import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import Image from 'next/image'
import { cn } from '@lib/utils'
import type { HeroTab } from '../types'
import {
  CoursesIcon,
  CommunitiesIcon,
  BoardsIcon,
  PlaygroundsIcon,
  AIIcon,
  AnalyticsIcon,
  PaymentsIcon,
  PodcastsIcon,
} from '../icons'

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const TABS: HeroTab[] = [
  { id: 'profiles', label: 'Профили', preview: '/trace-landing/preview-courses.png', href: '/workspace#trace-workspace-title' },
  { id: 'sources', label: 'Источники', preview: '/trace-landing/preview-communities.png', href: '/workspace#trace-results-title' },
  { id: 'comparison', label: 'Сравнение', preview: '/trace-landing/preview-boards.png', href: '/workspace#comparison-title' },
  { id: 'applicant', label: 'Абитуриент', preview: '/trace-landing/preview-playgrounds.png', href: '/workspace#trace-workspace-title' },
  { id: 'assistant', label: 'Ассистент', preview: '/trace-landing/preview-ai.png', href: '/workspace#assistant-title' },
  { id: 'coverage', label: 'Покрытие', preview: '/trace-landing/preview-analytics.png', href: '/workspace#trace-results-title' },
  { id: 'provenance', label: 'Происхождение', preview: '/trace-landing/preview-payments.png', href: '/workspace#trace-results-title' },
  { id: 'timeline', label: 'Хронология', preview: '/trace-landing/preview-podcasts.png', href: '/workspace#trace-results-title' },
]

const TAB_ICONS: Record<string, IconComponent> = {
  profiles: CoursesIcon,
  sources: CommunitiesIcon,
  comparison: BoardsIcon,
  applicant: PlaygroundsIcon,
  assistant: AIIcon,
  coverage: AnalyticsIcon,
  provenance: PaymentsIcon,
  timeline: PodcastsIcon,
}

export default function Hero() {
  const [activeTab, setActiveTab] = useState('profiles')

  return (
    <section className="relative -mt-[52px] overflow-hidden pt-[52px]">
      <Image src="/trace-landing/hero-background.png" alt="" fill priority sizes="100vw" className="object-cover object-center opacity-70" aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#002147_0%,#003066_40%,#001a3d_100%)]" />
      <div className="absolute inset-0 bg-[image:linear-gradient(to_right,rgba(120,165,255,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,165,255,0.3)_1px,transparent_1px)] bg-[size:120px_120px] opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_75%)]" />
      <div className="absolute inset-0 bg-[image:linear-gradient(to_right,rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_75%)]" />
      <div className="absolute inset-0 bg-[image:radial-gradient(circle,rgba(120,165,255,0.9)_1px,transparent_1px)] bg-[size:120px_120px] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_bottom,transparent_0%,#ffffff_100%)]" />
      <div className="relative z-10 flex flex-col items-center px-6 pt-20 text-center md:pt-28">
        <h1 className="max-w-4xl text-[36px] leading-[1.05] font-black text-white md:text-[60px] lg:text-[76px]">Проверь университет. Увидь доказательства. Выбирай осознанно.</h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-white/70">TRACE собирает открытые свидетельства о кампусе и студенческой жизни, отделяет подтверждённое от неполного и оставляет каждую ссылку на виду.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4"><a href="/workspace" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90">Проверить университет</a><a href="/workspace#trace-workspace-title" className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15">Открыть рабочую область</a></div>
        <div role="tablist" className="mt-10 flex flex-wrap items-center justify-center gap-2">{TABS.map((tab) => { const Icon = TAB_ICONS[tab.id]; const isActive = activeTab === tab.id; return <button key={tab.id} type="button" role="tab" onClick={() => setActiveTab(tab.id)} aria-selected={isActive} className={cn('flex items-center gap-2 rounded-full border px-4 py-2 text-sm text-white transition-colors', isActive ? 'border-white/15 bg-white/15 backdrop-blur-sm' : 'border-transparent hover:border-white/10')}><Icon size={16} />{tab.label}</button> })}</div>
        <div className="relative mb-16 mt-10 aspect-[5/3] w-full max-w-5xl overflow-hidden rounded-2xl bg-white nice-shadow md:mb-24">{TABS.map((tab) => <Image key={tab.id} src={tab.preview} alt={`${tab.label} preview`} fill sizes="(max-width: 1024px) 100vw, 1024px" className={cn('object-cover object-top transition-opacity duration-200 ease-out', activeTab === tab.id ? 'opacity-100' : 'opacity-0')} loading={tab.id === 'profiles' ? 'eager' : 'lazy'} />)}</div>
      </div>
    </section>
  )
}
