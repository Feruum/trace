# TRACE RAG and Applicant Onboarding Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with tests before implementation.

**Goal:** Make the live Wikivibe assistant reliable and add an anonymous applicant profile whose exams and preferences are available to grounded RAG without fabricating admissions requirements.

**Architecture:** Keep TRACE stateless. Add a validated applicant context to the assistant request and RAG prompt, explicitly separating user-provided scores from server-owned evidence. Extend the parser for the provider's observed `claim`/`quotes` JSON while retaining exact server-side quote validation. Add a compact first-screen onboarding panel that can be skipped.

**Tech Stack:** Next.js App Router, React, TypeScript, Bun tests, i18next, Wikivibe OpenAI-compatible API.

---

### Task 1: Make Wikivibe responses reliable

**Files:**
- Modify: `apps/web/lib/locus/rag/wikivibe.ts`
- Modify: `apps/web/lib/locus/rag/service.ts`
- Modify: `apps/web/lib/locus/rag/types.ts`
- Test: `apps/web/tests/locus/rag.test.mjs`

- [ ] Add regression coverage for the provider's observed `claim`/`quotes` response shape and preserve exact quote validation.
- [ ] Raise the adapter timeout above observed provider latency, classify timeout separately, and preserve caller aborts.
- [ ] Normalize both response shapes into the internal claim/citation contract before validation.
- [ ] Keep unsupported questions as `insufficient_evidence` without a model call when retrieval returns no chunks.

### Task 2: Add applicant context contract

**Files:**
- Modify: `apps/web/lib/locus/types.ts`
- Modify: `apps/web/app/api/locus/assistant/route.ts`
- Modify: `apps/web/lib/locus/rag/service.ts`
- Modify: `apps/web/lib/locus/rag/prompt.ts`
- Test: `apps/web/tests/locus/contract.test.mjs`
- Test: `apps/web/tests/locus/rag.test.mjs`

- [ ] Define bounded applicant fields: target country, city, degree, field, intake, budget, and exam scores.
- [ ] Validate and normalize scores without treating them as evidence.
- [ ] Include applicant context in the model prompt under an explicit untrusted user-context section.
- [ ] Require the assistant to distinguish user scores from official requirements and refuse unsupported admissions conclusions.

### Task 3: Add compact optional onboarding

**Files:**
- Modify: `apps/web/app/trace/TraceClient.tsx`
- Create: `apps/web/components/Locus/ApplicantOnboarding.tsx`
- Modify: `apps/web/locales/en.json`
- Modify: `apps/web/locales/ru.json`

- [ ] Add a skip-able onboarding panel before search with target preferences and IELTS/TOEFL/SAT/GPA fields.
- [ ] Persist only in session storage and send applicant context with profile search/assistant requests.
- [ ] Show a clear disclosure that scores are user input and not admissions proof.
- [ ] Keep ordinary university search available without onboarding.

### Task 4: Verify live behavior

**Files:**
- Test: `apps/web/tests/locus/rag.test.mjs`
- Test: `apps/web/tests/locus/route.test.mjs`

- [ ] Run focused tests for parser, applicant validation, and route contracts.
- [ ] Run the full TRACE test set.
- [ ] Run a live assistant request with configured Wikivibe key and confirm grounded response/citations.
- [ ] Run an unsupported admissions question and confirm explicit insufficient evidence.
- [ ] Run production build and browser smoke test for skip, save, and assistant flows.
