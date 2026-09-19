import Image from 'next/image'

export function CTA() {
  return <section className="px-6 md:px-12 lg:px-20"><div className="relative max-w-7xl mx-auto rounded-2xl nice-shadow overflow-hidden bg-white"><Image src="/trace-landing/cta-illustration.png" alt="" fill loading="lazy" sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover object-center" /><div className="absolute inset-0 bg-white/60" /><div className="relative z-10 flex flex-col items-center justify-center px-6 py-20 text-center md:py-28"><h2 className="text-3xl font-bold tracking-tight text-black md:text-5xl">Начните с одного университета</h2><p className="mt-4 max-w-xl text-base text-black/60 md:text-lg">Проверьте, что открытые источники действительно подтверждают о кампусе и студенческой жизни.</p><a href="/workspace" className="mt-8 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80">Проверить университет</a></div></div></section>
}
