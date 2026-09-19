# TRACE University RAG Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend TRACE’s backend-only grounded assistant from visual-profile questions to verified university information across programs, admissions, deadlines, tuition, scholarships, campus/student life, statistics, rankings, and contacts.

**Architecture:** Keep the current server-owned evidence pipeline and strict citation validator. Add typed university evidence records, bounded official-page discovery/parsers, domain-aware structured retrieval, and a strict `gpt-5.6-luna` production lane. Keep lexical/structured retrieval at the current document volume; add no embeddings or vector database until the explicit volume/recall threshold in the approved design is reached.

**Tech Stack:** Next.js Node runtime, TypeScript, Bun tests, existing `apps/web/lib/locus` providers, Redis trace store, Wikivibe OpenAI-compatible API, Sentry-safe metrics/observability. No frontend source changes.

---

## Scope guard and current boundaries

- Modify only `apps/web/lib/locus`, `apps/web/app/api/trace`, `apps/web/app/api/locus` server handlers, backend tests/config, and backend E2E fixtures.
- Do not modify `apps/web/components`, `apps/web/app/*/page.tsx`, client components, styles, locales, or UI copy.
- Preserve current public contracts: opaque `profileToken`, anonymous access, `RAGAnswer`, empty compatibility `admissions.matches`, and deterministic keyless fallback.
- Preserve the existing strict admissions rule: a university-wide requirement never becomes a program-specific eligibility result.
- Every new factual answer must have server-owned source metadata and an exact quote validated against the stored chunk.
- Every task includes a focused Bun test before production implementation and a focused test run before its commit.

## File map

Create these focused server modules:

- `apps/web/lib/locus/university-evidence.ts` — typed domain records, scope normalization, structured fact normalization, and conversion to RAG chunks.
- `apps/web/lib/locus/sources/university-pages.ts` — bounded same-site official-page discovery/fetch orchestration shared by non-admissions domains.
- `apps/web/lib/locus/sources/university-parsers.ts` — deterministic parsers for programs, deadlines, tuition, scholarships, campus/student-life facts, statistics, rankings, and contacts.
- `apps/web/lib/locus/rag/domain.ts` — question-domain types, domain keyword maps, structured filter extraction, and domain-to-evidence policy.
- `apps/web/lib/locus/rag/model-contract.ts` — production model-lane resolution and live/provider schema diagnostics.

Modify these existing server modules:

- `apps/web/lib/locus/types.ts` — additive `universityEvidence` profile field; do not add applicant/program fields until a parser test demonstrates the requirement.
- `apps/web/lib/locus/evidence.ts` — include new record metadata in bounded, redacted chunks while retaining current identity/image/admissions chunks.
- `apps/web/lib/locus/pipeline.ts` — collect official university evidence after identity resolution, merge it deterministically, and retain provider diagnostics.
- `apps/web/lib/locus/rag/question.ts` — expand question classes.
- `apps/web/lib/locus/rag/retrieve.ts` — structured prefilters plus domain-weighted lexical retrieval.
- `apps/web/lib/locus/rag/prompt.ts` — exact production schema instructions.
- `apps/web/lib/locus/rag/service.ts` — use domain-aware retrieval and model-contract diagnostics without changing answer/refusal semantics.
- `apps/web/lib/locus/rag/types.ts` — domain/refusal metadata additions.
- `apps/web/lib/locus/rag/wikivibe.ts` — strict Luna production resolution and safe response diagnostics.
- `apps/web/lib/locus/metrics.ts` — safe domain/model/schema/retrieval metrics.
- `apps/web/app/api/locus/profile/route.ts` — persist expanded evidence through the existing profile save path without changing the response shape.
- `apps/web/app/api/trace/assistant/route.ts` and `apps/web/app/api/trace/assistant/batch/route.ts` — preserve current route validation while exposing additive domain/refusal fields.

- `apps/web/tests/locus/university-evidence.test.mjs`
- `apps/web/tests/locus/university-pages.test.mjs`
- `apps/web/tests/locus/university-parsers.test.mjs`
- `apps/web/tests/locus/rag-domain.test.mjs`
- `apps/web/tests/locus/rag-expanded-evaluation.test.mjs`
- `apps/web/tests/locus/live-rag-contract.test.mjs` (opt-in only; never requires a key in normal CI)
- existing `pipeline.test.mjs`, `rag.test.mjs`, `metrics.test.mjs`, and `contract.test.mjs`.

