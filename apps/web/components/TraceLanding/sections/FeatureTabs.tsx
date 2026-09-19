'use client'

import { useState } from 'react'
import type { ComponentType, CSSProperties, SVGProps } from 'react'
import { cn } from '@lib/utils'
import type { FeatureTab } from '../types'
import { AIIcon, AnalyticsIcon, ArrowRightIcon, BoardsIcon, CodeIcon, CommunitiesIcon, CoursesIcon, PlaygroundsIcon, PodcastsIcon } from '../icons'

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
interface TabConfig extends FeatureTab { Icon: IconComponent }

const TABS: TabConfig[] = [
  { id: 'profiles', label: 'Профили', title: 'Профили университетов', description: 'Соберите кампус, общежития, аудитории, библиотеки и студенческую жизнь из открытых материалов с понятным уровнем подтверждения.', href: '/workspace#trace-workspace-title', color: '#3b82f6', bgClass: 'bg-blue-500', Icon: CoursesIcon },
  { id: 'sources', label: 'Источники', title: 'Каждая ссылка на виду', description: 'Сохраняйте страницу провайдера, автора, лицензию и дату. TRACE не подменяет слабые материалы стоковыми изображениями.', href: '/workspace#trace-workspace-title', color: '#06b6d4', bgClass: 'bg-cyan-500', Icon: PlaygroundsIcon },
  { id: 'comparison', label: 'Сравнение', title: 'Сравнивайте покрытие', description: 'Поставьте два профиля рядом и увидьте, какие категории документированы лучше. Это не рейтинг университетов.', href: '/workspace#trace-workspace-title', color: '#f97316', bgClass: 'bg-orange-500', Icon: BoardsIcon },
  { id: 'timeline', label: 'Хронология', title: 'Свежесть материалов', description: 'Отделяйте текущие свидетельства от архивных и проверяйте, когда источник был опубликован или обновлён.', href: '/workspace#trace-workspace-title', color: '#ec4899', bgClass: 'bg-pink-500', Icon: PodcastsIcon },
  { id: 'provenance', label: 'Происхождение', title: 'Источник важнее догадки', description: 'Видьте путь от провайдера до карточки профиля: категория, ссылка, авторство, лицензия и индекс доказательности.', href: '/workspace#trace-workspace-title', color: '#171717', bgClass: 'bg-neutral-900', Icon: CodeIcon },
  { id: 'assistant', label: 'Ассистент', title: 'Ответы по текущим источникам', description: 'Задавайте вопросы по профилю. Ассистент возвращает цитаты и ссылки, а при нехватке данных сообщает об этом.', href: '/workspace#trace-workspace-title', color: '#a855f7', bgClass: 'bg-purple-500', Icon: AIIcon },
  { id: 'evidence', label: 'Доказательства', title: 'Пробелы не маскируются', description: 'Пустая категория остаётся пустой. TRACE показывает границы публичного материала вместо уверенного заполнения.', href: '/workspace#trace-workspace-title', color: '#3b82f6', bgClass: 'bg-blue-500', Icon: CommunitiesIcon },
  { id: 'coverage', label: 'Покрытие', title: 'Уровень подтверждения', description: 'Смотрите, сколько категорий и материалов подтверждено, какие находятся на проверке и где нужна ручная перепроверка.', href: '/workspace#trace-workspace-title', color: '#3b82f6', bgClass: 'bg-blue-500', Icon: AnalyticsIcon },
]

