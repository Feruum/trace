import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const fromWebRoot = (path) => new URL(`../../${path}`, import.meta.url)

describe('TRACE media disclosure contract', () => {
  test('keeps source, license, category, date, and confidence adjacent to every card', () => {
    const card = readFileSync(fromWebRoot('components/Locus/PhotoCard.tsx'), 'utf8')
    for (const field of ['asset.landingUrl', 'asset.license', 'asset.licenseUrl', 'categoryLabel', 'publishedAt', 'ConfidenceBadge']) expect(card).toContain(field)
  })
})
