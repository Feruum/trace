import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)
const read = (path) => readFileSync(fromWebRoot(path), 'utf8')

describe('TRACE LearnHouse landing adaptation contract', () => {
  test('keeps the marketing landing separate from the Core workspace alias', () => {
    const rootPage = read('app/page.tsx')
    const homeClient = read('app/orgs/[orgslug]/(withmenu)/home-client.tsx')

    expect(rootPage).toContain("from '@components/TraceLanding/TraceMarketingLanding'")
    expect(rootPage).not.toContain("from './trace/TraceClient'")
    expect(homeClient).toContain('CoreTraceWorkspace')
    expect(existsSync(fromWebRoot('components/TraceLanding/TraceMarketingLanding.tsx'))).toBe(true)
    expect(existsSync(fromWebRoot('components/CoreTrace/CoreTraceWorkspace.tsx'))).toBe(true)
  })

  test('keeps the clone structure and TRACE product language', () => {
    const landing = read('components/TraceLanding/TraceMarketingLanding.tsx')
    const hero = read('components/TraceLanding/sections/Hero.tsx')
    const sections = [
      'components/TraceLanding/sections/Manifesto.tsx',
      'components/TraceLanding/sections/ValueProps.tsx',
      'components/TraceLanding/sections/FeatureTabs.tsx',
      'components/TraceLanding/sections/Editor.tsx',
      'components/TraceLanding/sections/Globe.tsx',
      'components/TraceLanding/sections/Integrations.tsx',
      'components/TraceLanding/sections/Pricing.tsx',
      'components/TraceLanding/sections/OpenSource.tsx',
      'components/TraceLanding/sections/CTA.tsx',
    ].map(read).join('\n')

    expect(landing).toContain('<Hero />')
    expect(landing).toContain('<FeatureTabs />')
    expect(landing).toContain('<CTA />')
    expect(hero).toContain('Проверь университет')
    expect(hero).toContain('/trace-landing/')
    expect(sections).toContain('TRACE')
    expect(sections).not.toContain('LearnHouse')
    expect(sections).not.toMatch(/label:\s*['"]Courses['"]|label:\s*['"]Communities['"]|label:\s*['"]Get Started['"]/) 
  })
})

