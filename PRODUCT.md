# TRACE

TRACE is a public, evidence-first university discovery workspace. A prospective student enters a university name and gets a source-linked visual profile assembled from open data, with explicit uncertainty instead of unsupported claims.

## Product mechanism

TRACE traces every accepted image to its provider landing page, license, attribution metadata, category evidence, and confidence index. It never fills missing evidence with stock images or invented facts.

## Primary audience and job

Prospective students and families comparing universities need a quick, honest view of campus life across places that publish information inconsistently. Their job is to understand what is documented, compare the coverage of two institutions, and know what still requires manual checking.

## Core flow

Search → resolve identity → inspect evidence → filter categories → save up to two profiles → compare evidence coverage.

## Product boundaries

TRACE is stateless and public. Profiles are generated per request from Wikidata, Wikimedia Commons, and Openverse. Shortlists live only in the browser session. The product does not claim visual-semantic certainty, rankings, enrollment facts, student reviews, climate, transport, cost, or institutional quality from image metadata.

## Success signals

- A first-time visitor understands the task and starts a search immediately.
- A judge can repeat the flow with an arbitrary university without login.
- Every visible image has a working source, license label, category, and confidence disclosure.
- Weak, missing, duplicate, and unavailable evidence is visible rather than hidden.
- Comparing two universities describes evidence coverage without declaring a fabricated winner.
