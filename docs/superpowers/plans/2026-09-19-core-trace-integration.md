# Core TRACE Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the old TRACE visual routes while preserving their backend logic, and integrate university evidence search, profile rendering, comparison, and the grounded RAG assistant into the existing LearnHouse Core public organization page without changing the Core visual system.

**Architecture:** Keep `apps/web/lib/locus` and the existing `/api/locus/*` and `/api/trace/*` server contracts as the logic boundary. Replace the Core public organization landing content, not its shell: `OrgMenu`, organization context, `GeneralWrapperStyled`, Core typography, spacing, colors, cards, buttons, and responsive behavior remain the presentation system. Add a Core-styled TRACE feature component that owns search/profile/evidence/chat state and composes existing evidence logic components only after adapting their presentation to Core primitives. Remove all old TRACE page routes, including `/trace`, `/methodology`, `/compare`, `/privacy`, `/terms`, `/universities/[id]`, and `/locus`; old UI URLs must resolve to 404. Keep backend legal/API endpoints and RAG implementation.

**Tech Stack:** Next.js App Router, React, TypeScript, existing LearnHouse Core components, TanStack Query where already used, `@lib/locus` profile pipeline and RAG, Vitest/Bun tests.

---

## Scope decisions

- `/` remains the project presentation landing page.
- The public organization page `/orgs/[orgslug]/` becomes the project workspace content instead of the course grid.
- The existing Core organization shell remains unchanged: organization context, menu, colors, typography, layout, footer, and responsive behavior.
- Branding changes are limited to the project logo and project-specific copy. Do not redesign Core colors, spacing, typography, buttons, or navigation.
- Core page flow: search university → resolve ambiguous candidates → show profile/evidence → filter categories → shortlist up to two → compare coverage → ask grounded RAG questions below evidence.
- The RAG assistant is a real frontend integration: it posts the current `profileToken` to `/api/trace/assistant`, renders answered claims/citations, and renders explicit insufficient-evidence responses.
- Preserve all server logic, including `apps/web/lib/locus`, `/api/locus/*`, `/api/trace/*`, profile cache/store, source adapters, RAG retrieval, model validation, rate limits, comparison, feedback, health, metrics, and legal API routes.
- Delete old TRACE page UI and route modules. Do not delete shared logic merely because its former page imported it.

## File map

### Modify

- `apps/web/app/orgs/[orgslug]/(withmenu)/home-client.tsx` — render the Core-styled project workspace instead of `LandingClassic`/`LandingCustom` for the public organization page; retain organization metadata and context.
- `apps/web/components/Landings/LandingClassic.tsx` — only if existing Core landing composition must be reused or simplified; do not alter its visual tokens outside the replacement boundary.
- `apps/web/components/Objects/Menus/OrgMenu.tsx` — only the minimum logo/alt/copy changes required for project branding; preserve layout and menu behavior.
- `apps/web/app/layout.tsx` and/or public Core metadata location — update project title/description only where required; preserve Core shell metadata behavior.
- `apps/web/components/Locus/*` — adapt reusable profile/evidence/assistant components to Core primitives and remove old TRACE-specific visual styling/labels where necessary; keep data contracts and behavior.
- `apps/web/tests/locus/*` — update tests that assert old page existence or old visual route markup; add behavior assertions for the Core public workspace and RAG integration.

### Create only if required after inspection

- `apps/web/components/CoreTrace/TraceWorkspace.tsx` — Core presentation/state boundary for the public organization page. Prefer reusing existing `TraceClient` state logic by extracting it rather than copying it.
- `apps/web/components/CoreTrace/TraceSearch.tsx` — Core-styled search and candidate resolution controls, if extraction keeps responsibilities clear.
- `apps/web/components/CoreTrace/TraceProfile.tsx` — Core-styled profile/evidence/comparison composition, if the current components cannot be adapted cleanly in place.

### Delete

