import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)
const read = (path) => readFileSync(fromWebRoot(path), 'utf8')

const OLD_TRACE_UI = [
  'app/trace/page.tsx',
  'app/trace/TraceClient.tsx',
  'app/methodology/page.tsx',
  'app/compare/page.tsx',
  'app/compare/CompareClient.tsx',
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
  'app/universities/[id]/page.tsx',
  'app/universities/[id]/UniversityProfileClient.tsx',
  'app/locus/page.tsx',
]

describe('TRACE Core integration contract', () => {
  test('replaces the public organization course landing with the Core workspace', () => {
    const home = read('app/orgs/[orgslug]/(withmenu)/home-client.tsx')
    expect(home).toContain('CoreTraceWorkspace')
    expect(home).toContain('useOrg')
    expect(home).not.toContain('useCourses')
    expect(home).not.toContain('LandingClassic')
    expect(home).not.toContain('LandingCustom')
  })

  test('keeps the full profile, evidence, comparison, applicant, and RAG flow on Core primitives', () => {
    const workspace = read('components/CoreTrace/CoreTraceWorkspace.tsx')
    expect(workspace).toContain('@components/Objects/StyledElements/Wrappers/GeneralWrapper')
    expect(workspace).toContain('@components/ui/button')
    expect(workspace).toContain('@components/ui/input')
    expect(workspace).toContain('/api/trace/profile')
    expect(workspace).toContain('CategoryGallery')
    expect(workspace).toContain('SourceAudit')
    expect(workspace).toContain('SourceAssistant')
    expect(workspace).toContain('ApplicantOnboarding')
    expect(workspace).toContain('compareProfiles')
  })

  test('uses the supplied Trace logo assets in the Core surface', () => {
    const workspace = read('components/CoreTrace/CoreTraceWorkspace.tsx')
    const menu = read('components/Objects/Menus/OrgMenu.tsx')
    expect(workspace).toContain('/logo_with_alphabet.png')
    expect(menu).toContain('/logo_trace.png')
    expect(existsSync(fromWebRoot('public/logo_trace.png'))).toBe(true)
    expect(existsSync(fromWebRoot('public/logo_with_alphabet.png'))).toBe(true)
  })

  test('removes old standalone TRACE visual routes while preserving server logic', () => {
    for (const routeFile of OLD_TRACE_UI) expect(existsSync(fromWebRoot(routeFile))).toBe(false)
    expect(existsSync(fromWebRoot('app/api/trace/profile/route.ts'))).toBe(true)
    expect(existsSync(fromWebRoot('app/api/trace/assistant/route.ts'))).toBe(true)
    expect(existsSync(fromWebRoot('lib/locus/rag/service.ts'))).toBe(true)
    expect(existsSync(fromWebRoot('lib/locus/pipeline.ts'))).toBe(true)
  })
})
