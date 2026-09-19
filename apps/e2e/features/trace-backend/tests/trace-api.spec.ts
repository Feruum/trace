import { test, expect, type APIResponse } from '@playwright/test'

/**
 * Request-only coverage for TRACE backend contracts. This suite is opt-in so
 * production routes are never mistaken for deterministic fixture doubles.
 */
test.describe.configure({ mode: 'serial' })

test.describe('[TRACE backend] request API contracts', () => {
  test.skip(
    process.env.TRACE_E2E_MODE !== 'fixture' || process.env.TRACE_E2E_FIXTURE_READY !== '1',
    'Set TRACE_E2E_MODE=fixture and TRACE_E2E_FIXTURE_READY=1 for a server with deterministic TRACE fixtures.',
  )
  let profileToken = ''
  let entityId = ''
  let sourceId = ''

  async function json(response: APIResponse): Promise<Record<string, unknown>> {
    return (await response.json()) as Record<string, unknown>
  }

  test.beforeAll(async ({ request }) => {
    // The fixture mode is not silently enabled by route code. If a server
    // lacks the fixture provider, skip rather than contacting live providers.
    const health = await request.get('/api/trace/health')
    if (!health.ok()) test.skip(true, `TRACE health is not ready (${health.status()}).`)
    const healthBody = await health.json().catch(() => ({})) as Record<string, any>
    if (healthBody.trace !== 'ready' || healthBody.rag?.mode !== 'deterministic-fallback') {
      test.skip(true, 'Fixture prerequisites are not active; refusing to run against live providers.')
    }

    const profile = await request.post('/api/trace/profile', {
      data: { query: 'Example University', locale: 'en' },
    })
    if (!profile.ok()) test.skip(true, `Fixture profile collection is unavailable (${profile.status()}).`)
    const body = await profile.json().catch(() => ({})) as Record<string, any>
    if (body.status !== 'ready' || typeof body.profileToken !== 'string' || !body.profile?.university?.id) {
      test.skip(true, 'TRACE_E2E_MODE=fixture is set, but no deterministic ready profile was exposed.')
    }
    profileToken = body.profileToken
    entityId = body.profile.university.id
    const firstAsset = body.profile.assets?.[0]
    sourceId = typeof firstAsset?.sourceId === 'string' ? firstAsset.sourceId : ''
  })

  test('reports healthy keyless deterministic fallback', async ({ request }) => {
    const response = await request.get('/api/trace/health')
    expect(response.status()).toBe(200)
    expect(await json(response)).toMatchObject({
      status: 'healthy',
      trace: 'ready',
      rag: { wikivibeConfigured: false, mode: 'deterministic-fallback' },
    })
  })

  test('collects a fixture profile and serves stable filtered views', async ({ request }) => {
    expect(profileToken).toMatch(/^[0-9a-f-]{36}$/i)
    expect(entityId).toMatch(/^Q[1-9][0-9]*$/)

    const profile = await request.get(`/api/trace/profile/${entityId}?sort=confidence`)
    expect(profile.status()).toBe(200)
    const body = await json(profile)
    expect(body.status).toBe('ready')
    expect(body.canonicalUrl).toBe(`/api/trace/profile/${entityId}`)
    expect((body.profile as Record<string, unknown>).lastCheckedAt).toBeTruthy()

    const filtered = await request.get(
      `/api/trace/profile/${entityId}?confidence=confirmed&category=library&source=wikimedia_commons&sort=category`,
    )
    expect(filtered.status()).toBe(200)
    expect((await json(filtered)).status).toBe('ready')
  })

  test('refreshes the stable profile and lists deduplicated sources', async ({ request }) => {
    const refreshed = await request.post(`/api/trace/profile/${entityId}/refresh?sort=source`)
    expect(refreshed.status()).toBe(200)
    const refreshBody = await json(refreshed)
    expect(refreshBody.status).toBe('ready')
    expect(refreshBody.lastCheckedAt).toBeTruthy()

    const sources = await request.get(`/api/trace/profile/${entityId}/sources`)
    expect(sources.status()).toBe(200)
    const sourceBody = await json(sources)
    expect(sourceBody.status).toBe('ready')
    expect(Array.isArray(sourceBody.sources)).toBe(true)
    const ids = (sourceBody.sources as Array<Record<string, unknown>>).map((source) => source.sourceId)
    expect(new Set(ids).size).toBe(ids.length)
    if (sourceId) expect(ids).toContain(sourceId)
  })

  test('answers single and batch questions without leaving the grounded contract', async ({ request }) => {
    const single = await request.post('/api/trace/assistant', {
      data: { profileToken, question: 'What is documented about this university?', locale: 'en' },
    })
    expect(single.status()).toBe(200)
    const singleBody = await json(single)
    expect(singleBody.status).toBe('ready')
    expect((singleBody.answer as Record<string, unknown>)?.status).toMatch(/^(answered|insufficient_evidence)$/)

    const batch = await request.post('/api/trace/assistant/batch', {
      data: {
        profileToken,
        questions: ['Where is the university?', 'What is documented about admission requirements?'],
        locale: 'en',
      },
    })
    expect(batch.status()).toBe(200)
    const batchBody = await json(batch)
    expect(batchBody.status).toBe('ready')
    expect(batchBody.answers).toHaveLength(2)
    for (const answer of batchBody.answers as Array<Record<string, unknown>>) {
      expect(answer.status).toMatch(/^(answered|insufficient_evidence)$/)
      if (answer.status === 'insufficient_evidence') {
        expect(answer.refusalReason).toBeTruthy()
        expect(answer.explanation).toBeTruthy()
      }
    }
  })

  test('keeps anonymous comparisons bounded and validates feedback', async ({ request }) => {
    const comparison = await request.post('/api/trace/comparisons', {
      data: { leftEntityId: entityId, rightEntityId: entityId === 'Q1' ? 'Q2' : 'Q1' },
    })
    // Durable operations fail closed when Redis/session signing is absent.
    expect([201, 503]).toContain(comparison.status())
    if (comparison.status() === 201) {
      const history = await request.get('/api/trace/comparisons')
      expect(history.status()).toBe(200)
      const historyBody = await json(history)
      expect(Array.isArray(historyBody.comparisons)).toBe(true)
      expect((historyBody.comparisons as unknown[]).length).toBeLessThanOrEqual(2)
    }

    const invalidFeedback = await request.post('/api/trace/feedback', {
      data: { entityId, sourceId: 'not-a-source', reason: 'wrong_source' },
    })
    expect(invalidFeedback.status()).toBe(400)
    expect((await json(invalidFeedback)).code).toBeTruthy()
  })

  test('serves versioned legal documents', async ({ request }) => {
    for (const document of ['privacy', 'terms']) {
      const response = await request.get(`/api/trace/legal/${document}`)
      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toContain('text/plain')
      expect((await response.text()).length).toBeGreaterThan(100)
    }
  })
})
