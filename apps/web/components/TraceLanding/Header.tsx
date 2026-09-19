"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react'
import { GitHubIcon } from './icons'
import { cn } from '@lib/utils'

type NavItem = { label: string; href: string }

const productItems: NavItem[] = [
  { label: 'Профили', href: '/workspace#trace-workspace-title' },
  { label: 'Источники', href: '/workspace#trace-workspace-title' },
  { label: 'Сравнение', href: '/workspace#trace-workspace-title' },
]

const resourcesItems: NavItem[] = [
  { label: 'Методология', href: '/#methodology' },
  { label: 'GitHub', href: 'https://github.com/learnhouse/learnhouse' },
  { label: 'Рабочая область', href: '/workspace' },
]

const simpleNavLinks: NavItem[] = [
  { label: 'Ассистент', href: '/workspace#trace-workspace-title' },
  { label: 'Абитуриент', href: '/workspace#trace-workspace-title' },
  { label: 'Как это работает', href: '/#methodology' },
]

const GITHUB_URL = 'https://github.com/learnhouse/learnhouse'
const GITHUB_STARS = 'TRACE'

function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="group inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-70 focus-visible:outline-none">
        {label}
        <ChevronDown className={cn('size-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && <div className="absolute start-0 top-full z-20 mt-2 min-w-[200px] rounded-xl border border-black/5 bg-white p-1.5 shadow-xl" onMouseLeave={() => setOpen(false)}>{items.map((item) => <a key={item.label} href={item.href} className="block rounded-lg px-3 py-2 text-sm text-black/70 transition-colors hover:bg-black/5 hover:text-black">{item.label}</a>)}</div>}
    </div>
  )
}

function MobileNavSection({ title, items, onItemClick }: { title: string; items: NavItem[]; onItemClick: () => void }) {
  return <div className="flex flex-col gap-0.5"><span className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-black/40">{title}</span>{items.map((item) => <a key={item.label} href={item.href} onClick={onItemClick} className="rounded-lg px-3 py-2 text-sm text-black/70 transition-colors hover:bg-black/5 hover:text-black">{item.label}</a>)}</div>
}

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return <header className={cn('fixed inset-x-0 top-0 z-[200] w-full transition-[background-color,backdrop-filter,box-shadow] duration-500', scrolled ? 'bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] backdrop-blur-xl backdrop-saturate-150' : 'bg-transparent')}>
    <div className="mx-auto flex h-[52px] max-w-7xl items-center justify-between px-6 md:px-12 lg:px-20">
      <a href="/" className="flex shrink-0 items-center" aria-label="TRACE home"><span className="text-xl font-black tracking-[-0.06em] text-white">TRACE</span></a>
      <nav className="hidden items-center gap-0.5 md:flex"><NavDropdown label="Продукт" items={productItems} /><NavDropdown label="Ресурсы" items={resourcesItems} />{simpleNavLinks.map((link) => <a key={link.label} href={link.href} className="rounded-md px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-70">{link.label}</a>)}</nav>
      <div className="hidden items-center gap-3 md:flex"><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80"><GitHubIcon size={14} /><span>{GITHUB_STARS}</span></a><a href="/workspace" className="rounded-md px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-70">Войти</a><a href="/workspace" className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">Проверить</a></div>
      <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex items-center justify-center rounded-md p-2 text-white md:hidden" aria-label="Открыть меню"><MenuIcon className="size-5" /></button>
      {mobileOpen && <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)}><aside className="fixed end-0 top-0 z-[201] flex h-full w-[300px] max-w-[85vw] flex-col bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><span className="text-lg font-bold text-black">TRACE</span><button type="button" onClick={() => setMobileOpen(false)} className="rounded-md p-2 text-black/60 transition-colors hover:bg-black/5 hover:text-black" aria-label="Закрыть меню"><X className="size-5" /></button></div><nav className="mt-2 flex-1 overflow-y-auto"><MobileNavSection title="Продукт" items={productItems} onItemClick={() => setMobileOpen(false)} /><MobileNavSection title="Ресурсы" items={resourcesItems} onItemClick={() => setMobileOpen(false)} /><MobileNavSection title="Навигация" items={simpleNavLinks} onItemClick={() => setMobileOpen(false)} /></nav><div className="mt-4 flex flex-col gap-3 border-t border-black/10 pt-4"><a href="/workspace" onClick={() => setMobileOpen(false)} className="rounded-lg px-4 py-2 text-center text-sm font-medium text-black/70 transition-colors hover:bg-black/5">Открыть TRACE</a></div></aside></div>}
    </div>
  </header>
}
