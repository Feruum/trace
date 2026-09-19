import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)
const read = (path) => readFileSync(fromWebRoot(path), 'utf8')

describe('TRACE Core frontend hardening contract', () => {
  test('uses the Core workspace for staged workflow and accessible applicant controls', () => {
    const workspace = read('components/CoreTrace/CoreTraceWorkspace.tsx')
    const applicant = read('components/Locus/ApplicantOnboarding.tsx')
    expect(workspace).toContain('progressKey[getTraceProgressStage')
    expect(workspace).toContain('aria-live="polite"')
    expect(applicant).toContain('name="country"')
    expect(applicant).toContain('autoComplete="country-name"')
  })
})
