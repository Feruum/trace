'use client'

import { useState } from 'react'
import { cn } from '@lib/utils'
import type { PricingAudience } from '../types'

const audiences: PricingAudience[] = [
  {
    id: 'applicant',
    label: 'Абитуриент',
    plans: [
      { name: 'Первый запрос', price: 'Free', description: 'Для начала проверки', features: ['Поиск университета', 'Базовые категории', 'Открытые ссылки'], cta: 'Проверить' },
      { name: 'Профиль', price: 'Free', description: 'Для внимательного просмотра', features: ['Кампус и город', 'Общежития и аудитории', 'Авторство и лицензии', 'Пробелы в данных'], cta: 'Открыть профиль', highlighted: true },
      { name: 'Shortlist', price: 'Free', description: 'Для принятия решения', features: ['Два профиля рядом', 'Покрытие категорий', 'Материалы на проверке', 'Без рейтинга'], cta: 'Сравнить' },
    ],
  },
  {
    id: 'researcher',
    label: 'Исследователь',
    plans: [
      { name: 'Источники', price: 'Free', description: 'Для быстрой проверки', features: ['Провайдеры', 'Ссылки на страницы', 'Дата публикации'], cta: 'Открыть источники' },
      { name: 'Аудит', price: 'Free', description: 'Для воспроизводимого просмотра', features: ['Индекс доказательности', 'Границы категорий', 'Визуальный хэш', 'Причины принятия'], cta: 'Проверить аудит', highlighted: true },
      { name: 'Сравнение', price: 'Free', description: 'Для нескольких вариантов', features: ['Два университета', 'Общая матрица покрытия', 'Материалы на проверке', 'Ограничения вывода'], cta: 'Сопоставить' },
    ],
  },
  {
    id: 'advisor',
    label: 'Консультант',
    plans: [
      { name: 'Срез', price: 'Free', description: 'Для первого разговора', features: ['Короткий профиль', 'Публичная база', 'Без входа'], cta: 'Начать' },
      { name: 'Доказательства', price: 'Free', description: 'Для точного обсуждения', features: ['Категории кампуса', 'Студенческая жизнь', 'Цитаты и ссылки', 'Недостаток данных отмечен'], cta: 'Посмотреть', highlighted: true },
      { name: 'Ассистент', price: 'Free', description: 'Для вопросов по профилю', features: ['Ответ по текущим данным', 'Короткая цитата', 'Ссылка на источник', 'Честное «данных мало»'], cta: 'Спросить' },
    ],
  },
]

function CheckIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
}

function PricingCard({ plan }: { plan: PricingAudience['plans'][number] }) {
  return <div className={cn('flex flex-col rounded-xl border p-6 transition-all duration-200 md:p-8', plan.highlighted ? 'border-white/30 bg-white/[0.07]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]')}>
    <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">{plan.name}</h3>{plan.highlighted && <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-950">Основной</span>}</div>
    <p className="mt-1 text-sm text-neutral-400">{plan.description}</p>
    <div className="mt-6 flex items-baseline gap-1"><span className="text-4xl font-bold tracking-tight text-white">{plan.price}</span></div>
    <a href="/workspace" className={cn('mt-6 block w-full rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-all duration-200', plan.highlighted ? 'bg-white text-neutral-950 hover:opacity-90' : 'border border-white/15 text-white hover:bg-white/10')}>{plan.cta}</a>
    <ul className="mt-8 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-3"><CheckIcon className={cn('mt-0.5 shrink-0', plan.highlighted ? 'text-white' : 'text-neutral-400')} /><span className="text-sm text-neutral-300">{feature}</span></li>)}</ul>
  </div>
}

export function Pricing() {
  const [activeId, setActiveId] = useState('applicant')
  const activeAudience = audiences.find((audience) => audience.id === activeId) ?? audiences[0]
  return <section className="px-6 md:px-12 lg:px-20"><div className="relative max-w-7xl mx-auto overflow-hidden rounded-2xl bg-neutral-950 text-white nice-shadow"><div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" /><div className="relative px-6 py-16 md:px-12 md:py-24"><div className="mx-auto max-w-2xl text-center"><h2 className="text-[28px] font-bold leading-tight tracking-tight md:text-[36px]">TRACE для каждого этапа выбора</h2><p className="mt-4 text-base leading-relaxed text-neutral-400 md:text-lg">Один прозрачный протокол — от первого поиска до сравнения доказательств.</p></div><div className="mt-10 flex flex-wrap items-center justify-center gap-2">{audiences.map((audience) => <button key={audience.id} type="button" onClick={() => setActiveId(audience.id)} className={cn('rounded-full px-4 py-2 text-sm font-medium transition-all duration-200', audience.id === activeId ? 'bg-white text-neutral-950' : 'text-neutral-400 hover:text-white')} aria-pressed={audience.id === activeId}>{audience.label}</button>)}</div><div key={activeAudience.id} className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">{activeAudience.plans.map((plan) => <PricingCard key={plan.name} plan={plan} />)}</div></div></div></section>
}

export default Pricing
