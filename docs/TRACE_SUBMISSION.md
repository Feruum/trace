# TRACE submission kit

## Three-minute live demo

- 0:00–0:20 — State the problem: university evidence is fragmented, duplicated, and hard to verify.
- 0:20–0:35 — Open the public TRACE workspace and enter `University of Oxford`.
- 0:35–0:50 — If Wikidata returns multiple entities, choose the correct institution; explain that TRACE never picks an arbitrary first result.
- 0:50–1:20 — Show the measured elapsed time and the profile header. Point out accepted/rejected counts, warnings, location, and the source-derived summary.
- 1:20–1:50 — Inspect campus/core categories, select Общежитие or Лаборатории, and show an honest empty category if data is sparse.
- 1:50–2:10 — Open an image landing page and show creator/license/date plus the evidence badge.
- 2:10–2:30 — Ask the grounded assistant “What is confirmed about the campus?”; open a returned citation and explain server-side exact-quote validation.
- 2:30–2:45 — Ask an unsupported question about tuition or climate; show insufficient evidence rather than an invented answer.
- 2:45–3:00 — Add two profiles to shortlist, open Compare, show category coverage, then state the no-database/no-stock/no-fabrication boundary.

## Eight-slide presentation outline

1. **Problem** — prospective students cannot quickly distinguish university marketing from source-verifiable campus evidence.
2. **TRACE flow** — Search → Resolve → Inspect → Filter → Ask → Shortlist → Compare.
3. **Live result** — profile header, core categories, filter categories, source cards, warnings.
4. **Evidence pipeline** — Wikidata identity, Wikimedia/Openverse media, normalization, scoring, category assignment, dedupe.
5. **Grounded assistant** — bounded chunks, lexical retrieval, Wikivibe OpenAI-compatible call, exact quote validation, refusal state.
6. **Architecture** — Next.js public Node routes, stateless contracts, sharp hashing, injected provider seams, no DB/auth.
7. **Accuracy and limits** — threshold formula, visual hash is not semantic CV, partial data remains visible, license attribution.
8. **Next** — richer claim-level Wikidata references, optional map, more providers, deployment and monitoring; no fabricated ranking promise.

## Manual design review matrix

Review at 1440×900, 1280×800, and 390×844:

- first viewport explains TRACE and presents a labelled search input;
- loading exposes elapsed seconds and does not claim completion early;
- ambiguity presents keyboard-focusable institution choices;
- not-found/error states preserve the query and provide recovery;
- ready state shows summary, city/country, accepted/rejected counts, warnings, categories, filters, audit, and assistant;
- empty category is explicit and never a placeholder image;
- source cards expose landing URL, license, creator/date state, category, confidence, and image fallback;
- filters change rendered assets without another network request;
- shortlist persists only in session storage and compare never declares a university winner;
- assistant citations resolve to provider pages and unsupported questions refuse;
- keyboard focus is visible, external links open with `target="_blank" rel="noreferrer"`, and no sign-in screen appears;
- no horizontal overflow at phone width; no clipped comparison tray; no missing translation keys.

## Fresh verification evidence

- Manual browser review: `/` at 1440×900 and 390×844; no horizontal overflow, visible labelled search, keyboard-capable buttons, localized Russian copy, empty/error recovery, source-code/legal footer.
- Live provider run: `University of Oxford` returned `ready` in approximately 4–8 seconds; provider rate limiting is reported as a warning, not hidden. Nonsense input returned `404 UNIVERSITY_NOT_FOUND`.
- Upstream stack caveat: `npx learnhouse dev` could not bind Redis `6379` because an unrelated container owns the port; no unrelated container was stopped. TRACE was tested independently through the Next web server.
