const TRACE_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"

/** Apply the response policy shared by TRACE's server-only endpoints. */
export function applyTraceSecurityHeaders<T extends Response>(response: T): T {
  response.headers.set('Content-Security-Policy', TRACE_CONTENT_SECURITY_POLICY)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export function withTraceSecurityHeaders<T extends Response>(response: T): T {
  return applyTraceSecurityHeaders(response)
}

export { TRACE_CONTENT_SECURITY_POLICY }
