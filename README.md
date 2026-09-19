# TRACE

TRACE is an evidence-first university discovery workspace built on top of the LearnHouse Core platform.

A prospective student searches for a university and receives a source-linked profile assembled from public data. TRACE keeps uncertainty visible: every accepted image retains its provider page, license, creator, date, category, and confidence signal. Missing or weak evidence is shown as missing or requiring review instead of being replaced with stock media or invented facts.

<p align="center">
  <img src="logo_trace.png" alt="TRACE" width="140" />
</p>

## Product flow

```text
Search → resolve identity → inspect evidence → filter categories
      → save up to two profiles → compare evidence coverage → ask the grounded assistant
```

TRACE does not rank universities. A comparison describes the coverage and state of available evidence; it never declares a winner.

## Application surfaces

| URL | Surface | Description |
| --- | --- | --- |
| `/` | TRACE marketing landing | Project presentation and entry points. |
| `/workspace` | TRACE Core workspace | Public university search and evidence workflow inside the LearnHouse Core shell. |
| `/home` | LearnHouse Core organization picker | Standard authenticated organization selection. |
| `/dash` | LearnHouse Core dashboard | Core administration and content-management surface. |
| `/orgs/[orgslug]/...` | Internal Core routes | Organization-scoped pages resolved by the tenancy proxy. |

`/workspace` is the public entry point for the Core TRACE experience. In single-tenancy mode it is rewritten to the default organization internally; the browser does not need to know the organization slug.

The former standalone visual routes were intentionally removed and now return 404:

- `/trace`
- `/locus`
- `/methodology`
- `/compare`
- `/privacy`
- `/terms`
- `/universities/[id]`

The server endpoints remain available under `/api/locus/*` and `/api/trace/*` for the Core frontend and operational tooling. Legal text is available through the server endpoints `/api/trace/legal/privacy` and `/api/trace/legal/terms`.

## Core integration

TRACE reuses LearnHouse Core rather than maintaining a second application shell.

The public workspace keeps the existing Core:

- organization context and tenancy resolution;
- `SessionGate`, `OrgProvider`, `OrgMenu`, footer, watermark, and MFA gates;
- Core typography, semantic color tokens, spacing, borders, cards, buttons, inputs, dialogs, and responsive behavior;
- existing authentication, organization settings, dashboard, courses, library, communities, boards, podcasts, playgrounds, and editor routes.

TRACE-specific behavior is mounted in the Core public organization content slot:

- `apps/web/app/orgs/[orgslug]/(withmenu)/home-client.tsx`
- `apps/web/components/CoreTrace/CoreTraceWorkspace.tsx`

The workspace uses the supplied branding files without recreating or substituting them:

- `apps/web/public/logo_trace.png` — standalone TRACE mark and Core menu fallback;
- `apps/web/public/logo_with_alphabet.png` — TRACE wordmark in the workspace.

The original source assets are also kept at the repository root as `logo_trace.png` and `trace_logo_with_aplhaphets.png`.

## TRACE capabilities

### University profiles

The profile pipeline:

1. resolves a university through Wikidata;
2. asks the user to choose when identity resolution is ambiguous;
3. collects category evidence from Wikimedia Commons and Openverse;
4. applies provenance and confidence gates;
5. removes exact and perceptual duplicates;
6. preserves provider attribution and source links;
7. exposes honest loading, empty, partial, unavailable, and error states.

Core categories include campus, dormitory, classroom, library, and city. Additional evidence categories include sport, laboratory, and student life.

### Applicant context

The optional applicant panel stores only browser-session context such as target country, city, field, intake, budget, degree, and exam scores. These values personalize retrieval but never become official university requirements.

### Shortlist and comparison

The shortlist is limited to two profiles and stored in `sessionStorage`. It is not persisted in the database. Comparison metrics include category coverage, confirmed/review materials, source count, rejected provenance candidates, duplicates, and admissions-source availability.

### Grounded RAG assistant

The Core profile mounts the assistant below evidence and source audit content. The browser sends the current opaque `profileToken` to:

```text
POST /api/trace/assistant
```

The server:

- builds bounded evidence chunks from the current profile;
- retrieves only relevant evidence kinds for the question;
- treats provider text as untrusted data;
- calls the configured Wikivibe-compatible provider server-side;
- validates every returned citation and quote against server-owned chunks;
- returns `answered` with claims and citations, or `insufficient_evidence` with the server explanation and refusal reason.

`WIKIVIBE_API_KEY` is never exposed to browser code. When a provider key is absent, the service can return deterministic evidence-only fallback for retrieved material; it never fabricates unsupported claims.

## Architecture

```text
apps/web/app/orgs/[orgslug]/(withmenu)/home-client.tsx
        │
        ▼
apps/web/components/CoreTrace/CoreTraceWorkspace.tsx
        │
        ├── Core UI primitives and organization shell
        ├── ProfileHeader / CategoryGallery / PhotoCard
        ├── SourceAudit / ApplicantOnboarding / SourceAssistant
        ├── POST /api/trace/profile
        └── POST /api/trace/assistant
                │
                ▼
apps/web/lib/locus/**
        ├── profile pipeline and provider adapters
        ├── confidence, provenance, deduplication, and evidence chunks
        ├── profile cache and transient store
        └── grounded RAG retrieval and response validation
```

### Important implementation paths

