import { useCallback, useRef, useState } from 'react'
import { debugLogSse } from '../utils/debugApiLogger'
import { getApiBaseUrl } from '../utils/env'
import { getBearerToken } from '../auth/authService'
import type { ConsentResponse, SseEvent } from '../types/issuance'
import { parseValidatedSsePayload } from '../api/validation'

export type SseStreamStatus =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'processing'; step: string }
  | { status: 'completed'; credentialIds: string[]; credentialTypes: string[] }
  | { status: 'failed'; error: string; errorDescription: string | null; step: string }

export type UseSseStreamReturn = {
  streamStatus: SseStreamStatus
  openStream: (sessionId: string) => void
  closeStream: () => void
}

/**
 * Parse a single SSE frame (text between double-newline boundaries).
 * Expects: `event: <type>` + `data: <json>` lines.
 *
 * After JSON parse, the payload is validated against OpenAPI `SseProcessingEvent`,
 * `SseCompletedEvent`, and `SseFailedEvent` (see `parseValidatedSsePayload`).
 * The `event:` line is the source of truth for the event kind; it is merged as
 * `event` over the parsed object so a conflicting `event` field in JSON cannot
 * override the frame.
 *
 * Invalid frames (malformed JSON, unknown `event:` type, or schema mismatch)
 * return `null` and emit `console.warn` — the stream reader continues so the
 * app does not crash.
 */
function parseSseFrame(raw: string): SseEvent | null {
  const lines = raw.split('\n')
  let eventType = ''
  let dataStr = ''

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      dataStr = line.slice('data:'.length).trim()
    }
  }

  if (!eventType || !dataStr) return null

  try {
    const payload = JSON.parse(dataStr) as Record<string, unknown>
    return parseValidatedSsePayload(eventType, payload)
  } catch (error) {
    const dataPreview =
      dataStr.length > 512 ? `${dataStr.slice(0, 512)}… (truncated)` : dataStr
    console.warn('[useSseStream] Invalid SSE event: malformed JSON in data line', {
      eventType,
      dataPreview,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Hook that manages an SSE connection for real-time issuance session updates.
 *
 * Spec: GET /issuance/{session_id}/events
 * Auth: BearerAuth (global, per OpenAPI spec — Authorization: Bearer <jwt>)
 *
 * The native browser EventSource API does not support custom request headers
 * and therefore cannot satisfy the spec's BearerAuth requirement. This
 * implementation uses fetch() + ReadableStream instead, which allows the
 * Authorization: Bearer header to be sent on the SSE request exactly as the
 * OpenAPI contract specifies.
 *
 * The frontend MUST open this stream immediately after receiving a successful
 * /consent response and maintain the connection until a terminal event
 * (completed or failed) is received.
 *
 * **SSE validation:** Each `data:` JSON object is validated to match the
 * OpenAPI event schemas before updating React state. Non-conforming events are
 * ignored after `console.warn` so bad server output cannot throw inside the
 * reader loop.
 *
 * When `VITE_DEBUG_API=true`, SSE requests (redacted auth), HTTP response status,
 * and parsed event payloads are logged via `console.debug`.
 */
export function useSseStream(): UseSseStreamReturn {
  const [streamStatus, setStreamStatus] = useState<SseStreamStatus>({ status: 'idle' })
  const abortControllerRef = useRef<AbortController | null>(null)

  const closeStream = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  const openStream = useCallback(
    (sessionId: string) => {
      closeStream()
      setStreamStatus({ status: 'connecting' })

      const controller = new AbortController()
      abortControllerRef.current = controller

      void (async () => {
        // Obtain the bearer JWT before opening the connection so the
        // Authorization header can be sent on the very first request,
        // exactly as the OpenAPI BearerAuth security scheme requires.
        let token: string
        try {
          token = await getBearerToken()
        } catch {
          setStreamStatus({
            status: 'failed',
            error: 'unauthorized',
            errorDescription: 'Could not obtain authentication token for SSE stream.',
            step: 'internal',
          })
          return
        }

        const url = `${getApiBaseUrl()}/issuance/${encodeURIComponent(sessionId)}/events`

        debugLogSse('request', {
          method: 'GET',
          url,
          headers: {
            Authorization: 'Bearer [REDACTED]',
            Accept: 'text/event-stream',
          },
        })

        let response: Response
        try {
          response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'text/event-stream',
            },
            signal: controller.signal,
          })
        } catch {
          if (controller.signal.aborted) return
          setStreamStatus({
            status: 'failed',
            error: 'internal_error',
            errorDescription: 'Connection to server lost.',
            step: 'internal',
          })
          return
        }

        debugLogSse('response', { status: response.status, ok: response.ok })

        if (!response.ok) {
          setStreamStatus({
            status: 'failed',
            error: response.status === 401 ? 'unauthorized' : 'internal_error',
            errorDescription:
              response.status === 401
                ? 'Authentication failed for SSE stream.'
                : `SSE connection failed with status ${response.status}.`,
            step: 'internal',
          })
          return
        }

        if (!response.body) {
          setStreamStatus({
            status: 'failed',
            error: 'internal_error',
            errorDescription: 'SSE response body is unavailable.',
            step: 'internal',
          })
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done || controller.signal.aborted) break

            buffer += decoder.decode(value, { stream: true })

            // SSE frames are delimited by double newlines.
            const frames = buffer.split(/\n\n/)
            // Retain the last (potentially incomplete) chunk in the buffer.
            buffer = frames.pop() ?? ''

            for (const frame of frames) {
              if (!frame.trim()) continue
              const event = parseSseFrame(frame)
              if (!event) continue

              debugLogSse(`event:${event.event}`, event)

              if (event.event === 'processing') {
                setStreamStatus({ status: 'processing', step: event.step })
              } else if (event.event === 'completed') {
                setStreamStatus({
                  status: 'completed',
                  credentialIds: event.credential_ids,
                  credentialTypes: event.credential_types,
                })
                return
              } else if (event.event === 'failed') {
                setStreamStatus({
                  status: 'failed',
                  error: event.error,
                  errorDescription: event.error_description,
                  step: event.step,
                })
                return
              }
            }
          }
        } catch {
          if (controller.signal.aborted) return
          setStreamStatus({
            status: 'failed',
            error: 'internal_error',
            errorDescription: 'Connection to server lost.',
            step: 'internal',
          })
        } finally {
          reader.releaseLock()
        }
      })()
    },
    [closeStream]
  )

  return { streamStatus, openStream, closeStream }
}