---

## Task 1: Add typed university evidence records

**Files:**
- Create: `apps/web/lib/locus/university-evidence.ts`
- Modify: `apps/web/lib/locus/types.ts`
- Test: `apps/web/tests/locus/university-evidence.test.mjs`

- [ ] **Step 1: Write failing contract tests**

Add tests that assert the normalized record contract for one program, tuition, deadline, scholarship, campus, statistics, ranking, and contact record. Use this exact expected shape:

```ts
{
  id: 'program:Q1:computer-science-msc:0',
  entityId: 'Q1',
  kind: 'program',
  sourceUrl: 'https://example.edu/programs/computer-science',
  sourceLabel: 'Official university source',
  pageTitle: 'MSc Computer Science',
  scope: 'program-specific',
  program: 'Computer Science',
  degree: 'master',
  intake: null,
  academicYear: '2026/27',
  sourceDate: null,
  retrievedAt: '2026-09-19T00:00:00.000Z',
  quote: 'The MSc Computer Science programme lasts one year.',
  facts: { duration: 'one year', language: 'English' },
  contentHash: 'sha256:...'
}
```

Assert that:

- only the declared `kind` union is accepted;
- `sourceUrl` is normalized HTTP(S) and has no credentials/fragment;
- `quote` is non-empty and bounded;
- `facts` contains only JSON-safe scalar values/arrays of bounded strings;
- program-specific scope requires a program and degree;
- external metrics require publisher/year fields;
- source date remains `null` when unavailable;
- IDs are deterministic for equal record inputs.

- [ ] **Step 2: Run the tests and confirm the expected failure**

Run:

```bash
cd apps/web && bun test tests/locus/university-evidence.test.mjs
```

Expected: fail because `UniversityEvidenceRecord`, normalization, and deterministic IDs do not exist.

- [ ] **Step 3: Implement the evidence contract**

Add exact exports:

```ts
export const UNIVERSITY_EVIDENCE_KINDS = [
  'identity', 'description', 'program', 'admissions', 'tuition',
  'scholarship', 'deadline', 'campus', 'student_life', 'statistics',
  'ranking', 'contact', 'image',
] as const

export type UniversityEvidenceKind = (typeof UNIVERSITY_EVIDENCE_KINDS)[number]
export type UniversityEvidenceScope =
  | 'university-wide'
  | 'program-specific'
  | 'campus-specific'
  | 'external-metric'

export interface UniversityEvidenceRecord {
  id: string
  entityId: string
  kind: UniversityEvidenceKind
  sourceUrl: string
  sourceLabel: string
  pageTitle: string
  scope: UniversityEvidenceScope
  program: string | null
  degree: 'bachelor' | 'master' | 'phd' | null
  intake: string | null
  academicYear: string | null
  sourceDate: string | null
  retrievedAt: string
  quote: string
  facts: Record<string, string | number | boolean | null | string[]>
  contentHash: string
}

export function normalizeUniversityEvidenceRecord(input: unknown): UniversityEvidenceRecord | null
export function stableEvidenceId(input: Pick<UniversityEvidenceRecord, 'entityId' | 'kind' | 'sourceUrl' | 'program' | 'degree' | 'intake' | 'academicYear'>, ordinal?: number): string
export function buildUniversityEvidenceChunks(records: UniversityEvidenceRecord[]): EvidenceChunk[]
```

Use `normalizeHttpUrl`, `normalizeHtmlMetadata`, and bounded text helpers already used by media/admissions. Hash only normalized server-owned content with SHA-256. Never put raw source URLs or page body outside the record fields.

Add `universityEvidence?: UniversityEvidenceRecord[]` to `LocusProfile` as an additive optional field. Add these optional metadata fields to `EvidenceChunk` so existing fixtures remain valid:

```ts
domain?: UniversityEvidenceKind
scope?: UniversityEvidenceScope
program?: string | null
degree?: 'bachelor' | 'master' | 'phd' | null
intake?: string | null
academicYear?: string | null
sourceDate?: string | null
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd apps/web && bun test tests/locus/university-evidence.test.mjs tests/locus/contract.test.mjs
```