- `apps/web/app/trace/page.tsx`
- `apps/web/app/trace/TraceClient.tsx`
- `apps/web/app/trace/trace-workflow.ts` only if its pure workflow helpers are moved to a shared non-route location first; otherwise preserve the helper in a neutral location.
- `apps/web/app/methodology/page.tsx`
- `apps/web/app/compare/page.tsx`
- `apps/web/app/compare/CompareClient.tsx`
- `apps/web/app/privacy/page.tsx`
- `apps/web/app/terms/page.tsx`
- `apps/web/app/universities/[id]/page.tsx`
- `apps/web/app/universities/[id]/UniversityProfileClient.tsx`
- `apps/web/app/locus/page.tsx`
- Any route-local TRACE-only UI files that have no consumer after extraction.

### Preserve

- `apps/web/lib/locus/**`
- `apps/web/app/api/locus/**`
- `apps/web/app/api/trace/**`
- `apps/web/components/Locus` data/evidence components after Core styling adaptation
- source adapters, profile pipeline, cache/store, RAG retrieval/service/provider, and tests for backend behavior.

---

## Task 1: Establish the Core workspace contract

**Files:**
- Modify: `apps/web/app/orgs/[orgslug]/(withmenu)/home-client.tsx`
- Inspect/modify: `apps/web/components/Landings/LandingClassic.tsx`
- Test: `apps/web/tests/locus/core-ui-alignment.test.mjs`

- [ ] **Step 1: Write the failing route contract test**

Add a test that reads the public organization page source and asserts the page imports the new Core workspace boundary and no longer renders `LandingClassic` or `LandingCustom` as the primary content. The test must also assert that the page still uses `useOrg` and `useOrg`-derived organization metadata so public organization routing remains intact.

```js
assert.match(homeClient, /CoreTrace|TraceWorkspace/)
assert.doesNotMatch(homeClient, /<LandingClassic|<LandingCustom/)
assert.match(homeClient, /useOrg/)
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `apps/web`:

```bash
bun test tests/locus/core-ui-alignment.test.mjs
```

Expected: FAIL because the current page still selects `LandingClassic` or `LandingCustom`.

- [ ] **Step 3: Define the workspace boundary without changing the Core shell**

Change `home-client.tsx` so it keeps `OrgContext`, `JsonLd`, organization URL/logo metadata, and the existing loading/error boundary, but renders a Core workspace component in the content slot. Do not remove the parent `(withmenu)` layout. Do not add a second navigation, new color palette, gradients, or a standalone TRACE page shell.

The resulting page contract should be equivalent to:

```tsx
return (
  <div className="w-full">
    {orgJsonLd && <JsonLd data={orgJsonLd} />}
    <CoreTraceWorkspace orgslug={orgslug} org={org} />
  </div>
)
```

Use the existing `GeneralWrapperStyled`, Core cards, existing `Input`/`Button` components, and current Core spacing tokens inside the new workspace.

- [ ] **Step 4: Run the focused contract test**

```bash
bun test tests/locus/core-ui-alignment.test.mjs
```

Expected: PASS for the route contract.

- [ ] **Step 5: Commit the boundary change**

```bash
git add apps/web/app/orgs/[orgslug]/(withmenu)/home-client.tsx apps/web/tests/locus/core-ui-alignment.test.mjs
 git commit -m "feat: make core organization home the trace workspace"
