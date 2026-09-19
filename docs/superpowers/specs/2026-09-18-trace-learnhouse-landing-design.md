# TRACE on the LearnHouse landing

## Goal

Replace the current standalone `/trace` experience with TRACE presented through the existing LearnHouse landing-page language. Keep the implemented TRACE search, evidence profile, comparison, and grounded assistant, while removing the long demo-style applicant journey from the public interface.

## Routes

- `/` is the canonical public TRACE landing and workspace.
- `/trace` redirects permanently to `/`.
- `/locus` redirects permanently to `/` for compatibility.
- `/api/trace/profile` and `/api/trace/assistant` remain the public same-origin API contract.
- LearnHouse authentication, organization, dashboard, editor, board, billing, and administration routes remain unchanged.

## Landing experience

The initial page reuses the visual structure and component language already present in LearnHouse: its navigation proportions, light surfaces, rounded controls, familiar violet accent, typography scale, spacing, and footer treatment. It is rebranded as TRACE and contains:

1. TRACE navigation and a concise explanation of source-verified university discovery.
2. A LearnHouse-style hero with the university search as the primary action.
3. A short product explanation covering source provenance, evidence gaps, comparison, and grounded questions.
4. A small set of example university searches.
5. Honest disclosures: TRACE measures available evidence, not university quality or admission probability.

The landing must not show the applicant form, demonstration program catalogue, recommendations, diagnosis, or roadmap before a search.

## Workspace transition

Submitting a university search keeps the visitor on `/` and reveals the existing TRACE workspace below the landing hero. The workspace supports:

- explicit Wikidata entity selection when a query is ambiguous;
- loading, not-found, partial-provider, and retry states;
- evidence profile header and audit statistics;
- category filtering and source-linked media cards;
- browser-session shortlist of at most two profiles;
- evidence-coverage comparison without ranking institutions;
- grounded assistant answers with validated citations;
- optional applicant context inside the result experience, clearly labelled as user-provided data.

## Removed interface

Remove `Case02Journey` from the public render path, including the hardcoded three-program recommendation experience, diagnosis panel, roadmap, and roadmap session persistence. The underlying files may be deleted once no tests or imports depend on them. This data is demonstration content and must not be presented as live admissions guidance.

## Component boundaries

- Keep the route entry small and server-rendered for metadata.
- Split client behavior into a landing/search shell and a results workspace instead of one monolithic page.
- Reuse the existing evidence components where their behavior is correct.
- Keep API/provider logic separate from presentational components.
- Preserve English and Russian copy through the existing localization system.

## RAG and server hardening

The current retrieval and citation validation remain, but the landing change is not considered complete without addressing the highest-risk server issues:

- avoid cross-visitor state by replacing the process-global profile cache keyed only by Wikidata entity ID with an opaque per-profile identifier;
- apply request throttling or another bounded-abuse control to public provider and assistant endpoints;
- prevent SSRF when fetching a Wikidata-provided official URL;
- apply an explicit timeout and response-size limit to admissions HTML;
- preserve exact server-side citation validation and refuse answers when evidence is insufficient.

## Verification

- TRACE unit and route tests pass.
- TypeScript type-check and strict lint pass for changed files.
- Production Next.js build succeeds.
- Browser checks cover `/`, redirects from `/trace` and `/locus`, desktop and mobile layouts, ambiguous search, successful profile, not-found state, shortlist comparison, RAG answer with citations, and insufficient-evidence refusal.
- Existing LearnHouse login, organization, and dashboard routes continue to resolve normally.

## Non-goals

- Rebuilding the LearnHouse platform or tenant landing editor.
- Ranking universities or predicting admission.
- Persisting applicant profiles, shortlists, or conversations to the database.
- Introducing a second visual system alongside LearnHouse.
