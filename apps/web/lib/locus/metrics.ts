export type MetricFamily =
  | 'trace_provider_requests_total'
  | 'trace_provider_failures_total'
  | 'trace_provider_duration_ms'
  | 'trace_rag_requests_total'
  | 'trace_rag_refusals_total'
  | 'trace_rag_refusal_reason_total'

export interface MetricSample {
  labels: Record<string, string>
  value: number
}

const MAX_SAMPLES = 512
const samples: Record<MetricFamily, MetricSample[]> = {
  trace_provider_requests_total: [],
  trace_provider_failures_total: [],
  trace_provider_duration_ms: [],
  trace_rag_requests_total: [],
  trace_rag_refusals_total: [],
  trace_rag_refusal_reason_total: [],
}

function labelsKey(labels: Record<string, string>): string {
  return Object.keys(labels).sort().map((key) => `${key}=${labels[key]}`).join('|')
}

export function recordMetric(family: MetricFamily, labels: Record<string, string> = {}, value = 1): void {
  const bucket = samples[family]
  const key = labelsKey(labels)
  const existing = bucket.find((sample) => labelsKey(sample.labels) === key)
  if (existing) {
    existing.value += value
    return
  }
  if (bucket.length >= MAX_SAMPLES) bucket.shift()
  bucket.push({ labels: { ...labels }, value })
}

export function recordProviderRequest(provider: string, operation: string, status: string, durationMs: number, reason?: string | null): void {
  const labels = { provider, operation, status, ...(reason ? { reason } : {}) }
  recordMetric('trace_provider_requests_total', labels)
  recordMetric('trace_provider_duration_ms', { provider, operation }, durationMs)
  if (status === 'failed') recordMetric('trace_provider_failures_total', labels)
}

export function recordRagRequest(status: string): void {
  recordMetric('trace_rag_requests_total', { status })
}

export function recordRagRefusal(reason: string): void {
  recordMetric('trace_rag_refusals_total', { reason })
  recordMetric('trace_rag_refusal_reason_total', { reason })
}

export function snapshotMetrics(): Record<MetricFamily, MetricSample[]> {
  return Object.fromEntries(Object.entries(samples).map(([family, values]) => [family, values.map((sample) => ({ labels: { ...sample.labels }, value: sample.value }))])) as Record<MetricFamily, MetricSample[]>
}

export function resetMetrics(): void {
  for (const bucket of Object.values(samples)) bucket.length = 0
}
