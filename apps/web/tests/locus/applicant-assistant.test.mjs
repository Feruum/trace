import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)
const read = (path) => readFileSync(fromWebRoot(path), 'utf8')

describe('TRACE applicant and assistant wiring', () => {
  test('persists applicant context on Core and forwards every validated field', () => {
    const client = read('components/CoreTrace/CoreTraceWorkspace.tsx')
    const assistant = read('components/Locus/SourceAssistant.tsx')
    expect(client).toContain('if (!hydrated) return')
    for (const field of ['country', 'city', 'degree', 'field', 'interest', 'intake', 'budget', 'exams']) expect(assistant).toContain(`applicant.${field}`)
    expect(assistant).toContain('claims')
    expect(assistant).toContain('citation.sourceUrl')
    expect(client).toContain('<SourceAssistant')
  })

  test('keeps applicant controls reusable in Core', () => {
    const client = read('components/CoreTrace/CoreTraceWorkspace.tsx')
    const applicant = read('components/Locus/ApplicantOnboarding.tsx')
    expect(client).toContain('<ApplicantOnboarding')
    expect(applicant).toContain('applicant_city')
    expect(applicant).toContain('applicant_remove_exam')
  })
})