Expected: all tests pass and existing profile fixtures remain valid.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/locus/university-evidence.ts apps/web/lib/locus/types.ts apps/web/tests/locus/university-evidence.test.mjs
git commit -m "feat: add university evidence records"
```

## Task 2: Add bounded official-page discovery

**Files:**
- Create: `apps/web/lib/locus/sources/university-pages.ts`
- Test: `apps/web/tests/locus/university-pages.test.mjs`

- [ ] **Step 1: Write failing crawl tests**

Create fixtures for a seed page linking to `/programs`, `/admissions`, `/tuition`, `/scholarships`, `/campus`, `/student-life`, and an external host. Assert:

- only same-host or official subdomain links are fetched;
- external links, credentials, non-HTTP schemes, and fragments are rejected;
- at most 12 pages are attempted;
- at most 2 pages are in flight;
- page bodies are bounded at 2 MiB;
- redirects are manual and unsafe redirect targets are rejected;
- link scoring is deterministic and prefers domain terms;
- diagnostics are sorted by candidate order, not completion order;
- fetched page records contain page title, source date, academic year, and safe URL.

- [ ] **Step 2: Run the tests and confirm failure**

```bash
cd apps/web && bun test tests/locus/university-pages.test.mjs
```

Expected: fail because the generic crawler does not exist.

- [ ] **Step 3: Implement the generic bounded crawler**

Export:

```ts
export type UniversityPageDomain =
  | 'program'
  | 'admissions'
  | 'deadline'
  | 'tuition'
  | 'scholarship'
  | 'campus'
  | 'student_life'
  | 'statistics'
  | 'ranking'
  | 'contact'
  | 'unknown'

export interface UniversityPage {
  url: string
  html: string
  title: string
  sourceDate: string | null
  academicYear: string | null
  domain: UniversityPageDomain
  order: number
}

export interface UniversityPageDiagnostic {
  url: string
  domain: UniversityPageDomain
  status: 'success' | 'empty' | 'failed' | 'skipped'
  reason: string | null
  durationMs: number
}

export interface UniversityPageCollection {
  pages: UniversityPage[]
  diagnostics: UniversityPageDiagnostic[]
  warnings: string[]
}

export async function collectUniversityPages(
  context: UniversityContext & { officialUrl?: string },
  options: { fetchImpl?: LocusFetch; signal?: AbortSignal; deadline?: number; now?: () => number },
): Promise<UniversityPageCollection>
```

Reuse the admissions public URL/redirect/body safety rules rather than duplicating divergent SSRF checks. Use these exact budgets: seed plus at most 11 links, 2 workers, 2 MiB/page, existing pipeline deadline. Score links by domain terms and anchor text. Do not cache HTML pages in provider JSON cache.

- [ ] **Step 4: Run focused tests**

```bash
cd apps/web && bun test tests/locus/university-pages.test.mjs tests/locus/admissions.test.mjs
```

Expected: all crawler and existing admissions tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/locus/sources/university-pages.ts apps/web/tests/locus/university-pages.test.mjs
git commit -m "feat: add bounded university page discovery"
```

## Task 3: Implement deterministic university domain parsers

**Files:**
- Create: `apps/web/lib/locus/sources/university-parsers.ts`
- Test: `apps/web/tests/locus/university-parsers.test.mjs`

- [ ] **Step 1: Write failing parser tests**

Use HTML fixtures containing exact sentences and assert records for:

1. Program: `The MSc Computer Science programme lasts one year and is taught in English.`
2. Deadline: `Applications for Fall 2026 close on 15 January 2026.`
3. Tuition: `International MSc students pay USD 12,000 per academic year in 2026/27.`
4. Scholarship: `The Global Scholarship covers tuition for international master's students.`
5. Campus: `The university library is open to students seven days a week.`
6. Student life: `Student services include career counselling and health support.`
7. Ranking: `University rank 42 in QS World University Rankings 2026.`
8. Statistics: `The university has 24,000 students in 2025.`
9. Contact: `Admissions contact: admissions@example.edu.`

Assert that years are not mistaken for scores, tuition retains currency/unit/year/scope, ranking retains publisher/year, program pages are program-specific only with explicit degree context, generic admissions pages remain university-wide, and all quotes are exact bounded sentence text.

- [ ] **Step 2: Run tests and confirm failure**

```bash
cd apps/web && bun test tests/locus/university-parsers.test.mjs
```

Expected: fail because domain parsers do not exist.

- [ ] **Step 3: Implement parsers with explicit domain contracts**

Export:

