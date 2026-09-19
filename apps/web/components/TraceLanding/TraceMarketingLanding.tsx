import { Header } from './Header'
import { Footer } from './Footer'
import Hero from './sections/Hero'
import { Manifesto } from './sections/Manifesto'
import { ValueProps } from './sections/ValueProps'
import Editor from './sections/Editor'
import { FeatureTabs } from './sections/FeatureTabs'
import { Globe } from './sections/Globe'
import { Integrations } from './sections/Integrations'
import { Pricing } from './sections/Pricing'
import { OpenSource } from './sections/OpenSource'
import { CTA } from './sections/CTA'


export default function TraceMarketingLanding() {
  return (
    <>
      <Header />
      <main className="relative h-full bg-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.8) 1px, transparent 1px)', backgroundSize: '20px 20px', maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%)' }} />
        <div className="relative">
          <Hero />
          <div className="h-6 md:h-10" />
          <Manifesto />
          <div className="h-6 md:h-10" />
          <ValueProps />
          <div className="h-6 md:h-10" />
          <Editor />
          <div className="h-16 md:h-24" />
          <FeatureTabs />
          <Globe />
          <Integrations />
          <Pricing />
          <OpenSource />
          <CTA />
        </div>
      </main>
      <Footer />
    </>
  )
}
