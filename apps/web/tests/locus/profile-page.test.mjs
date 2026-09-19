import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)

describe('TRACE profile migration contract', () => {
  test('removes standalone profile UI while preserving profile and assistant logic', () => {
    expect(existsSync(fromWebRoot('app/universities/[id]/page.tsx'))).toBe(false)
    expect(existsSync(fromWebRoot('app/universities/[id]/UniversityProfileClient.tsx'))).toBe(false)
    expect(existsSync(fromWebRoot('lib/locus/profile-loader.ts'))).toBe(true)
    expect(existsSync(fromWebRoot('components/Locus/SourceAssistant.tsx'))).toBe(true)
    expect(existsSync(fromWebRoot('components/CoreTrace/CoreTraceWorkspace.tsx'))).toBe(true)
  })
})
