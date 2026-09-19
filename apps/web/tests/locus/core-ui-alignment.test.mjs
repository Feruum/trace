import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)
const read = (path) => readFileSync(fromWebRoot(path), 'utf8')

describe('TRACE Core UI alignment', () => {
  test('uses existing Core shell primitives and supplied Trace assets', () => {
    const workspace = read('components/CoreTrace/CoreTraceWorkspace.tsx')
    const menu = read('components/Objects/Menus/OrgMenu.tsx')
    expect(workspace).toContain('@components/ui/button')
    expect(workspace).toContain('@components/ui/input')
    expect(workspace).toContain('@components/Objects/StyledElements/Wrappers/GeneralWrapper')
    expect(workspace).toContain('/logo_with_alphabet.png')
    expect(menu).toContain('/logo_trace.png')
    expect(workspace).not.toContain('#6c5ce7')
    expect(workspace).not.toContain('#dcd5ff')
  })

  test('keeps the grounded assistant on Core input and button primitives', () => {
    const assistant = read('components/Locus/SourceAssistant.tsx')
    expect(assistant).toContain('@components/ui/button')
    expect(assistant).toContain('@components/ui/input')
    expect(assistant).toContain('/api/trace/assistant')
  })
})
