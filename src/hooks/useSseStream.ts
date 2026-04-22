import { useCallback, useRef, useState } from 'react'
import { getApiBaseUrl } from '../utils/env'
import type { SseEvent, SseCompletedEvent, SseFailedEvent } from '../types/issuance'

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
 * Parse a raw SSE frame string into an SseEvent.
 * SSE frames look like:
 *   event: processing\ndata: {...}\n\n
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
    return { event: eventType, ...payload } as SseEvent
  } catch {
    return null
  }
}

/**
 * Hook that manages an SSE connection for real-time issuance session updates.
 *
 * Spec: GET /issuance/{session_id}/events
 *
 * The frontend MUST open this stream immediately after receiving a successful
 * /consent response and maintain the connection until a terminal event
 * (completed or failed) is received.
 */
export function useSseStream(): UseSseStreamReturn {
  const [streamStatus, setStreamStatus] = useState<SseStreamStatus>({ status: 'idle' })
  const esRef = useRef<EventSource | null>(null)

  const closeStream = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
  }, [])

  const openStream = useCallback(
    (sessionId: string) => {
      closeStream()
      setStreamStatus({ status: 'connecting' })

      const url = `${getApiBaseUrl()}/issuance/${encodeURIComponent(sessionId)}/events`
      const es = new EventSource(url)
      esRef.current = es

      const handleEvent = (type: string, data: string) => {
        const frame = parseSseFrame(`event: ${type}\ndata: ${data}`)
        if (!frame) return

        if (frame.event === 'processing') {
          const e = frame as SseProcessingFrame
          setStreamStatus({ status: 'processing', step: e.step ?? '' })
        } else if (frame.event === 'completed') {
          const e = frame as SseCompletedEvent
          setStreamStatus({
            status: 'completed',
            credentialIds: e.credential_ids,
            credentialTypes: e.credential_types,
          })
          closeStream()
        } else if (frame.event === 'failed') {
          const e = frame as SseFailedEvent
          setStreamStatus({
            status: 'failed',
            error: e.error,
            errorDescription: e.error_description,
            step: e.step,
          })
          closeStream()
        }
      }

      es.addEventListener('processing', (ev: MessageEvent) => {
        handleEvent('processing', ev.data as string)
      })
      es.addEventListener('completed', (ev: MessageEvent) => {
        handleEvent('completed', ev.data as string)
      })
      es.addEventListener('failed', (ev: MessageEvent) => {
        handleEvent('failed', ev.data as string)
      })

      es.onerror = () => {
        setStreamStatus({
          status: 'failed',
          error: 'internal_error',
          errorDescription: 'Connection to server lost.',
          step: 'internal',
        })
        closeStream()
      }
    },
    [closeStream]
  )

  return { streamStatus, openStream, closeStream }
}

// Internal type alias used above
type SseProcessingFrame = { event: string; step: string }