```ts
export interface ParserContext {
  entityId: string
  page: UniversityPage
  retrievedAt: string
}

export function parseUniversityPage(context: ParserContext): UniversityEvidenceRecord[]
```

Implement sentence-bounded parsing. Do not use broad regex matches that accept arbitrary numbers. Require domain cues plus explicit context. Facts must be normalized as bounded scalar fields, for example:

```ts
{
  amount: 12000,
  currency: 'USD',
  unit: 'academic_year',
  studentCategory: 'international',
  academicYear: '2026/27'
}
```

Reject monetary values without currency, unit, period, or unambiguous scope for factual tuition answers. Store a record with `scope: 'external-metric'` for rankings/statistics and require publisher/year in facts.

- [ ] **Step 4: Run focused parser tests**

```bash
cd apps/web && bun test tests/locus/university-parsers.test.mjs
```

Expected: all fixtures pass with no year/score confusion.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/locus/sources/university-parsers.ts apps/web/tests/locus/university-parsers.test.mjs
git commit -m "feat: parse university information domains"
```

## Task 4: Integrate official university evidence into profiles

**Files:**
- Modify: `apps/web/lib/locus/pipeline.ts`
- Modify: `apps/web/lib/locus/evidence.ts`
- Modify: `apps/web/lib/locus/types.ts`
- Test: `apps/web/tests/locus/pipeline.test.mjs`, `apps/web/tests/locus/evidence.test.mjs`

- [ ] **Step 1: Add failing integration tests**

Add an injected fetch fixture for Wikidata, media providers, seed official HTML, and domain pages. Assert `buildLocusProfile` returns:

- `universityEvidence` records in deterministic kind/source order;
- existing assets/admissions fields unchanged;
- evidence chunks include `domain`, `scope`, `program`, `degree`, `academicYear`, and `sourceDate`;
- source prompt-injection text is redacted;
- one failed official page produces a diagnostic/warning without discarding media evidence.

- [ ] **Step 2: Run tests and confirm failure**

```bash
cd apps/web && bun test tests/locus/pipeline.test.mjs tests/locus/evidence.test.mjs
```

Expected: failure because pipeline does not collect/merge `universityEvidence`.

- [ ] **Step 3: Integrate the generic page collector**

After identity resolution and media collection, call `collectUniversityPages` with the same deadline. Parse pages with `parseUniversityPage`, normalize records, sort by:

```text
kind order -> source page order -> scope -> program -> academicYear -> stable id
```

Merge official records into the profile and include diagnostics in `providerDiagnostics` under provider `Official university pages`. Keep admissions records produced by the existing strict admissions collector; do not duplicate admissions requirements in generic parser output.

- [ ] **Step 4: Extend evidence chunk construction**

`buildEvidenceChunks` must append `buildUniversityEvidenceChunks(profile.universityEvidence ?? [])` after identity/description and before images, then apply `MAX_CHUNKS` deterministically. Each new chunk text must include domain, scope, program/degree/year context, normalized facts, and exact quote. The source URL/label stays in metadata fields.

- [ ] **Step 5: Run focused integration tests**

```bash
cd apps/web && bun test tests/locus/pipeline.test.mjs tests/locus/evidence.test.mjs tests/locus/sources.test.mjs
```

Expected: existing and new integration tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/locus/pipeline.ts apps/web/lib/locus/evidence.ts apps/web/lib/locus/types.ts apps/web/tests/locus/pipeline.test.mjs apps/web/tests/locus/evidence.test.mjs
 git commit -m "feat: attach university evidence to TRACE profiles"
```

## Task 5: Expand question domains and structured retrieval

**Files:**
- Create: `apps/web/lib/locus/rag/domain.ts`
- Modify: `apps/web/lib/locus/rag/question.ts`
- Modify: `apps/web/lib/locus/rag/retrieve.ts`
- Modify: `apps/web/lib/locus/rag/synonyms.ts`
- Test: `apps/web/tests/locus/rag-domain.test.mjs`

- [ ] **Step 1: Write failing domain/retrieval tests**

Add questions and expected classes:

```text
What programs does the university offer?              -> program
How much is tuition for international MSc students?   -> tuition
When is the Fall 2026 deadline?                       -> deadline
Are scholarships available for international students? -> scholarship
What facilities are on campus?                        -> campus
What student services exist?                          -> student_life
What was the university's ranking in 2026?             -> ranking
How many students were enrolled in 2025?              -> statistics
How do I contact admissions?                           -> contact
```