function FeatureIllustration({ color, active }: { color: string; active: boolean }) {
  const style = { '--feature-color': color } as CSSProperties
  const bars = [4, 8, 3, 12, 16, 10, 6]
  return <div style={style} className={cn('col-start-1 row-start-1 relative h-full w-full overflow-hidden bg-neutral-50 transition-all duration-200 ease-out', active ? 'opacity-100 blur-0' : 'pointer-events-none opacity-0 blur-[2px]')}>
    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--feature-color)] opacity-15 blur-3xl" />
    <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-[var(--feature-color)] opacity-10 blur-3xl" />
    <div className="absolute inset-0 bg-[image:linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
    <div className="relative z-10 m-6 overflow-hidden rounded-xl bg-white nice-shadow md:m-10">
      <div className="flex items-center gap-2 border-b border-black/[0.06] px-4 py-3"><div className="h-2.5 w-2.5 rounded-full bg-neutral-300" /><div className="h-2.5 w-2.5 rounded-full bg-neutral-300" /><div className="h-2.5 w-2.5 rounded-full bg-neutral-300" /><div className="ml-3 h-5 flex-1 rounded-md bg-black/[0.04]" /></div>
      <div className="p-4"><div className="flex gap-3"><div className="w-1/4 space-y-2"><div className="flex items-center gap-1.5 rounded-lg bg-[var(--feature-color)] px-2 py-2"><div className="h-3 w-3 rounded bg-white/80" /><div className="h-2 flex-1 rounded bg-white/60" /></div>{[1, 2, 3].map((item) => <div key={item} className="flex items-center gap-1.5 px-2 py-2"><div className="h-3 w-3 rounded bg-black/10" /><div className="h-2 flex-1 rounded bg-black/[0.06]" /></div>)}</div><div className="flex-1 space-y-2.5"><div className="h-4 w-3/4 rounded bg-black/[0.08]" /><div className="h-2.5 w-full rounded bg-black/[0.05]" /><div className="h-2.5 w-5/6 rounded bg-black/[0.05]" /><div className="h-2.5 w-2/3 rounded bg-black/[0.05]" /><div className="flex h-20 items-end gap-1.5 pt-3">{bars.map((height, index) => <div key={index} className="w-3 rounded-t bg-[var(--feature-color)]" style={{ height: `${height * 4}px`, opacity: 0.45 + index / 20 }} />)}</div></div></div></div>
    </div>
  </div>
}

export function FeatureTabs() {
  const [activeIndex, setActiveIndex] = useState(0)
  return <section className="px-6 pb-24 md:px-12 lg:px-20">
    <div className="relative z-20 flex justify-center"><div role="tablist" className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-white/60 px-2 py-2 backdrop-blur-2xl nice-shadow">{TABS.map((tab, index) => <button key={tab.id} type="button" role="tab" onClick={() => setActiveIndex(index)} aria-selected={index === activeIndex} className={cn('flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors', index === activeIndex ? cn(tab.bgClass, 'text-white') : 'text-neutral-400 hover:text-neutral-600')}><tab.Icon size={16} />{tab.label}</button>)}</div></div>
    <div className="relative z-10 mx-auto -mt-6 max-w-7xl overflow-hidden rounded-2xl bg-white nice-shadow"><div className="flex flex-col md:flex-row"><div className="relative grid h-80 overflow-hidden md:h-[480px] md:w-[55%]">{TABS.map((tab, index) => <FeatureIllustration key={tab.id} color={tab.color} active={index === activeIndex} />)}</div><div className="relative grid p-8 md:w-[45%] md:p-12 lg:p-16">{TABS.map((tab, index) => <div key={tab.id} className={cn('col-start-1 row-start-1 max-w-md self-center transition-all duration-200 ease-out', index === activeIndex ? 'translate-y-0 opacity-100 blur-0' : 'pointer-events-none translate-y-2 opacity-0 blur-[2px]')}><h3 className="mb-4 text-2xl font-bold text-black md:text-3xl">{tab.title}</h3><p className="mb-6 text-base leading-relaxed text-black/60">{tab.description}</p><a href={tab.href} className="inline-flex items-center gap-2 text-sm font-semibold text-black transition-opacity hover:opacity-70">Открыть в TRACE<ArrowRightIcon size={16} /></a></div>)}</div></div></div>
  </section>
}
