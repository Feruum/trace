import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)

describe('TRACE comparison migration contract', () => {
  test('removes standalone comparison UI while keeping comparison logic and Core UI', () => {
    expect(existsSync(fromWebRoot('app/compare/page.tsx'))).toBe(false)
    expect(existsSync(fromWebRoot('app/compare/CompareClient.tsx'))).toBe(false)
    expect(existsSync(fromWebRoot('lib/locus/comparison.ts'))).toBe(true)
    expect(existsSync(fromWebRoot('components/CoreTrace/CoreTraceWorkspace.tsx'))).toBe(true)
  })
})
