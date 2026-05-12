import type {
  SseCompletedEvent,
  SseEvent,
  SseFailedEvent,
  SseFailedStep,
  SseProcessingEvent,
  SseProcessingStep,
} from '../types/issuance'

const PROCESSING_STEPS = new Set<string>([
  'exchanging_token',
  'requesting_credential',
  'awaiting_deferred_credential',
])

const FAILED_STEPS = new Set<string>([
  'offer_resolution',
  'metadata',
  'authorization',
  'token',
  'credential_request',
  'deferred_credential',
  'internal',
])

/** OpenAPI `format: uuid` for `credential_ids` items (hex UUID string). */
const UUID_STRING_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuidString(value: string): boolean {
  return UUID_STRING_RE.test(value)
}

/**
 * Validates JSON payload for `event: processing` against OpenAPI `SseProcessingEvent`.
 */
export function validateSseProcessingEvent(
  record: Record<string, unknown>
): SseProcessingEvent | null {
  if (record.event !== 'processing') return null
  if (typeof record.session_id !== 'string' || record.session_id.length === 0) return null
  if (record.state !== 'processing') return null
  if (typeof record.step !== 'string' || !PROCESSING_STEPS.has(record.step)) return null
  return {
    event: 'processing',
    session_id: record.session_id,
    state: 'processing',
    step: record.step as SseProcessingStep,
  }
}

/**
 * Validates JSON payload for `event: completed` against OpenAPI `SseCompletedEvent`.
 */
export function validateSseCompletedEvent(
  record: Record<string, unknown>
): SseCompletedEvent | null {
  if (record.event !== 'completed') return null
  if (typeof record.session_id !== 'string' || record.session_id.length === 0) return null
  if (record.state !== 'completed') return null
  if (!Array.isArray(record.credential_ids)) return null
  if (
    !record.credential_ids.every(
      (id) => typeof id === 'string' && id.length > 0 && isUuidString(id)
    )
  ) {
    return null
  }
  if (!Array.isArray(record.credential_types)) return null
  if (!record.credential_types.every((t) => typeof t === 'string' && t.length > 0)) {
    return null
  }
  if (record.credential_ids.length !== record.credential_types.length) return null
  return {
    event: 'completed',
    session_id: record.session_id,
    state: 'completed',
    credential_ids: record.credential_ids as string[],
    credential_types: record.credential_types as string[],
  }
}

/**
 * Validates JSON payload for `event: failed` against OpenAPI `SseFailedEvent`.
 */
export function validateSseFailedEvent(
  record: Record<string, unknown>
): SseFailedEvent | null {
  if (record.event !== 'failed') return null
  if (typeof record.session_id !== 'string' || record.session_id.length === 0) return null
  if (record.state !== 'failed') return null
  if (typeof record.error !== 'string' || record.error.length === 0) return null
  if (!('error_description' in record)) return null
  const ed = record.error_description
  if (ed !== null && typeof ed !== 'string') return null
  if (typeof record.step !== 'string' || !FAILED_STEPS.has(record.step)) return null
  return {
    event: 'failed',
    session_id: record.session_id,
    state: 'failed',
    error: record.error,
    error_description: ed as string | null,
    step: record.step as SseFailedStep,
  }
}

function logInvalidSseEvent(message: string, context?: Record<string, unknown>) {
  if (context !== undefined) {
    console.warn(`[useSseStream] Invalid SSE event: ${message}`, context)
  } else {
    console.warn(`[useSseStream] Invalid SSE event: ${message}`)
  }
}

/**
 * Merges the SSE frame `event:` line with parsed `data:` JSON and validates
 * against the OpenAPI `SseEvent` union. Invalid payloads return `null` and log
 * a console warning (see `useSseStream` hook docs).
 */
export function parseValidatedSsePayload(
  eventLineType: string,
  payload: Record<string, unknown>
): SseEvent | null {
  const merged: Record<string, unknown> = { ...payload, event: eventLineType }

  switch (eventLineType) {
    case 'processing': {
      const v = validateSseProcessingEvent(merged)
      if (!v) {
        logInvalidSseEvent('processing payload failed OpenAPI validation', merged)
        return null
      }
      return v
    }
    case 'completed': {
      const v = validateSseCompletedEvent(merged)
      if (!v) {
        logInvalidSseEvent('completed payload failed OpenAPI validation', merged)
        return null
      }
      return v
    }
    case 'failed': {
      const v = validateSseFailedEvent(merged)
      if (!v) {
        logInvalidSseEvent('failed payload failed OpenAPI validation', merged)
        return null
      }
      return v
    }
    default:
      logInvalidSseEvent(`unsupported event type "${eventLineType}"`)
      return null
  }
}
