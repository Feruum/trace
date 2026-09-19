import type { ComponentType, SVGProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { XIcon, GitHubIcon, LinkedInIcon, DiscordIcon, OSIIcon, EUFlagIcon, GlobeIcon, TraceWatermark } from './icons'

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

const socials: { Icon: IconType; label: string; href: string }[] = [
  { Icon: XIcon, label: 'X', href: 'https://x.com' },
  { Icon: GitHubIcon, label: 'GitHub', href: 'https://github.com/learnhouse/learnhouse' },
  { Icon: LinkedInIcon, label: 'LinkedIn', href: 'https://linkedin.com/company/learnhouse' },
  { Icon: DiscordIcon, label: 'Discord', href: 'https://discord.gg/learnhouse' },
]

const badges = [
  { Icon: OSIIcon, title: 'Открытый протокол', subtitle: 'Источники и ограничения видны пользователю', className: 'text-brand-green' },
  { Icon: EUFlagIcon, title: 'Публичные данные', subtitle: 'Никаких закрытых профилей без пометки', className: undefined },
  { Icon: GlobeIcon, title: 'Для абитуриентов', subtitle: 'Проверяйте кампус и студенческую жизнь', className: 'text-brand-blue' },
]

const linkColumns = [
  { title: 'TRACE', links: [{ label: 'Проверить университет', href: '/workspace' }, { label: 'Источники', href: '/workspace#trace-workspace-title' }, { label: 'Сравнение', href: '/workspace#trace-workspace-title' }, { label: 'Ассистент', href: '/workspace#trace-workspace-title' }] },
  { title: 'Методология', links: [{ label: 'Как это работает', href: '/#methodology' }, { label: 'Покрытие', href: '/workspace#trace-workspace-title' }, { label: 'Происхождение', href: '/workspace#trace-workspace-title' }] },
  { title: 'Ссылки', links: [{ label: 'GitHub', href: 'https://github.com/learnhouse/learnhouse' }, { label: 'Открытые источники', href: '/workspace#trace-workspace-title' }, { label: 'Ограничения', href: '/#methodology' }] },
  { title: 'Правила', links: [{ label: 'Приватность', href: '/workspace#trace-workspace-title' }, { label: 'Условия', href: '/workspace#trace-workspace-title' }] },
]

export function Footer() {
  return <footer className="relative overflow-hidden bg-white"><div className="mx-auto max-w-7xl px-6 py-16 md:px-12 lg:px-20"><div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between"><div className="flex max-w-sm flex-col gap-3"><span className="text-2xl font-bold tracking-tight text-black">TRACE</span><p className="text-sm text-black/60">Публичные доказательства для осознанного выбора университета.</p></div><div className="flex items-center gap-3">{socials.map(({ Icon, label, href }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-black/60 transition-colors hover:text-black"><Icon size={20} /></a>)}</div></div><div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">{badges.map(({ Icon, title, subtitle, className }) => <div key={title} className="flex items-center gap-3"><Icon size={24} className={className} /><div className="flex flex-col"><span className="text-sm font-semibold text-black">{title}</span><span className="text-xs text-black/60">{subtitle}</span></div></div>)}</div><div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">{linkColumns.map(({ title, links }) => <div key={title} className="flex flex-col gap-3"><h3 className="text-sm font-semibold text-black">{title}</h3><ul className="flex flex-col gap-2">{links.map((link) => <li key={link.label}><a href={link.href} className="text-sm text-black/60 transition-colors hover:text-black">{link.label}</a></li>)}</ul></div>)}</div><div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-black/10 pt-8 sm:flex-row"><p className="text-xs text-black/60">© 2026 TRACE. Открытые доказательства, не рейтинг.</p><button type="button" className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/80 transition-colors hover:bg-black/5"><GlobeIcon size={16} />Русский<ChevronDown size={14} /></button></div></div><div className="flex justify-center pb-8 pt-4 opacity-[0.06]"><TraceWatermark /></div></footer>
}
