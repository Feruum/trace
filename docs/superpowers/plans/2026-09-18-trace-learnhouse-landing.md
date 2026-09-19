# TRACE LearnHouse Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/` the canonical TRACE product using the existing LearnHouse landing language, preserve the implemented evidence workspace, remove the demo applicant journey, and harden the public RAG pipeline.

**Architecture:** A small client controller owns search and shortlist state, while focused LearnHouse-styled landing and workspace components render the initial and post-search experiences. Public APIs return an opaque per-profile token, enforce bounded request rates, and fetch official admissions pages only through URL, network, timeout, redirect, and body-size guards.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, TanStack Query, Bun test runner, Node crypto/dns/net APIs.

---

### Task 1: Canonical TRACE routing

**Files:**
- Modify: `apps/web/proxy.ts`
- Modify: `apps/web/app/trace/page.tsx`
- Modify: `apps/web/app/locus/page.tsx`
- Test: `apps/web/tests/locus/route.test.mjs`

- [ ] Add route assertions that `/trace` and `/locus` resolve to permanent redirects while `/` remains a public pass-through.
- [ ] Replace the TRACE rewrite branches with a single canonical rule:

```ts
if (pathname === '/trace' || pathname.startsWith('/trace/') || pathname === '/locus' || pathname.startsWith('/locus/')) {
  const destination = new URL('/', req.url)
  destination.search = search
  return NextResponse.redirect(destination, 308)
}
if (pathname === '/') return NextResponse.rewrite(new URL(`/${search}`, req.url))
```

- [ ] Make both compatibility pages call `permanentRedirect('/')` so direct rendering and middleware-bypassed tests have the same behavior.
- [ ] Run `bun test tests/locus/route.test.mjs`; expect all route tests to pass.

### Task 2: Replace the standalone screen with the LearnHouse landing structure

**Files:**
- Create: `apps/web/components/Locus/TraceLanding.tsx`
- Create: `apps/web/components/Locus/TraceWorkspace.tsx`
- Modify: `apps/web/app/trace/TraceClient.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/locales/en.json`
- Modify: `apps/web/locales/ru.json`
- Delete: `apps/web/components/Locus/Case02Journey.tsx`
- Delete: `apps/web/lib/locus/case02.ts`
- Delete: `apps/web/tests/locus/case02.test.mjs`

- [ ] Write a component contract test that checks the public client no longer imports `Case02Journey`, renders ambiguity candidates, and keeps the evidence assistant in the result workspace.
- [ ] Create `TraceLanding` with LearnHouse navigation proportions, violet brand accent, hero search, example-search buttons, four concise product capabilities, and an evidence-not-ranking disclosure.
- [ ] Create `TraceWorkspace` for selection, loading, error, not-found, ready-profile, shortlist, comparison, optional applicant details, category gallery, source audit, and grounded assistant states.
- [ ] Reduce `TraceClient` to state coordination and API calls. Remove `ROADMAP_STORAGE_KEY`, diagnosis, recommendations, roadmap state, duplicate error rendering, and all Case 02 imports.
- [ ] Preserve anonymous session-only applicant and shortlist storage. Show `ApplicantOnboarding` only inside a ready result as an optional assistant context control.
- [ ] Keep metadata on `/` TRACE-specific and make the copy fully available in Russian and English through `locus.trace_ui` keys.
- [ ] Run `bun test tests/locus`; expect every remaining TRACE test to pass.

### Task 3: Preserve fair evidence-category coverage

**Files:**
- Modify: `apps/web/lib/locus/pipeline.ts`
- Modify: `apps/web/tests/locus/pipeline.test.mjs`

- [ ] Add a failing test where every provider returns ten candidates per category and assert the 40-candidate cap contains every requested category.
- [ ] Add a round-robin cap helper:

```ts
export function capCandidatesFairly(candidates: PhotoCandidate[], limit: number): PhotoCandidate[] {
  const queues = new Map(LOCUS_CATEGORIES.map((category) => [category, candidates.filter((item) => item.requestedCategory === category)]))
  const result: PhotoCandidate[] = []
  while (result.length < limit && [...queues.values()].some((queue) => queue.length > 0)) {
    for (const category of LOCUS_CATEGORIES) {
      const candidate = queues.get(category)?.shift()
      if (candidate) result.push(candidate)
      if (result.length === limit) break
    }
  }
  return result
}
```

- [ ] Use the helper instead of `candidates.slice(0, MAX_CANDIDATES_BEFORE_HASHING)`.
- [ ] Run `bun test tests/locus/pipeline.test.mjs`; expect the new coverage test and existing degradation tests to pass.

