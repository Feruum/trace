import type { ComponentType, SVGProps } from 'react'
import { cn } from '@lib/utils'
import { AnalyticsIcon, CustomizeIcon, LaunchIcon, OpenSourceIcon } from '../icons'

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

const valueProps: { title: string; description: string; Icon: IconType }[] = [
  { title: 'Найти университет', description: 'Начните с любого названия. TRACE уточнит объект и соберёт профиль из открытых источников.', Icon: LaunchIcon },
  { title: 'Увидеть доказательства', description: 'Страница провайдера, автор, лицензия, дата и индекс доказательности остаются рядом с материалом.', Icon: CustomizeIcon },
  { title: 'Сравнить покрытие', description: 'Сопоставьте два профиля по полноте публичных свидетельств — без рейтинга и выдуманного победителя.', Icon: AnalyticsIcon },
  { title: 'Открытый протокол', description: 'TRACE показывает пробелы, ограничения и происхождение данных вместо уверенных догадок.', Icon: OpenSourceIcon },
]

export function ValueProps() {
  return <section className="px-6 md:px-12 lg:px-20 mt-4"><div className="max-w-7xl mx-auto rounded-2xl nice-shadow overflow-hidden bg-white"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">{valueProps.map((prop, i) => { const borderR = i === 3 ? '' : i === 1 ? 'lg:border-r' : 'md:border-r'; return <div key={prop.title} className={cn('p-6 md:p-8 border-t border-black/[0.06]', borderR)}><prop.Icon size={26} className="text-black mb-4" /><h3 className="text-base md:text-lg font-bold text-black mb-2">{prop.title}</h3><p className="text-sm text-black/60 leading-relaxed">{prop.description}</p></div> })}</div></div></section>
}
