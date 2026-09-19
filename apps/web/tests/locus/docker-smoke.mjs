import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const image = process.env.TRACE_DOCKER_IMAGE || 'learnhouse-trace-smoke:local'
const container = `learnhouse-trace-smoke-${process.pid}`
const port = Number(process.env.TRACE_DOCKER_PORT || 39000 + (process.pid % 1000))
const baseUrl = `http://127.0.0.1:${port}`

if (process.env.TRACE_E2E_MODE !== 'fixture' || process.env.TRACE_E2E_FIXTURE_READY !== '1') {
  console.log('TRACE Docker smoke skipped: set TRACE_E2E_MODE=fixture and TRACE_E2E_FIXTURE_READY=1 when fixture routes are available.')
  process.exit(0)
}

function command(program, args, options = {}) {
  const result = spawnSync(program, args, {
    cwd: webDir,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    env: { ...process.env, ...options.env },
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const detail = typeof result.stderr === 'string' ? result.stderr.trim() : ''
    throw new Error(`${program} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
  return typeof result.stdout === 'string' ? result.stdout.trim() : ''
}

async function fetchJson(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(10_000),
    headers: { accept: 'application/json', ...(init.headers || {}) },
  })
  let body = null
  try { body = await response.json() } catch { /* health/profile assertions report the useful failure */ }
  return { response, body }
}

async function pollHealth() {
  const deadline = Date.now() + Number(process.env.TRACE_DOCKER_HEALTH_TIMEOUT_MS || 120_000)
  let lastError = 'no response'
  while (Date.now() < deadline) {
    try {
      const { response, body } = await fetchJson('/api/trace/health')
      if (response.status === 200 && body?.status === 'healthy' && body?.trace === 'ready') return body
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000))
  }
  throw new Error(`TRACE Docker health did not become ready: ${lastError}`)
}

let running = false
try {
  console.log(`Building ${image}`)
  command('docker', ['build', '--tag', image, '--file', 'Dockerfile', '.'], { inherit: true })
  command('docker', [
    'run', '--detach', '--name', container,
    '--publish', `127.0.0.1:${port}:3000`,
    '--env', 'NODE_ENV=production',
    '--env', 'TRACE_E2E_MODE=fixture',
    '--env', 'TRACE_E2E_FIXTURE_READY=1',
    '--env', 'WIKIVIBE_API_KEY=',
    image,
  ])
  running = true

  const health = await pollHealth()
  if (health.rag?.mode !== 'deterministic-fallback' || health.rag?.wikivibeConfigured !== false) {
    throw new Error(`Expected keyless deterministic fallback, got ${JSON.stringify(health.rag)}`)
  }

  const profile = await fetchJson('/api/trace/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'Example University', locale: 'en' }),
  })
  if (profile.response.status !== 200 || profile.body?.status !== 'ready') {
    throw new Error(`Fixture profile route was not ready: HTTP ${profile.response.status} ${JSON.stringify(profile.body)}`)
  }
  if (typeof profile.body.profileToken !== 'string') {
    throw new Error('Fixture profile response did not include profileToken')
  }
  console.log('TRACE Docker smoke passed: health and fixture profile are ready.')
} finally {
  if (running) {
    try { command('docker', ['rm', '--force', container]) } catch (error) { console.error(`Could not remove ${container}:`, error) }
  }
}