### Task 4: Isolate cached profiles with opaque tokens

**Files:**
- Modify: `apps/web/lib/locus/profile-cache.ts`
- Modify: `apps/web/lib/locus/types.ts`
- Modify: `apps/web/app/api/locus/profile/route.ts`
- Modify: `apps/web/app/api/locus/assistant/route.ts`
- Modify: `apps/web/components/Locus/SourceAssistant.tsx`
- Modify: `apps/web/app/trace/TraceClient.tsx`
- Test: `apps/web/tests/locus/route.test.mjs`
- Test: `apps/web/tests/locus/contract.test.mjs`

- [ ] Add tests proving two cached profiles for the same university receive different opaque tokens and that the assistant contract rejects a Wikidata ID in place of a token.
- [ ] Change `cacheProfile` to return `randomUUID()` and store by token rather than entity ID:

```ts
export function cacheProfile(profile: LocusProfile): string {
  pruneExpired()
  const token = randomUUID()
  cache.set(token, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS })
  return token
}
```

- [ ] Extend the ready response to `{ status: 'ready', profile, profileToken }` and require a UUID `profileToken` in assistant requests.
- [ ] Pass the server-issued token from the result state into `SourceAssistant`; never derive assistant access from `profile.university.id`.
- [ ] Cap and prune the cache to prevent unbounded process memory growth.
- [ ] Run `bun test tests/locus/contract.test.mjs tests/locus/route.test.mjs`; expect all contract tests to pass.

### Task 5: Bound public-route abuse

**Files:**
- Create: `apps/web/lib/locus/rate-limit.ts`
- Modify: `apps/web/app/api/locus/profile/route.ts`
- Modify: `apps/web/app/api/locus/assistant/route.ts`
- Test: `apps/web/tests/locus/route.test.mjs`

- [ ] Add deterministic rate-limit tests with an injected clock and verify requests beyond the configured window return HTTP 429 with `Retry-After`.
- [ ] Implement a capped in-memory fixed-window limiter with separate `profile` and `assistant` buckets, periodic expired-entry pruning, and a maximum number of tracked keys.
- [ ] Derive the client key from the first normalized `x-forwarded-for` value, then `x-real-ip`, then a bounded `anonymous` fallback.
- [ ] Enforce conservative limits before provider/model calls and return `{ code: 'RATE_LIMITED', message }`.
- [ ] Run `bun test tests/locus/route.test.mjs`; expect malformed, cache, and rate-limit cases to pass.

### Task 6: Guard official-site admissions fetching

**Files:**
- Modify: `apps/web/lib/locus/sources/admissions.ts`
- Modify: `apps/web/lib/locus/pipeline.ts`
- Test: `apps/web/tests/locus/admissions.test.mjs`

- [ ] Add tests rejecting localhost, loopback/private IPv4 and IPv6, credential-bearing URLs, redirects, oversized HTML, and slow responses.
- [ ] Add `validatePublicHttpUrl` that accepts only HTTP(S), rejects credentials and local/reserved hostnames, resolves host addresses in production, and rejects any non-public address.
- [ ] Fetch with `redirect: 'manual'`, an 8-second abort timeout bounded by the pipeline deadline, and `Accept: text/html`.
- [ ] Read the response stream incrementally and stop above 2 MiB instead of calling unbounded `response.text()`.
- [ ] Pass the pipeline deadline into `fetchOfficialAdmissions` and preserve a visible warning when the source is blocked or unavailable.
- [ ] Run `bun test tests/locus/admissions.test.mjs tests/locus/pipeline.test.mjs`; expect all security and degradation cases to pass.

### Task 7: Validate the complete product

**Files:**
- Modify only files required by failures found during verification.

- [ ] Run `bun test tests/locus`; expect zero failures.
- [ ] Run `node node_modules/typescript/bin/tsc --noEmit --pretty false`; expect exit code 0.
- [ ] Run `node node_modules/eslint/bin/eslint.js app/page.tsx app/trace components/Locus lib/locus tests/locus`; expect exit code 0.
- [ ] Run `node node_modules/next/dist/bin/next build`; expect a successful production build.
- [ ] Start the built app and verify `/`, `/trace`, `/locus`, `/login`, desktop/mobile layout, ambiguous selection, not-found, ready profile, shortlist comparison, cited RAG answer, and insufficient-evidence response.
- [ ] Check `git diff --check` and `git status --short`; expect no whitespace errors and only intended files changed.
