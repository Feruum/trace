# TRACE University RAG Expansion Design

## Status

Approved direction: expand TRACE from visual-profile Q&A into a grounded university information assistant. Backend and RAG only. Frontend pages, components, styles, and locales remain unchanged.

## Goal

Allow users to ask evidence-grounded questions about an identified university across the full public-information surface:

- identity and verified basic facts;
- programs, faculties, departments, and degrees;
- admissions requirements, application steps, deadlines, and intakes;
- tuition, fees, scholarships, and financial aid;
- campus facilities and student life;
- dated statistics, rankings, and official contacts.

The assistant must answer only from collected evidence, expose exact source quotes and URLs, and refuse when the requested fact is not established by an appropriate source.

## Non-goals

- No frontend changes.
- No registration or authenticated TRACE flow.
- No general-purpose web search inside the chat request.
- No embeddings or vector database at the current document volume.
- No admissions guarantee or eligibility decision.
- No silent model fallback between providers/models.

## Source and evidence model

TRACE stores evidence as bounded, server-owned records associated with a Wikidata entity. Each record carries:

```text
entityId
kind
sourceUrl
sourceLabel
pageTitle
scope
program
degree
intake
academicYear
sourceDate
retrievedAt
quote
normalizedFacts
contentHash
```

`kind` is one of:

- `identity`
- `description`
- `program`
- `admissions`
- `tuition`
- `scholarship`
- `deadline`
- `campus`
- `student_life`
- `statistics`
- `ranking`
- `contact`
- `image`

Provider data remains untrusted input. HTML is normalized, instruction-like source text is redacted before model prompting, and the server validates every returned citation against the stored chunk text.

### Source precedence

1. Official university/program/admissions pages for requirements, deadlines, tuition, scholarships, facilities, contacts, and program facts.
2. Wikidata for stable identity, aliases, location, and entity relationships.
3. Wikimedia Commons/Openverse for media provenance and image metadata.
4. External ranking/statistics sources only when the source, publisher, metric, year, and scope are explicit.

Official-page facts require page URL, exact quote, source date when available, and academic/program context where applicable. Missing date is represented as `null`, never fabricated from fetch time.

## Domain collection

The collector expands the existing bounded official-page crawl into scored domain discovery. It keeps the existing provider concurrency/deadline limits and records one diagnostic per attempted URL/domain.

### Identity and basic facts

Use Wikidata and official about/contact pages. Facts such as foundation year, rector, campus locations, and official contacts are accepted only when a source explicitly states the fact.

### Programs

Discover faculty, school, department, degree, and program pages. Extract:

- canonical program title;
- normalized aliases;
- degree level;
- field;
- duration;
- instruction language;
- campus/location;
- application link;
- source date and academic year.

Program aliases are normalized for matching but the original title remains in evidence.

### Admissions and deadlines

Retain the strict admissions semantics already implemented:

- university-wide evidence is not program-specific evidence;
- score comparison requires matching program, degree, and intake when supplied;
- numeric ranges are exam-specific;
- years and arbitrary numbers cannot become scores;
- result status is always `preliminary_source_check`;
- every requirement has an exact quote and official URL.

Add deadline/application-step records with explicit intake and academic year. A deadline without an identifiable intake/year is informational only and cannot answer a dated deadline question.

### Tuition and scholarships

Extract monetary values only with:

- currency;
- academic year or period;
- degree/program scope;
- domestic/international status when stated;
- per-year/per-term/per-credit unit when stated;
- exact quote and official URL.

Do not merge values with different years, currencies, programs, or student categories. Scholarships and financial aid require an explicit eligibility/scope quote; no inferred availability.

### Campus and student life

Normalize official descriptions for buildings, dormitories, libraries, labs, sports, clubs, events, health, careers, and student services. Media records remain separate from institutional facility claims; an image caption alone cannot prove that a facility exists.

### Statistics and rankings

Store metric name, value, publisher, year, population/scope, and source URL. A ranking answer must identify the ranking publisher and year. Un-dated or ambiguous ranking claims are refused for comparative questions.

## Retrieval architecture

