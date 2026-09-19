# TRACE LearnHouse Clone Adaptation

## Goal

Use the MIT-licensed `Rnbsov/learnhouse-landing-clone` implementation as the visual and structural source for a TRACE marketing landing page, changing product copy and navigation without inventing a new visual system.

## Route contract

- `/` renders the adapted marketing landing.
- `/trace` renders the existing functional TRACE workspace (`TraceClient`).
- TRACE profile APIs and workspace components remain unchanged unless a route import requires a mechanical adjustment.
- Existing LearnHouse organization routes remain unchanged.

## Source and attribution

The landing source is copied from `Rnbsov/learnhouse-landing-clone` at its `master` commit. Its MIT license is retained in the repository as `apps/web/components/TraceLanding/LICENSE` or equivalent source attribution. The port keeps the clone's section order, Tailwind geometry, typography, background treatments, responsive breakpoints, interaction models, and provided image assets.

## Port boundary

Copy only the clone's landing runtime files into focused existing-project locations:

- `apps/web/components/TraceLanding/Header.tsx`
- `apps/web/components/TraceLanding/Footer.tsx`
- `apps/web/components/TraceLanding/icons.tsx`
- `apps/web/components/TraceLanding/types.ts`
- `apps/web/components/TraceLanding/sections/*.tsx`
- `apps/web/public/trace-landing/*` for clone media assets
- `apps/web/components/TraceLanding/TraceMarketingLanding.tsx` for source page assembly

Adapt imports to the current Next.js/Tailwind setup. Reuse installed `lucide-react`; do not add `@base-ui/react`. Replace the clone's Base UI dropdown/dialog implementation with the smallest equivalent existing React state and semantic elements while preserving the same visual states.

## TRACE content map

- LearnHouse brand/name → TRACE.
- Product → TRACE product navigation.
- Resources → Methodology / Sources / GitHub.
- AI → Source assistant.
- Personal → Applicant profile.
- Developers → API/methodology section or `/trace` anchor.
- Pricing → Coverage / comparison model; no invented paid product claims.
- Courses → University profiles.
- Communities → Sources and evidence.
- Boards → Compare coverage.
- Playgrounds → Applicant profile.
- AI → Grounded assistant.
- Analytics → Evidence coverage and confidence.
- Payments → Source provenance.
- Podcasts → Evidence timeline.
- Hero CTA → `/trace`.
- Demo CTA → `/trace`.
- Open-source/developer section → TRACE evidence pipeline and GitHub link.
- Final CTA → “Проверить университет” / “Check a university”.

English remains the source language used by the clone components; Russian localization can be added through existing i18n only where it does not alter the port structure. The functional TRACE UI keeps its current `react-i18next` translations.

## Existing TRACE preservation

`apps/web/app/trace/page.tsx` must render:

```tsx
import TraceClient from './TraceClient'

export default function TracePage() {
  return <TraceClient />
}
```

`apps/web/app/page.tsx` must render `TraceMarketingLanding` and carry TRACE marketing metadata. No profile fetching occurs on the marketing route.

## Verification contract

- Static landing contract asserts `/` imports `TraceMarketingLanding`, `/trace` imports `TraceClient`, and no LearnHouse product labels remain in adapted landing source.
- Run existing landing tests plus the new contract test.
- Launch the web app and smoke-test `/` and `/trace`; verify the marketing CTA navigates to `/trace` and TRACE search UI remains visible.
- Do not run formatters or broad lint suites during implementation; run focused tests and the actual app smoke test at the end.