Add records with conflicting programs/years/categories. Assert structured filters remove wrong degree/year/scope records before lexical ranking. Assert tuition without academic-year context refuses rather than selecting a different year. Assert rankings without publisher/year do not satisfy dated ranking questions.

- [ ] **Step 2: Run tests and confirm failure**

```bash
cd apps/web && bun test tests/locus/rag-domain.test.mjs
```

Expected: failure because only the existing four question classes/weights exist.

- [ ] **Step 3: Implement domain policy**

Add:

```ts
export type UniversityQuestionDomain =
  | 'identity' | 'admissions' | 'media' | 'general' | 'program'
  | 'tuition' | 'deadline' | 'scholarship' | 'campus'
  | 'student_life' | 'statistics' | 'ranking' | 'contact'

export interface StructuredQuestionFilters {
  program: string | null
  degree: 'bachelor' | 'master' | 'phd' | null
  intake: string | null
  academicYear: string | null
  studentCategory: 'domestic' | 'international' | null
}

export function classifyUniversityQuestion(question: string): UniversityQuestionDomain
export function extractStructuredQuestionFilters(question: string): StructuredQuestionFilters
export function allowedUniversityEvidenceKinds(domain: UniversityQuestionDomain): readonly EvidenceKind[]
export function domainEvidenceWeight(domain: UniversityQuestionDomain, kind: EvidenceKind): number
```

Keep admissions/media/identity behavior compatible. Add RU/EN synonyms for program, tuition, fee, deadline, scholarship, campus, facility, student service, ranking, statistics, contact, degree, intake, academic year, and international/domestic.

- [ ] **Step 4: Implement structured prefiltering and deterministic reranking**

Update `retrieveEvidence` to:

1. classify domain;
2. extract filters;
3. filter by allowed evidence kind;
4. reject records whose metadata contradicts an explicit question filter;
5. require context for tuition/deadline/ranking answers when the question contains a year/intake/program/category constraint;
6. score synonym-expanded lexical overlap plus domain weight, phrase boost, exact program/year boost, and scope boost;
7. tie-break by domain-kind priority, original index, chunk ID.

Return a typed empty retrieval/refusal path without a model call when required context is absent.

- [ ] **Step 5: Run focused tests**

```bash
cd apps/web && bun test tests/locus/rag-domain.test.mjs tests/locus/rag.test.mjs
```

Expected: all old and new retrieval tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/locus/rag/domain.ts apps/web/lib/locus/rag/question.ts apps/web/lib/locus/rag/retrieve.ts apps/web/lib/locus/rag/synonyms.ts apps/web/tests/locus/rag-domain.test.mjs
 git commit -m "feat: add domain-aware university retrieval"
```

## Task 6: Freeze strict Luna production lane and diagnostics

**Files:**
- Create: `apps/web/lib/locus/rag/model-contract.ts`
- Modify: `apps/web/lib/locus/rag/wikivibe.ts`
- Modify: `apps/web/lib/locus/rag/prompt.ts`
- Modify: `apps/web/lib/locus/rag/service.ts`
- Modify: `apps/web/lib/locus/metrics.ts`
- Test: `apps/web/tests/locus/live-rag-contract.test.mjs`, `apps/web/tests/locus/rag.test.mjs`

- [ ] **Step 1: Add offline schema-contract tests**

Test that `parseModelPayload` rejects:

```json
{"status":"supported","answer":"x","claims":[],"citations":[]}
```

```json
{"status":"answered","answer":"x","claims":[{"claim":"x","quotes":[]}],"citations":[]}
```

```json
{"status":"answered","answer":"x","claims":[],"citations":[],"debug":"secret"}
```

Assert refusal/metrics labels never include raw question, quote body, API key, or provider response.

- [ ] **Step 2: Implement explicit model contract**

Add:

```ts
export const PRODUCTION_RAG_MODEL = 'gpt-5.6-luna'
export function resolveRagModel(options?: { requested?: string; allowOverride?: boolean }): string
export function classifyModelContractError(error: unknown): 'invalid_model_response' | 'provider_unavailable' | 'provider_unconfigured'
```

Production/default route calls resolve to `gpt-5.6-luna`. Test-only overrides require an explicit option or non-production environment; no automatic fallback. Keep the keyless deterministic fallback as the only unconfigured path.

Update the prompt with exact schema wording that live Luna requires: top-level keys, status enum, `text` claim field, `chunkId`/`quote` citation fields, and no aliases.

- [ ] **Step 3: Add opt-in live contract test**

Create an opt-in test guarded by `TRACE_LIVE_RAG=1` and `WIKIVIBE_API_KEY`:

```ts
if (process.env.TRACE_LIVE_RAG !== '1' || !process.env.WIKIVIBE_API_KEY) {
  test.skip('live RAG contract test is opt-in')
}
```

When enabled, call only `gpt-5.6-luna` through `answerFromProfile` using a fixed profile and assert `answered`, non-empty exact citations, and `model === 'gpt-5.6-luna'`. Add a second live case with an unsupported tuition question and assert no model call is needed because retrieval is empty.

- [ ] **Step 4: Run focused tests**

```bash
cd apps/web && bun test tests/locus/rag.test.mjs tests/locus/live-rag-contract.test.mjs tests/locus/metrics.test.mjs
```

Expected: offline tests pass; live test is explicitly skipped unless credentials are intentionally supplied.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/locus/rag/model-contract.ts apps/web/lib/locus/rag/wikivibe.ts apps/web/lib/locus/rag/prompt.ts apps/web/lib/locus/rag/service.ts apps/web/lib/locus/metrics.ts apps/web/tests/locus/live-rag-contract.test.mjs apps/web/tests/locus/rag.test.mjs
 git commit -m "feat: enforce strict Luna RAG lane"
```

