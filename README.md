<p align="center">
  <a href="https://learnhouse.app">
    <img src=".github/images/learnhouse-github.png" alt="LearnHouse" width="600" />
  </a>
</p>

<h3 align="center">The next-gen open-source platform for world-class educational content.</h3>

<p align="center">
  <a href="https://github.com/learnhouse/learnhouse/blob/main/LICENSE"><img src="https://img.shields.io/github/license/learnhouse/learnhouse?style=flat&color=blue" alt="License" /></a>
  <a href="https://github.com/learnhouse/learnhouse/stargazers"><img src="https://img.shields.io/github/stars/learnhouse/learnhouse?style=flat" alt="Stars" /></a>
  <a href="https://www.npmjs.com/package/learnhouse"><img src="https://img.shields.io/npm/v/learnhouse?style=flat&label=cli" alt="CLI Version" /></a>
  <a href="https://app.codecov.io/gh/learnhouse/learnhouse"><img src="https://img.shields.io/codecov/c/github/learnhouse/learnhouse?flag=api&label=api%20coverage" alt="API Coverage" /></a>
  <a href="https://github.com/learnhouse/learnhouse/commits"><img src="https://img.shields.io/github/last-commit/learnhouse/learnhouse?style=flat&label=last%20commit" alt="Last Commit" /></a>
  <a href="https://github.com/learnhouse/learnhouse/issues"><img src="https://img.shields.io/github/issues/learnhouse/learnhouse?style=flat" alt="Issues" /></a>
  <a href="https://github.com/learnhouse/learnhouse/pulls"><img src="https://img.shields.io/github/issues-pr/learnhouse/learnhouse?style=flat&label=PRs" alt="Pull Requests" /></a>
</p>

<p align="center">
📖 <b>Courses</b> — Create and manage courses with ease<br>
✏️ <b>Editor</b> — Powerful block-based Notion-like content editor<br>
📦 <b>Collections</b> — Organize courses into curated bundles<br>
📝 <b>Assignments</b> — Create tasks and track student submissions<br>
💬 <b>Discussions</b> — Community forums for your learners<br>
🎙️ <b>Podcasts</b> — Audio content for on-the-go learning<br>
📊 <b>Analytics</b> — Track engagement and course performance<br>
🧊 <b>Playgrounds</b> — AI-generated interactive elements, simulations & diagrams<br>
💻 <b>Code</b> — Real code execution with auto-grading in 30+ languages<br>
📋 <b>Boards</b> — Real-time collaborative whiteboards<br>
🧠 <b>AI</b> — Context-aware AI for learning & teaching<br>
🎓 <b>Certificates</b> — Auto-generate certificates on course completion<br>
👥 <b>User Groups</b> — Organize learners and control access<br>
🔍 <b>SEO</b> — Built-in SEO optimization with metadata, sitemaps & open graph<br>
🎨 <b>Customization</b> — Custom branding, landing pages & theming<br>
💳 <b>Payments (Enterprise)</b> — Sell courses with no fees and no lock-in<br>
🔐 <b>SSO (Enterprise)</b> — Single sign-on with OAuth providers<br>
🏢 <b>Multi-Org (Enterprise)</b> — Run multiple organizations from a single instance<br>
</p>

## 🚀 Get Started

LearnHouse has an official CLI that handles everything — self-hosting, updates, backups, and local development.

### Self-host

```bash
npx learnhouse@latest setup
```

The setup wizard walks you through domain, database, admin account, and optional features. Once done, it generates all config files and starts your instance.

```bash
npx learnhouse start       # Start services
npx learnhouse stop        # Stop services
npx learnhouse update      # Update to latest version
npx learnhouse logs        # Stream logs
npx learnhouse backup      # Backup database
npx learnhouse doctor      # Diagnose issues
```

### Development

```bash
git clone https://github.com/learnhouse/learnhouse.git
cd learnhouse
npx learnhouse dev
```

This spins up PostgreSQL and Redis, installs dependencies, and starts the API, Web, and Collab servers with hot reload.

> See the full [CLI documentation](apps/cli/README.md) for all commands and options.

## TRACE — source-verified university profiles