| Path | Responsibility |
| --- | --- |
| `apps/web/components/CoreTrace/CoreTraceWorkspace.tsx` | Core TRACE state, search, candidate resolution, shortlist, comparison, and composition. |
| `apps/web/lib/locus/types.ts` | Profile, evidence, applicant, and API contracts. |
| `apps/web/lib/locus/pipeline.ts` | Wikidata, Wikimedia Commons, Openverse, admissions, scoring, and profile assembly. |
| `apps/web/lib/locus/evidence.ts` | Bounded evidence chunks used by RAG. |
| `apps/web/lib/locus/confidence.ts` | Deterministic confidence and reason-code scoring. |
| `apps/web/lib/locus/dedupe.ts` | URL, exact-byte, and perceptual duplicate detection. |
| `apps/web/lib/locus/rag/` | Retrieval, prompt construction, provider adapter, strict parsing, and citation validation. |
| `apps/web/app/api/locus/` | Canonical server handlers. |
| `apps/web/app/api/trace/` | Public same-origin wrappers with security headers and observability. |
| `apps/web/proxy.ts` | Tenancy resolution, `/workspace` alias, Core rewrites, and public asset passthrough. |

## Local development

### Prerequisites

- Bun `1.4.2`;
- Docker Desktop;
- Python `3.14.7` for the current API lockfile, or the repository's Docker/CLI environment;
- PostgreSQL and Redis for the LearnHouse Core backend.

### Recommended development startup

From the repository root:

```bash
npx learnhouse dev
```

The LearnHouse CLI starts the API, web, collaboration server, PostgreSQL, and Redis development stack.

If the database services need to be started separately:

```bash
docker compose -f .learnhouse/docker-compose.dev.yml up -d db redis
```

The web application is in `apps/web`:

```bash
cd apps/web
bun install
bun run dev
```

Open:

```text
http://localhost:3010/
http://localhost:3010/workspace
```

The Core workspace requires the API to be reachable through the configured backend URL. If the API is unavailable, LearnHouse correctly renders its Core offline/server error state; TRACE source retrieval cannot complete without the backend process and external providers.

### Environment

Create `apps/web/.env.local` locally. Never commit this file or provider keys.

```env
NEXT_PUBLIC_LEARNHOUSE_BACKEND_URL=http://localhost:1338/
WIKIVIBE_API_KEY=your-server-only-key
WIKIVIBE_MODEL=gpt-5.6-luna
```

`WIKIVIBE_MODEL` is optional. The default model is `gpt-5.6-luna`.

## Verification

Focused TRACE and Core checks:

```bash
cd apps/web
bun test tests/locus
bun x tsc --noEmit --pretty false
```

Available project checks:

```bash
bun run lint:strict
bun run build
```

The focused suite covers provider contracts, profile assembly, provenance gates, deduplication, RAG retrieval and citation validation, route contracts, Core integration, migration of removed visual routes, applicant context, comparison, and API hardening.

### Browser acceptance checklist

Run with the backend and external provider access available:

1. Open `/` anonymously at desktop width and confirm the TRACE marketing landing loads.
2. Open `/workspace` at desktop and phone widths and confirm the LearnHouse Core shell remains active.
3. Confirm the TRACE wordmark and standalone mark load from the repository assets.
4. Submit an ambiguous university and choose a Wikidata candidate.
5. Submit a known university and inspect the profile summary, categories, source cards, licenses, creators, dates, and confidence details.
6. Exercise empty categories, provider errors, retry, and reset states.
7. Add two profiles to the session shortlist and open evidence-only comparison.
8. Refresh the workspace and confirm shortlist/applicant session state behavior.
9. Ask a source-grounded assistant question and inspect claims and citations.
10. Ask an unsupported cost, climate, or ranking question and confirm `insufficient_evidence`.
11. Verify `/trace`, `/locus`, `/methodology`, `/compare`, `/privacy`, `/terms`, and `/universities/[id]` return 404.
12. Inspect browser console and network requests; confirm no API key is present in client payloads.

## Data, privacy, and evidence boundaries

TRACE is public and stateless from the product perspective:

- profile generation is request-driven;
- shortlist and applicant context are browser-session state;
- transient server caches may hold profile data for the active workflow;
- no university ranking or quality judgment is inferred;
- enrollment, tuition, climate, transport, safety, student reviews, and program eligibility are not invented from image metadata;
- every visible media item keeps a provider landing page and attribution metadata;
- remote provider media is not bundled into the repository.

See `PRODUCT.md` for the product contract and boundaries.

## LearnHouse Core platform

TRACE retains the underlying LearnHouse platform capabilities, including:

- courses and block-based editing;
- assignments and learner submissions;
- libraries and collections;
- communities and discussions;
- podcasts;
- analytics;
- playgrounds and code activities;
- collaborative boards;
- AI learning tools;
- certificates and user groups;
- organization customization, authentication, SEO, and administration.

The platform structure remains:

| App | Path | Role |
| --- | --- | --- |
| Web | `apps/web` | Next.js Core frontend and TRACE workspace. |
| API | `apps/api` | FastAPI authentication, organizations, content, analytics, and services. |
| Collab | `apps/collab` | Hocuspocus/Yjs real-time collaboration. |
| CLI | `apps/cli` | Local development and self-hosting commands. |

## Sources and licensing

TRACE uses:

- [Wikidata](https://www.wikidata.org/);
- [Wikimedia Commons](https://commons.wikimedia.org/);
- [Openverse](https://openverse.org/).

Provider licenses and attribution remain attached to each displayed item. Follow the terms of the linked provider before reusing media.

The underlying LearnHouse code remains licensed under [AGPL-3.0](LICENSE). This repository contains no committed API keys or provider credentials.

## Contributing

Before opening a change:

```bash
cd apps/web
bun test tests/locus
bun x tsc --noEmit --pretty false
```

Keep TRACE logic in `apps/web/lib/locus` and Core presentation in existing Core/shared components. Do not introduce a second application shell for TRACE. Preserve source attribution, evidence boundaries, privacy behavior, and explicit refusal states.

See [CONTRIBUTING.md](CONTRIBUTING.md) for repository contribution guidance.