/**
 * Hook that orchestrates the full post-consent flow:
 * 1. Submit consent via POST /issuance/{session_id}/consent
 * 2. Open SSE stream
 * 3. Handle next_action (redirect / provide_tx_code / none)
 */
export type ConsentFlowStatus =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'awaiting_redirect'; authorizationUrl: string }
  | { status: 'awaiting_tx_code' }
  | { status: 'processing'; step: string }
  | { status: 'completed'; credentialIds: string[]; credentialTypes: string[] }
  | { status: 'rejected' }
  | { status: 'failed'; error: string; errorDescription: string | null }

export type UseConsentFlowReturn = {
  consentStatus: ConsentFlowStatus
  handleConsentResponse: (response: ConsentResponse, sessionId: string) => void
  updateFromSse: (streamStatus: SseStreamStatus) => void
  reset: () => void
}

export function useConsentFlow(): UseConsentFlowReturn {
  const [consentStatus, setConsentStatus] = useState<ConsentFlowStatus>({
    status: 'idle',
  })

  const handleConsentResponse = useCallback((response: ConsentResponse) => {
    switch (response.next_action) {
      case 'redirect':
        setConsentStatus({
          status: 'awaiting_redirect',
          authorizationUrl: response.authorization_url ?? '',
        })
        break
      case 'provide_tx_code':
        setConsentStatus({ status: 'awaiting_tx_code' })
        break
      case 'none':
        setConsentStatus({ status: 'processing', step: '' })
        break
      case 'rejected':
        setConsentStatus({ status: 'rejected' })
        break
    }
  }, [])

  const updateFromSse = useCallback((ss: SseStreamStatus) => {
    if (ss.status === 'processing') {
      setConsentStatus({ status: 'processing', step: ss.step })
    } else if (ss.status === 'completed') {
      setConsentStatus({
        status: 'completed',
        credentialIds: ss.credentialIds,
        credentialTypes: ss.credentialTypes,
      })
    } else if (ss.status === 'failed') {
      setConsentStatus({
        status: 'failed',
        error: ss.error,
        errorDescription: ss.errorDescription,
      })
    }
  }, [])

  const reset = useCallback(() => {
    setConsentStatus({ status: 'idle' })
  }, [])

  return { consentStatus, handleConsentResponse, updateFromSse, reset }
}
