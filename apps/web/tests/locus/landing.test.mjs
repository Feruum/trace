import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)

describe('TRACE Core landing contract', () => {
  test('keeps the marketing landing separate from the Core evidence workspace', () => {
    const rootPage = readFileSync(fromWebRoot('app/page.tsx'), 'utf8')
    const homeClient = readFileSync(fromWebRoot('app/orgs/[orgslug]/(withmenu)/home-client.tsx'), 'utf8')
    expect(rootPage).toContain("from '@components/TraceLanding/TraceMarketingLanding'")
    expect(homeClient).toContain('CoreTraceWorkspace')
    expect(existsSync(fromWebRoot('components/CoreTrace/CoreTraceWorkspace.tsx'))).toBe(true)
  })

  test('keeps ambiguity selection and grounded assistant in Core workspace', () => {
    const workspace = readFileSync(fromWebRoot('components/CoreTrace/CoreTraceWorkspace.tsx'), 'utf8')
    expect(workspace).toContain("status === 'selection_required'")
    expect(workspace).toContain('<SourceAssistant')
    expect(workspace).toContain('<ApplicantOnboarding')
  })
})