At the current volume, retrieval remains deterministic and does not add embeddings:

```text
question
  -> classify domain and intent
  -> expand RU/EN synonyms
  -> apply structured filters (entity, kind, program, degree, intake, year)
  -> lexical scoring and phrase/category boosts
  -> deterministic reranking
  -> bounded evidence selection
  -> strict gpt-5.6-luna call
  -> server citation validation
```

Question classes expand beyond the current `identity`, `admissions`, `media`, and `general` classes to include `program`, `tuition`, `deadline`, `scholarship`, `campus`, `student_life`, `statistics`, `ranking`, and `contact` as the corresponding evidence kinds become available.

Structured filters run before lexical scoring. For example, a tuition question for an international master's program must not retrieve a domestic bachelor's fee merely because the words overlap.

### Embeddings threshold

Do not add embeddings/vector storage until one of these conditions is true:

- a university has more than 100 substantial official-page chunks;
- the system has more than 10,000 chunks across universities;
- lexical retrieval evaluation shows a measurable recall failure on the maintained evaluation set.

When the threshold is reached, introduce hybrid retrieval behind the existing `retrieveEvidence` contract so server citation validation and refusal semantics do not change.

## Model lane

Production uses one strict model lane: `gpt-5.6-luna`.

- `WIKIVIBE_MODEL` may select the model explicitly for controlled testing, but production defaults to Luna.
- No automatic model fallback.
- Unknown statuses, `claim/quotes` aliases, unknown fields, missing citations, oversized fields, or non-exact quotes are rejected as `invalid_model_response`.
- Provider failures remain typed and observable.
- Keyless deployments use the deterministic evidence-only fallback and never call the network.

Prompts explicitly require:

- exact top-level keys;
- `status` exactly `answered` or `insufficient_evidence`;
- claim objects exactly `{ text, citations }`;
- citation objects exactly `{ chunkId, quote }`;
- no outside knowledge;
- no admissions eligibility claim without matching program-specific evidence.

## API behavior

Existing single-question and batch assistant APIs remain compatible. New evidence domains are additive to the server profile/evidence contracts.

A successful answer contains:

- answer text;
- claims;
- deduplicated source citations;
- model identifier;
- retrieved count.

An insufficient answer contains:

- localized explanation;
- typed refusal reason;
- empty claims and citations.

Refusal reasons remain stable and gain domain-specific reasons only when needed, for example `tuition_context_missing`, `deadline_year_missing`, or `ranking_year_missing`. The default unsupported-fact reason remains `no_relevant_evidence`.

## Observability and privacy

Record only safe labels and measurements:

- domain/classification;
- provider/model name;
- request status;
- retrieval count/bucket;
- latency;
- refusal reason;
- schema/citation validation failures.

Do not record raw questions, applicant scores, source bodies, credentials, or API keys.

## Evaluation

Extend the current 100-case bilingual evaluation set with domain-balanced cases as new domains ship. Every new case specifies:

```text
id
locale
question
expectedType
expectedOutcome
requiredDomain
requiredScope
requiresOfficialEvidence
```

The set must include:

- confirmable facts for every domain;
- missing-year/context refusals for tuition, deadlines, and rankings;
- false-premise questions;
- university-wide versus program-specific admissions questions;
- prompt-injection source text;
- RU/EN equivalent cases;
- duplicate/fabricated citation attempts.

Success criteria: zero fabricated citations, zero unsupported factual answers, zero injection-following answers, zero university-wide admissions eligibility claims, and stable bilingual classification.

## Rollout order

1. Freeze strict Luna lane and live schema contract tests.
2. Add evidence contracts and discovery for programs/faculties.
3. Add admissions deadlines and application steps.
4. Add tuition, scholarships, and financial-aid context matching.
5. Add campus/student-life institutional evidence.
6. Add dated statistics/rankings/contacts.
7. Re-run bilingual evaluation and live Wikivibe smoke for every domain.
8. Reassess embeddings only after the explicit volume/recall threshold.

Each step remains backend/RAG-only and must preserve the existing frontend response compatibility fields.
