import { isDebugApiEnabled } from './env'

function redactAuthorization(value: string): string {
  if (/^Bearer\s+/i.test(value)) {
    return 'Bearer [REDACTED]'
  }
  return '[REDACTED]'
}

function headersInitToRedactedRecord(headers: HeadersInit): Record<string, string> {
  const h = new Headers(headers)
  const out: Record<string, string> = {}
  h.forEach((value, key) => {
    out[key] = key.toLowerCase() === 'authorization' ? redactAuthorization(value) : value
  })
  return out
}

/** Truncate large credential-offer strings in POST bodies for readable logs. */
export function sanitizeRequestBodyForLog(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body
  const o = { ...(body as Record<string, unknown>) }
  if (typeof o.offer === 'string' && o.offer.length > 200) {
    const len = o.offer.length
    o.offer = `${o.offer.slice(0, 200)}… (${len} chars total)`
  }
  return o
}

export function debugLogApiRequest(
  method: 'GET' | 'POST',
  path: string,
  init: { headers?: HeadersInit; body?: string | null }
): void {
  if (!isDebugApiEnabled()) return

  let bodyLog: unknown
  if (init.body != null && init.body !== '') {
    try {
      bodyLog = sanitizeRequestBodyForLog(JSON.parse(init.body) as unknown)
    } catch {
      bodyLog = '[non-JSON body]'
    }
  }

  console.debug(`[API] → ${method} ${path}`, {
    headers: init.headers ? headersInitToRedactedRecord(init.headers) : {},
    body: bodyLog,
  })
}

export function debugLogApiResponse(
  method: 'GET' | 'POST',
  path: string,
  response: Response,
  body: unknown
): void {
  if (!isDebugApiEnabled()) return
  console.debug(`[API] ← ${method} ${path}`, {
    status: response.status,
    ok: response.ok,
    body,
  })
}

export async function debugLogApiErrorResponse(
  method: 'GET' | 'POST',
  path: string,
  response: Response
): Promise<void> {
  if (!isDebugApiEnabled()) return
  try {
    const text = await response.clone().text()
    let body: unknown = text.length > 0 ? text : null
    if (typeof body === 'string' && body.length > 0) {
      try {
        body = JSON.parse(body) as unknown
      } catch {
        /* keep raw string */
      }
    }
    console.debug(`[API] ← ${method} ${path} (error)`, {
      status: response.status,
      body,
    })
  } catch {
    /* ignore logging failures */
  }
}

export function debugLogSse(message: string, detail?: unknown): void {
  if (!isDebugApiEnabled()) return
  if (detail !== undefined) {
    console.debug(`[SSE] ${message}`, detail)
  } else {
    console.debug(`[SSE] ${message}`)
  }
}