## Task 7: Add expanded bilingual evaluation coverage

**Files:**
- Modify: `apps/web/tests/locus/fixtures/rag-evaluation.json`
- Modify: `apps/web/tests/locus/rag-evaluation.test.mjs`
- Create: `apps/web/tests/locus/rag-expanded-evaluation.test.mjs`

- [ ] **Step 1: Extend fixture records**

Keep the existing 100 records valid and add 40 records (20 RU/20 EN), four cases per new domain: program, tuition, deadline, scholarship, campus, student_life, statistics, ranking, contact, plus context-missing refusal cases. Add exact fields:

```json
{
  "id": "en-tuition-01",
  "locale": "en",
  "question": "How much is tuition for the international MSc in 2026/27?",
  "expectedType": "tuition",
  "expectedOutcome": "answered",
  "requiredDomain": "tuition",
  "requiredScope": "program-specific",
  "requiresOfficialEvidence": true
}
```

- [ ] **Step 2: Add deterministic expanded evaluation profile**

Build a fixed profile with at least one valid and one conflicting record for every new domain. Use a deterministic fake chat client only for expected answered cases. For refusal cases assert zero model calls when retrieval can decide refusal.

  Assert:

  - 136 total cases (the existing 100 plus 36 new domain cases; four cases per each of nine new domains), with RU/EN parity;
  - correct domain classification;
  - no cross-year tuition/deadline/ranking answers;
  - no domestic/international scope mixing;
  - no university-wide admissions eligibility claims;
  - no duplicate or fabricated citations;
  - no prompt-injection following;
  - all answered claims have exact server citations.

- [ ] **Step 4: Run evaluation**

```bash
cd apps/web && bun test tests/locus/rag-evaluation.test.mjs tests/locus/rag-expanded-evaluation.test.mjs
```

Expected: zero contract violations; print language/domain/outcome/refusal/citation/model-call counts.

- [ ] **Step 5: Commit**

```bash
git add apps/web/tests/locus/fixtures/rag-evaluation.json apps/web/tests/locus/rag-evaluation.test.mjs apps/web/tests/locus/rag-expanded-evaluation.test.mjs
git commit -m "test: expand university RAG evaluation coverage"
```

## Task 8: Add additive assistant contract metadata

**Files:**
- Modify: `apps/web/lib/locus/rag/types.ts`
- Modify: `apps/web/lib/locus/rag/fallback.ts`
- Modify: `apps/web/lib/locus/rag/service.ts`
- Modify: `apps/web/app/api/trace/assistant/route.ts`
- Modify: `apps/web/app/api/trace/assistant/batch/route.ts`
- Test: `apps/web/tests/locus/batch-route.test.mjs`, `apps/web/tests/locus/contract.test.mjs`

- [ ] **Step 1: Add failing contract assertions**

Assert answered/refusal payloads can carry additive fields without changing existing required fields:

