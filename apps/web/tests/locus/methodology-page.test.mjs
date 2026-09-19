import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)

describe('TRACE methodology migration contract', () => {
  test('removes standalone methodology UI while keeping project copy on the Core landing', () => {
    expect(existsSync(fromWebRoot('app/methodology/page.tsx'))).toBe(false)
    expect(existsSync(fromWebRoot('components/TraceLanding/sections/Manifesto.tsx'))).toBe(true)
    expect(existsSync(fromWebRoot('components/CoreTrace/CoreTraceWorkspace.tsx'))).toBe(true)
  })
})
