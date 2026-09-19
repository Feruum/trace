import { LocusProviderError } from '../http'

const WIKIVIBE_ENDPOINT = 'https://api.wikivibe.ru/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-5.6-luna'
const MAX_RESPONSE_BYTES = 1_000_000
const REQUEST_TIMEOUT_MS = 35_000

export interface WikivibeChatClient {
  // Public DI seam used by tests and the server-only adapter.
  complete(_input: { system: string; user: string; model: string; signal?: AbortSignal }): Promise<string>
}

function configuredKey(): string {
  const key = process.env.WIKIVIBE_API_KEY?.trim()
  if (!key) throw new LocusProviderError('Wikivibe', 'API key is not configured')
  return key
}

function responseText(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) throw new LocusProviderError('Wikivibe', 'invalid response')
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices)) throw new LocusProviderError('Wikivibe', 'invalid response')
  const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content
  if (typeof content !== 'string' || content.length === 0) throw new LocusProviderError('Wikivibe', 'empty response')
  return content
}

export const wikivibeClient: WikivibeChatClient = {
  async complete({ system, user, model, signal }) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const abort = () => controller.abort()
    if (signal?.aborted) controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    try {
      const response = await fetch(WIKIVIBE_ENDPOINT, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${configuredKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      })
      if (!response.ok) throw new LocusProviderError('Wikivibe', `HTTP ${response.status}`)
      const contentLength = Number(response.headers.get('content-length') ?? 0)
      if (contentLength > MAX_RESPONSE_BYTES) throw new LocusProviderError('Wikivibe', 'response too large')
      const text = await response.text()
      if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) throw new LocusProviderError('Wikivibe', 'response too large')
      let payload: unknown
      try {
        payload = JSON.parse(text)
      } catch (error) {
        throw new LocusProviderError('Wikivibe', 'invalid JSON', error)
      }
      return responseText(payload)
    } catch (error) {
      if (error instanceof LocusProviderError) throw error
      throw new LocusProviderError('Wikivibe', 'request failed', error)
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
    }
  },
}

export const RAG_MODEL = process.env.WIKIVIBE_MODEL?.trim() || DEFAULT_MODEL
