export function Manifesto() {
  return (
    <section id="methodology" className="px-6 md:px-12 lg:px-20 mt-4">
      <div className="max-w-7xl mx-auto rounded-2xl nice-shadow overflow-hidden bg-white py-16 md:py-24 px-10 md:px-20 relative">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,rgba(0,0,0,0.07)_1px,transparent_1px)] bg-[length:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-[28px] md:text-[36px] font-bold leading-tight text-black">Проверка университета без чёрного ящика.</h2>
          <p className="mt-6 text-base md:text-lg text-black/70 leading-relaxed">TRACE собирает открытые <a href="/workspace#trace-workspace-title" className="text-brand-blue underline underline-offset-2 decoration-current hover:opacity-70 transition-opacity">источники</a>, сопоставляет <a href="/workspace#trace-workspace-title" className="text-brand-orange underline underline-offset-2 decoration-current hover:opacity-70 transition-opacity">покрытие</a> категорий и показывает <a href="/workspace#trace-workspace-title" className="text-brand-cyan underline underline-offset-2 decoration-current hover:opacity-70 transition-opacity">профиль</a> университета, не превращая неполные данные в уверенные заявления.</p>
          <p className="mt-6 text-base md:text-lg text-black/70 leading-relaxed">Это быстро. Это прозрачно. Это проверяемо.<br />И каждая ссылка остаётся рядом с выводом.</p>
          <p className="mt-6 text-base md:text-lg text-black/70 leading-relaxed">TRACE измеряет доступность публичных доказательств, а не качество университета.</p>
        </div>
      </div>
    </section>
  )
}