```ts
{
  domain: 'tuition',
  retrievedCount: 2,
  model: 'gpt-5.6-luna'
}
```

For refusal:

```ts
{
  refusalReason: 'deadline_year_missing',
  explanation: 'No deadline was found for the requested intake and academic year.'
}
```

- [ ] **Step 2: Extend types and service**

Add optional `domain` and `filters` metadata to `RAGAnswer`. Add only bounded refusal codes:

```ts
| 'tuition_context_missing'
| 'deadline_year_missing'
| 'ranking_year_missing'
| 'structured_context_mismatch'
```

The service sets these only when deterministic retrieval policy identifies the reason; otherwise it keeps `no_relevant_evidence`.

- [ ] **Step 3: Preserve route compatibility**

Do not change request validation or existing response envelope `{ status: 'ready', answer }` / `{ status: 'ready', answers }`. Add fields only inside answers. Keep security headers and generic provider errors unchanged.

- [ ] **Step 4: Run tests and commit**

```bash
cd apps/web && bun test tests/locus/rag.test.mjs tests/locus/batch-route.test.mjs tests/locus/contract.test.mjs
```

```bash
git add apps/web/lib/locus/rag/types.ts apps/web/lib/locus/rag/fallback.ts apps/web/lib/locus/rag/service.ts apps/web/app/api/trace/assistant/route.ts apps/web/app/api/trace/assistant/batch/route.ts apps/web/tests/locus/batch-route.test.mjs apps/web/tests/locus/contract.test.mjs
git commit -m "feat: expose university RAG domain metadata"
```

## Task 9: Verify full backend/RAG rollout

**Files:**
- No production files unless verification finds a regression.
- Test/config only if a command requires a backend-only adjustment.

- [ ] **Step 1: Run complete backend test suite**

```bash
cd apps/web && bun test tests/locus
```

Expected: all existing tests plus expanded evaluation pass with zero failures.

- [ ] **Step 2: Run strict TypeScript/build checks**

```bash
cd apps/web && bun run build
```

Record any existing frontend-only failure separately; do not modify frontend to hide a backend/RAG result.

- [ ] **Step 3: Run fixture server smoke**

```bash
cd apps/web && TRACE_E2E_MODE=fixture bun -e "process.env.TRACE_E2E_MODE='fixture'; const { POST } = await import('./app/api/locus/profile/route.ts'); const r = await POST(new Request('http://localhost/api/locus/profile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'Example University',locale:'en'})})); const b=await r.json(); console.log({status:r.status,ready:b.status,entity:b.profile?.university?.id,evidence:b.profile?.universityEvidence?.length ?? 0});"
```

Expected: `status: 200`, `ready`, deterministic fixture entity, and nonzero evidence records.

- [ ] **Step 4: Run opt-in live Luna contract**

Only when a valid key is supplied in the environment:

```bash
cd apps/web && TRACE_LIVE_RAG=1 WIKIVIBE_API_KEY="$WIKIVIBE_API_KEY" WIKIVIBE_MODEL=gpt-5.6-luna bun test tests/locus/live-rag-contract.test.mjs
```

Expected: answered grounded question, exact citations, and deterministic refusal for an unsupported question.

- [ ] **Step 5: Check privacy and scope**

```bash
git diff --name-only HEAD~1..HEAD | findstr /R "^apps/web/components/ ^apps/web/app/.*/page.tsx$ ^apps/web/styles/ ^apps/web/locales/"
```

Expected: no paths in the university RAG commits. Review metrics snapshot for absence of question text, source body, applicant scores, credentials, and keys.

- [ ] **Step 6: Commit verification-only fixes and document results**

If production/backend fixes were needed, run the focused failing test first, fix it, rerun focused tests, then commit:

```bash
git add apps/web tests apps/e2e
git commit -m "test: verify expanded university RAG rollout"
```

Do not commit API keys or live response bodies.

## Completion criteria

The implementation is complete only when:

- all new university domains have typed evidence records and parsers;
- official-page collection remains bounded, deterministic, same-site, and SSRF-safe;
- structured filters prevent cross-program/year/category mixing;
- strict production Luna lane is enforced;
- exact citation validation remains server-owned;
- keyless fallback and typed refusals remain functional;
- bilingual expanded evaluation passes with zero out-of-contract answers;
- backend/API tests pass;
- frontend source files remain untouched;
- embeddings/vector DB remain absent until the explicit threshold is met.
