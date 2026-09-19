import { jsPDF } from 'jspdf'
import type { LocusProfile } from './types'
import { profileView, type ProfileFilters } from './profile-view'

const MAX_REPORT_BYTES = 1024 * 1024

function addWrapped(pdf: jsPDF, text: string, state: { y: number }, link?: string): void {
  const pageHeight = pdf.internal.pageSize.getHeight()
  const lines = pdf.splitTextToSize(text, 175) as string[]
  for (const line of lines) {
    if (state.y > pageHeight - 18) {
      pdf.addPage()
      state.y = 15
    }
    if (link) {
      pdf.textWithLink(line, 17, state.y, { url: link })
    } else {
      pdf.text(line, 17, state.y)
    }
    state.y += 5
  }
}

export function generateProfileReport(profile: LocusProfile, filters: ProfileFilters = {}): Uint8Array {
  const view = profileView(profile, filters)
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const state = { y: 16 }
  pdf.setFontSize(16)
  addWrapped(pdf, view.university.name, state)
  pdf.setFontSize(10)
  addWrapped(pdf, `Entity: ${view.university.id}`, state)
  addWrapped(pdf, `Last checked: ${view.lastCheckedAt}`, state)
  addWrapped(pdf, `Summary: ${view.summary}`, state)
  state.y += 3
  addWrapped(pdf, 'Category coverage:', state)
  for (const [category, assets] of Object.entries(view.categories)) {
    addWrapped(pdf, `- ${category}: ${assets.length}`, state)
  }
  const confirmed = view.assets.filter((asset) => asset.confidence.level === 'high').length
  const review = view.assets.length - confirmed
  addWrapped(pdf, `Confirmed: ${confirmed}; review: ${review}`, state)
  state.y += 3
  addWrapped(pdf, 'Provider diagnostics:', state)
  for (const diagnostic of view.providerDiagnostics ?? []) {
    addWrapped(pdf, `${diagnostic.provider} / ${diagnostic.category ?? 'general'}: ${diagnostic.status}; ${diagnostic.candidateCount}; ${diagnostic.reason ?? 'ok'}`, state)
  }
  state.y += 3
  addWrapped(pdf, 'Admissions preliminary source checks:', state)
  for (const check of view.admissions?.preliminaryChecks ?? []) {
    addWrapped(pdf, `${check.exam}: ${check.result}; scope=${check.scope}; minimum=${check.minimumScore ?? 'n/a'}`, state)
    addWrapped(pdf, `Quote: ${check.quote ?? ''}`, state)
    addWrapped(pdf, `Source: ${check.sourceUrl ?? ''}`, state, check.sourceUrl ?? undefined)
  }
  state.y += 3
  addWrapped(pdf, 'Evidence sources:', state)
  for (const asset of view.assets) {
    addWrapped(pdf, `[${asset.primaryCategory}] ${asset.title} — ${asset.license}`, state)
    addWrapped(pdf, asset.landingUrl, state, asset.landingUrl)
  }
  const bytes = new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer)
  if (bytes.byteLength > MAX_REPORT_BYTES) return bytes.slice(0, MAX_REPORT_BYTES)
  return bytes
}