This fork includes **TRACE**, a public, anonymous product surface at [`/`](http://localhost:3010/) and [`/trace`](http://localhost:3010/trace). The legacy `/locus` path redirects to the TRACE workspace for compatibility with the LOCUS Startup Hackathon Case 01 submission flow.

### What TRACE solves

Prospective students need a fast way to see what the open web can actually prove about a university. TRACE accepts a university name, resolves ambiguous Wikidata entities explicitly, gathers campus/dormitory/classroom/library/city and student-life media from Wikimedia Commons and Openverse, rejects weak metadata, removes exact and perceptual duplicates, and keeps provider landing URLs, licenses, creators, dates, categories, and evidence indexes visible.

### Product flow and extra features

`Search → Resolve → Inspect → Filter → Ask → Shortlist → Compare`

- Compare up to two profiles using evidence coverage, confirmed/review material counts, source count, rejection count, duplicate count, and per-category coverage. TRACE never ranks universities or invents a winner.
- Shortlist is session-only in browser storage. No profile or user data is persisted.
- The grounded Evidence Assistant uses a server-only Wikivibe OpenAI-compatible chat call. It retrieves bounded evidence chunks from the current profile, treats chunks as untrusted data, validates every exact quote against the server-owned source chunk, and returns explicit `insufficient_evidence` instead of guessing.

### Technical architecture

- `apps/web/app/api/trace/profile` and `apps/web/app/api/trace/assistant`: public same-origin Node route handlers; no auth, cookies, database writes, or API key exposure.
- `apps/web/lib/locus/sources`: Wikidata identity resolver, Wikimedia Commons adapter, Openverse adapter.
- `apps/web/lib/locus/confidence.ts`: deterministic Unicode-aware evidence score; `>=70` high, `55–69` review, below `55` rejected.
- `apps/web/lib/locus/dedupe.ts`: normalized URL dedupe, SHA-256 exact-byte hash, 16×16 grayscale average hash with Hamming threshold `<=12`, `sharp`, 8 MiB download cap, 5-second hash timeout, and source/area/confidence tie-breaks.
- `apps/web/lib/locus/evidence.ts` + `apps/web/lib/locus/rag`: bounded source chunks, lexical retrieval, strict JSON response parsing, exact citation validation, and provider timeout/error mapping.
- `WIKIVIBE_API_KEY` is read only on the server. Set optional `WIKIVIBE_MODEL` to override the default `gpt-5.6-luna`. Never commit a key.

### Case mapping and scoring

| Judge criterion | TRACE evidence |
| --- | --- |
| Accuracy / relevance (30%) | Identity resolution, category evidence, license gate, confidence thresholds, exact/perceptual dedupe, source audit, honest empty states |
| Technical architecture (25%) | Provider adapters, injected fetch seams, parallel `Promise.allSettled`, 24-second pipeline budget, Node `sharp`, stateless route, grounded RAG contract |
| UX (20%) | TRACE first viewport, explicit Search/Resolve/Inspect stages, core/filter categories, source cards, keyboard focus, loading/error/empty states, compare tray |
| Speed (15%) | Parallel providers, bounded result counts, elapsed timer, `profile.durationMs`, no retries within a run |
| Scalability (10%) | Normalized provider contracts, category registry, source adapters, reusable evidence chunks, optional OpenAI-compatible provider |

### What is automatic / what is not

Automatic: source retrieval, normalization, evidence scoring, category assignment, exact/perceptual dedupe, bounded lexical retrieval, grounded response validation, source attribution, and duplicate/rejection counters. Not automatic: semantic scene recognition, university quality ranking, enrollment/ranking/cost/climate facts, manual image curation, stock fallback, hardcoded demo payloads, fabricated dates, or fabricated confidence. Empty/partial categories and assistant refusals are valid outcomes.

### Providers, licensing, and legal notice

Production sources are Wikidata, Wikimedia Commons, and Openverse. Every displayed media card links to the provider landing page and keeps provider-supplied license/creator/date metadata; remote media is not bundled. Software remains based on LearnHouse AGPL-3.0; `LICENSE` is unchanged. TRACE exposes a source-code link and AGPL/no-warranty notice in the public UI. The product has no persistence layer and uses no paid API key except the optional server-side Wikivibe key for grounded answers.

### Verification commands

```bash
cd apps/web
bun test tests/locus
bun x tsc --noEmit --pretty false
bun run lint:strict
bun run build
```

Browser acceptance: open `/` anonymously at desktop and phone widths; run an ambiguous university, a known university, `zzzz university 9f3c`, filter categories, save two profiles, compare them, ask a source-grounded question, inspect citations, and confirm an unsupported cost/climate question produces insufficient evidence. `npx learnhouse dev` also starts the upstream DB/Redis stack, but on the development workstation Redis port `6379` may already be occupied by another container; TRACE itself is independently smoke-tested with the web server.

## 🛠️ Tech Stack

<p align="center">
<a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
<a href="https://react.dev"><img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" alt="React" /></a>
<a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" /></a>
<a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="TailwindCSS" /></a>
<a href="https://www.radix-ui.com"><img src="https://img.shields.io/badge/Radix_UI-161618?style=flat&logo=radixui&logoColor=white" alt="Radix UI" /></a>
<a href="https://tiptap.dev"><img src="https://img.shields.io/badge/Tiptap-1a1a2e?style=flat&logoColor=white" alt="Tiptap" /></a>
<a href="https://codemirror.net"><img src="https://img.shields.io/badge/CodeMirror-D30707?style=flat&logo=codemirror&logoColor=white" alt="CodeMirror" /></a>
<a href="https://yjs.dev"><img src="https://img.shields.io/badge/Yjs-6EEB83?style=flat&logoColor=black" alt="Yjs" /></a>
<a href="https://fastapi.tiangolo.com"><img src="https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
<a href="https://www.python.org"><img src="https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white" alt="Python" /></a>
<a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
<a href="https://redis.io"><img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis" /></a>
<a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker" /></a>
<a href="https://stripe.com"><img src="https://img.shields.io/badge/Stripe-635BFF?style=flat&logo=stripe&logoColor=white" alt="Stripe" /></a>
<a href="https://ai.google.dev"><img src="https://img.shields.io/badge/Gemini-8E75B2?style=flat&logo=googlegemini&logoColor=white" alt="Gemini" /></a>
<a href="https://www.llamaindex.ai"><img src="https://img.shields.io/badge/LlamaIndex-000?style=flat&logoColor=white" alt="LlamaIndex" /></a>
<a href="https://aws.amazon.com/s3"><img src="https://img.shields.io/badge/AWS_S3-569A31?style=flat&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDIgN3YxMGwxMCA1IDEwLTVWN0wxMiAyem0wIDIuMThMMTkuMTggNyAxMiA5LjgyIDQuODIgNyAxMiA0LjE4ek00IDguNjRsNyAzLjVWMTkuNWwtNy0zLjVWOC42NHptMTAgMTAuODZWMTIuMTRsNy0zLjV2Ny4zNmwtNyAzLjV6Ii8+PC9zdmc+&logoColor=white" alt="AWS S3" /></a>
<a href="https://www.tinybird.co"><img src="https://img.shields.io/badge/Tinybird-1A1A1A?style=flat&logoColor=white" alt="Tinybird" /></a>
</p>

## 📁 Project Structure

| App | Path | Description | Technology | Used by |
|-----|------|-------------|------------|---------|
| **Web** | `apps/web` | Frontend application — dashboard, course player, editor, landing pages | Next.js, React, TailwindCSS, Tiptap | Teachers, Students, Admins |
| **API** | `apps/api` | Backend REST API — auth, courses, payments, AI, analytics | FastAPI, Python, SQLModel, Alembic | Web, CLI, Collab |
| **Collab** | `apps/collab` | Real-time collaboration server — live editing sync for courses & boards | Hocuspocus, Yjs, WebSocket | Web (editor, boards) |
| **CLI** | `apps/cli` | Official CLI — setup wizard, dev environment, instance management | Commander, Node.js | Developers, Self-hosters |

## 💬 Community

- [Discord](https://discord.gg/CMyZjjYZ6x) — chat with the team and other users
- [Documentation](https://docs.learnhouse.app) — guides and references

## 🤝 Contributing

```bash
git clone https://github.com/learnhouse/learnhouse.git
cd learnhouse
npx learnhouse dev
```

- [Contributing Guide](CONTRIBUTING.md)
- [Submit a bug](https://github.com/learnhouse/learnhouse/issues/new?assignees=&labels=bug%2Ctriage&projects=&template=bug.yml&title=%5BBug%5D%3A+)
- [Good first issues](https://github.com/learnhouse/learnhouse/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)

## 🔒 Security

We take the security of LearnHouse and the data entrusted to us seriously. If you discover a vulnerability, please email **security@learnhouse.app** — do not disclose it publicly until we've had a chance to investigate.

Please include a clear description, steps to reproduce, affected endpoints, and any relevant screenshots or proof-of-concept code. We will acknowledge your report, keep you informed, and credit you once resolved if you wish.

See our full [Security Policy](https://learnhouse.app/security) for details on our practices, scope, and responsible disclosure guidelines.

## ✍️ Author & Maintainer

Sweave (Badr B.) — [@swve](https://github.com/swve)

## 💜 A Word

LearnHouse is made with 💜, from the UI to the features it is carefully designed to make students and teachers lives easier and make education software more enjoyable.

Thank you and have fun using/developing/testing LearnHouse !

## 📄 License

[AGPL-3.0](LICENSE) — Enterprise features are available under a separate Enterprise License.