```

## Task 2: Extract pure TRACE workflow logic from deleted route files

**Files:**
- Modify/create: neutral shared location under `apps/web/components/CoreTrace` or `apps/web/lib/locus`
- Source: `apps/web/app/trace/TraceClient.tsx`, `apps/web/app/trace/trace-workflow.ts`
- Test: `apps/web/tests/locus/workflow.test.mjs`

- [ ] **Step 1: Inventory route-only imports and pure helpers**

Move only pure workflow helpers and types needed by the Core workspace. Preserve these behaviors exactly:

- profile request construction, including explicit Wikidata candidate IDs;
- applicant context handling;
- aborting the previous profile request;
- elapsed search timing;
- session shortlist limit of two;
- session applicant context persistence;
- comparison calculation from two shortlisted profiles;
- reset/retry behavior.

Do not move JSX or old page styling into the shared logic layer.

- [ ] **Step 2: Add/retain behavior tests before extraction**

Ensure `workflow.test.mjs` covers: ordinary query submission, explicit candidate selection, shortlist maximum of two, and comparison only when two profiles are present. Tests must invoke exported behavior or stable pure helpers, not assert incidental source formatting.

- [ ] **Step 3: Extract and update imports**

Create a neutral import path such as `@components/CoreTrace/workflow` or `@lib/locus/workflow`. Update all new Core workspace imports to use it. Do not leave the Core page importing from `app/trace/*` after the route is deleted.

- [ ] **Step 4: Run workflow tests**

```bash
bun test tests/locus/workflow.test.mjs
```

Expected: PASS with the route-independent helpers.

- [ ] **Step 5: Commit the extraction**

```bash
git add apps/web/components/CoreTrace apps/web/lib/locus apps/web/tests/locus/workflow.test.mjs
 git commit -m "refactor: move trace workflow out of route UI"
```

## Task 3: Build Core-styled search and profile workspace

**Files:**
- Create/modify: `apps/web/components/CoreTrace/TraceWorkspace.tsx`
- Create/modify: `apps/web/components/CoreTrace/TraceSearch.tsx`
- Create/modify: `apps/web/components/CoreTrace/TraceProfile.tsx`
- Reuse/adapt: `apps/web/components/Locus/ProfileHeader.tsx`, `CategoryGallery.tsx`, `SourceAudit.tsx`, `ApplicantOnboarding.tsx`
- Test: `apps/web/tests/locus/core-workspace.test.mjs`

- [ ] **Step 1: Add failing behavior tests**

Cover observable contracts:

- anonymous visitor sees the university search in the Core public organization page;
- profile request posts to `/api/trace/profile` and displays a ready profile;
- ambiguous resolution displays candidate selection and selecting a candidate submits its ID;
- not-found and provider errors show Core error states with retry/reset;
- category filtering changes visible evidence;
- shortlist cannot exceed two profiles;
- comparison opens only with two shortlisted profiles and does not rank universities.

Use injected fetch seams or the existing test harness; do not assert class names or source text unless needed for route wiring.

- [ ] **Step 2: Run tests to verify the new behavior is absent**

```bash
bun test tests/locus/core-workspace.test.mjs
```

Expected: FAIL because the Core page currently renders the course landing and has no TRACE workspace.

- [ ] **Step 3: Implement search and profile state in the Core boundary**

Use the existing Core layout primitives. Keep the following data contract unchanged:

```ts
type CoreTraceWorkspaceProps = {
  orgslug: string
  org: unknown
}
```

The workspace must call the existing profile endpoint, preserve `ProfileResponse`, render `ProfileHeader`, `CategoryGallery`, `SourceAudit`, and preserve source URLs/licenses/creator/date/confidence and honest empty states. Keep comparison as evidence coverage only.

Use project-specific copy, but do not alter the Core color system or create a TRACE-specific full-screen background.

- [ ] **Step 4: Implement candidate, error, retry, and shortlist transitions**

Keep the existing transitions from `TraceClient` and `TraceWorkspace`: candidate dialog, loading progress, retry, reset, shortlist cap, and comparison panel. Replace only visual classes/labels that conflict with Core; retain accessibility roles, keyboard focus, and live status behavior.

- [ ] **Step 5: Run focused workspace tests**

```bash
bun test tests/locus/core-workspace.test.mjs
bun test tests/locus/workflow.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the workspace**

```bash
git add apps/web/components/CoreTrace apps/web/components/Locus apps/web/tests/locus/core-workspace.test.mjs apps/web/tests/locus/workflow.test.mjs
 git commit -m "feat: render university evidence in core workspace"
```

## Task 4: Integrate and verify the grounded RAG chat in Core

**Files:**
- Modify: `apps/web/components/Locus/SourceAssistant.tsx` or create `apps/web/components/CoreTrace/SourceAssistant.tsx`
- Preserve: `apps/web/app/api/locus/assistant/route.ts`, `apps/web/app/api/trace/assistant/route.ts`, `apps/web/lib/locus/rag/**`
- Test: `apps/web/tests/locus/applicant-assistant.test.mjs`, `apps/web/tests/locus/rag.test.mjs`, `apps/web/tests/locus/core-workspace.test.mjs`

- [ ] **Step 1: Add the failing Core integration assertion**

Assert that the ready profile view renders the assistant below evidence, submits `{ profileToken, question, locale, applicant }` to `/api/trace/assistant`, and displays both successful claims/citations and `insufficient_evidence` without treating refusal as a transport error.

- [ ] **Step 2: Confirm the existing server contract with focused tests**

Run:

```bash
bun test tests/locus/rag.test.mjs tests/locus/rag-evaluation.test.mjs tests/locus/applicant-assistant.test.mjs
```

Expected: Existing RAG/service tests pass; the new Core rendering assertion fails until the component is mounted in the new workspace.

- [ ] **Step 3: Mount the assistant below evidence**

When `profileToken` exists, render the assistant after profile/evidence/source audit content. Preserve the request URL `/api/trace/assistant`, the current profile token, applicant context, locale, timeout/abort behavior, and response fields:

```ts
type RAGAnswer =
  | { status: 'answered'; answer: string; claims: RAGClaim[]; citations: RAGCitation[]; ... }
  | { status: 'insufficient_evidence'; answer: string; claims: []; citations: []; refusalReason: string; explanation: string; ... }
```

Render source links for each citation and show the refusal explanation clearly. Never invent an answer in the browser when the server returns `insufficient_evidence`.

- [ ] **Step 4: Exercise missing-key fallback and provider failure behavior**

Verify that the configured server path can return deterministic evidence-only fallback when no Wikivibe key is configured, and that provider failures render a user-visible error/retry state. Do not expose `WIKIVIBE_API_KEY` to client code.

- [ ] **Step 5: Run focused RAG and Core tests**

```bash
bun test tests/locus/rag.test.mjs tests/locus/rag-evaluation.test.mjs tests/locus/applicant-assistant.test.mjs tests/locus/core-workspace.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the RAG integration**

```bash
git add apps/web/components/CoreTrace apps/web/components/Locus/SourceAssistant.tsx apps/web/tests/locus
 git commit -m "feat: integrate grounded evidence assistant into core"
```

## Task 5: Apply project branding without changing Core design

**Files:**
- Modify: `apps/web/components/Objects/Menus/OrgMenu.tsx`
- Modify: `apps/web/app/orgs/[orgslug]/(withmenu)/layout.tsx` only if footer/logo copy requires it
- Modify: project metadata file(s) identified during implementation
- Test: `apps/web/tests/locus/core-ui-alignment.test.mjs`

- [ ] **Step 1: Add branding contract assertions**

Assert that the Core public workspace and organization menu expose the project logo/alt text and project copy, while existing Core menu structure and design primitives remain in use. Do not assert exact generated class strings.

- [ ] **Step 2: Replace only the project branding**

Use the existing project logo asset and preserve the menu dimensions, responsive behavior, color classes, and organization logo fallback. Replace visible product name/alt text where it represents the project surface. Keep LearnHouse attribution/legal requirements where the repository license or configured watermark requires them; do not remove mandatory attribution as part of visual branding.

- [ ] **Step 3: Update Core workspace copy**

Add concise project copy for search, evidence, source audit, comparison, and assistant states. Keep Core typography scale, button components, focus rings, card borders, and spacing.

- [ ] **Step 4: Run branding contract tests**

```bash
bun test tests/locus/core-ui-alignment.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit branding changes**

```bash
git add apps/web/components/Objects/Menus/OrgMenu.tsx apps/web/app/orgs/[orgslug]/(withmenu)/layout.tsx apps/web/tests/locus/core-ui-alignment.test.mjs
 git commit -m "feat: apply project branding to core workspace"
```

## Task 6: Remove old TRACE visual routes after Core parity

**Files:**
- Delete: old TRACE page modules listed in the Preserve/Delete map
- Modify: `apps/web/tests/locus/trace-marketing.test.mjs`, `compare-page.test.mjs`, `methodology-page.test.mjs`, `profile-page.test.mjs`, `frontend-hardening.test.mjs`
- Preserve: all `apps/web/app/api/**` endpoints and `apps/web/lib/locus/**`

- [ ] **Step 1: Add route-removal tests**

Assert that old page files are absent or that Next route discovery does not expose them, while API files remain present:

```js
for (const routeFile of oldTracePageFiles) assert.equal(existsSync(routeFile), false)
assert.equal(existsSync('app/api/trace/profile/route.ts'), true)
assert.equal(existsSync('app/api/trace/assistant/route.ts'), true)
assert.equal(existsSync('lib/locus/rag/service.ts'), true)
```

- [ ] **Step 2: Run the route tests and verify they fail before deletion**

```bash
bun test tests/locus/trace-marketing.test.mjs tests/locus/compare-page.test.mjs tests/locus/methodology-page.test.mjs tests/locus/profile-page.test.mjs
```

Expected: FAIL because the old page files still exist.

- [ ] **Step 3: Delete only old visual route modules**

Delete `/trace`, `/methodology`, `/compare`, `/privacy`, `/terms`, `/universities/[id]`, and `/locus` page/UI files. Before deleting `trace-workflow.ts`, move any pure helper consumed by Core to the neutral shared location. Do not delete API routes, route handlers, lib/locus, or RAG tests.

- [ ] **Step 4: Remove dead imports and route-only references**

Search for imports from `app/trace`, links to deleted visual pages, and deleted component names. Replace Core navigation links with the public organization URL or remove only the obsolete link. Keep API endpoint references used by Core.

- [ ] **Step 5: Run route-removal and type checks**

```bash
bun test tests/locus/trace-marketing.test.mjs tests/locus/compare-page.test.mjs tests/locus/methodology-page.test.mjs tests/locus/profile-page.test.mjs
bun x tsc --noEmit --pretty false
```

Expected: route-removal tests PASS; TypeScript exits successfully.

- [ ] **Step 6: Commit route removal**

```bash
git add apps/web/app apps/web/components apps/web/tests/locus
 git commit -m "refactor: remove legacy trace visual routes"
```

## Task 7: Verify the actual Core surface and backend contracts

**Files:**
- No planned source changes; fix only failures found in the above scope.
- Test: focused locus suite and browser smoke flow.

- [ ] **Step 1: Run focused backend and frontend tests**

```bash
cd apps/web
bun test tests/locus
bun x tsc --noEmit --pretty false
bun run lint:strict
```

Expected: all focused tests, type checking, and lint pass.

- [ ] **Step 2: Run the real web surface**

Start the existing development server using the repository’s normal command, open the real public organization URL in a browser, and verify:

1. Core organization shell and colors remain unchanged.
2. Project logo and project copy appear in the existing Core shell.
3. Search submits and shows progress.
4. An ambiguous university shows candidate selection.
5. A known university shows evidence and source links.
6. Category filtering changes visible results.
7. Shortlist accepts at most two profiles.
8. Comparison reports coverage only and does not name a winner.
9. The chat appears below evidence.
10. A grounded question shows answer claims and clickable citations.
11. An unsupported question shows `insufficient_evidence` and no fabricated answer.
12. Old visual URLs return 404.
13. The API routes still respond and no secret appears in browser payloads.

- [ ] **Step 3: Run production build**

```bash
bun run build
```

Expected: successful Next.js production build with no missing route imports.

- [ ] **Step 4: Commit only verification fixes**

```bash
git add apps/web
 git commit -m "chore: verify core trace integration"
```

---

## Plan self-review

- **Spec coverage:** Covers removal of every requested visual TRACE route, preservation of backend logic/API/RAG, replacement of public organization content with Core-styled TRACE flow, RAG placement below evidence, logo/text-only branding, unchanged Core visual system, old-route 404 behavior, and browser verification.
- **Placeholder scan:** No `TBD`, `TODO`, fake fallback, or unspecified implementation requirement. Any new file is conditional only where existing component boundaries cannot support the required extraction; the owning task defines its contract.
- **Type consistency:** `profileToken`, `ProfileResponse`, `ApplicantContext`, `LocusProfile`, `ProfileComparison`, and RAG answer shapes match current repository contracts. Core workspace imports must not remain coupled to deleted `app/trace/*` modules.
- **Safety boundary:** Deletion is restricted to visual page routes. Server APIs, `lib/locus`, RAG provider configuration, source adapters, and backend tests remain in place.
