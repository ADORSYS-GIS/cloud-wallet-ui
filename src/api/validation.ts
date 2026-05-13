/**
 * API contract validation layer.
 *
 * Provides lightweight runtime guards that verify API responses conform to the
 * OpenAPI spec before they reach the rest of the application. This prevents
 * silent contract drift where a backend change would propagate as subtle bugs.
 *
 * Design principles:
 * - Guards are plain TypeScript functions — no external schema library needed.
 * - Each guard throws a descriptive `ContractError` on violation.
 * - Guards are called at the API boundary, inside the dedicated `api/` modules.
 * - Only the fields required by the spec are validated; `additionalProperties`
 *   (e.g. `claims`) are passed through as-is.
 *
 * **SSE issuance events** (`validateSseProcessingEvent`, `parseValidatedSsePayload`,
 * etc.): same OpenAPI shapes, but invalid frames return `null` and log
 * `console.warn` instead of throwing. That fits streaming in `useSseStream` —
 * one malformed event must not tear down the reader loop, unlike a single REST
 * body where `ContractError` is appropriate.
 */

import type {
  CredentialListResponse,
  CredentialRecord,
  CredentialStatus,
  CredentialFormat,
} from '../types/credential'
import type {
  StartIssuanceResponse,
  IssuerSummary,
  CredentialTypeDisplay,
  CredentialDisplay,
  TxCodeSpec,
  IssuanceFlow,
  SseCompletedEvent,
  SseEvent,
  SseFailedEvent,
  SseFailedStep,
  SseProcessingEvent,
  SseProcessingStep,
} from '../types/issuance'

export class ContractError extends Error {
  constructor(context: string, field: string, received: unknown) {
    super(
      `[ContractError] ${context}: field "${field}" is invalid. Received: ${JSON.stringify(received)}`
    )
    this.name = 'ContractError'
  }
}

function requireString(ctx: string, field: string, value: unknown): string {
  if (typeof value !== 'string') throw new ContractError(ctx, field, value)
  return value
}

function requireDateTimeString(ctx: string, field: string, value: unknown): string {
  const dateTime = requireString(ctx, field, value)
  if (!Number.isFinite(Date.parse(dateTime))) {
    throw new ContractError(ctx, field, value)
  }
  return dateTime
}

function requireStringOrNull(ctx: string, field: string, value: unknown): string | null {
  if (value !== null && typeof value !== 'string')
    throw new ContractError(ctx, field, value)
  return value as string | null
}

function requireBoolean(ctx: string, field: string, value: unknown): boolean {
  if (typeof value !== 'boolean') throw new ContractError(ctx, field, value)
  return value
}

function requireNumberOrNull(ctx: string, field: string, value: unknown): number | null {
  if (value !== null && typeof value !== 'number')
    throw new ContractError(ctx, field, value)
  return value as number | null
}

function requireArray(ctx: string, field: string, value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new ContractError(ctx, field, value)
  return value
}

function requireObject(
  ctx: string,
  field: string,
  value: unknown
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new ContractError(ctx, field, value)
  return value as Record<string, unknown>
}

const CREDENTIAL_STATUSES: CredentialStatus[] = [
  'active',
  'expired',
  'revoked',
  'suspended',
]
const CREDENTIAL_FORMATS: CredentialFormat[] = [
  'dc+sd-jwt',
  'mso_mdoc',
  'jwt_vc_json',
  'jwt_vc_json-ld',
  'ldp_vc',
]
const ISSUANCE_FLOWS: IssuanceFlow[] = ['authorization_code', 'pre_authorized_code']
const TX_CODE_INPUT_MODES = ['numeric', 'text'] as const

function validateIssuerSummary(raw: unknown): IssuerSummary {
  const ctx = 'IssuerSummary'
  const obj = requireObject(ctx, 'issuer', raw)
  return {
    credential_issuer: requireString(ctx, 'credential_issuer', obj.credential_issuer),
    display_name: requireStringOrNull(ctx, 'display_name', obj.display_name),
    logo_uri: requireStringOrNull(ctx, 'logo_uri', obj.logo_uri),
  }
}

function validateCredentialDisplay(raw: unknown): CredentialDisplay {
  const ctx = 'CredentialDisplay'
  const obj = requireObject(ctx, 'display', raw)

  const name = requireString(ctx, 'name', obj.name)

  const description =
    obj.description !== undefined
      ? requireString(ctx, 'description', obj.description)
      : undefined
  const background_color =
    obj.background_color !== undefined
      ? requireString(ctx, 'background_color', obj.background_color)
      : undefined
  const text_color =
    obj.text_color !== undefined
      ? requireString(ctx, 'text_color', obj.text_color)
      : undefined

  let logo: CredentialDisplay['logo'] = undefined
  if (obj.logo !== undefined && obj.logo !== null) {
    const logoObj = requireObject(ctx, 'logo', obj.logo)
    logo = {
      uri: requireString(ctx, 'logo.uri', logoObj.uri),
      alt_text:
        logoObj.alt_text !== undefined
          ? requireString(ctx, 'logo.alt_text', logoObj.alt_text)
          : undefined,
    }
  } else if (obj.logo === null) {
    logo = null
  }

  return { name, description, background_color, text_color, logo }
}

function validateCredentialTypeDisplay(
  raw: unknown,
  index: number,
  fallback_name: string
): CredentialTypeDisplay {
  const ctx = `CredentialTypeDisplay[${index}]`
  const obj = requireObject(ctx, 'credential_type', raw)
  const id = requireString(
    ctx,
    'credential_configuration_id',
    obj.credential_configuration_id
  )

  // Handle null display by providing a default
  let display: CredentialDisplay
  if (obj.display === null || obj.display === undefined) {
    display = { name: fallback_name }
  } else {
    display = validateCredentialDisplay(obj.display)
  }

  return {
    credential_configuration_id: id,
    format: requireString(ctx, 'format', obj.format),
    display,
  }
}

function validateTxCodeSpec(raw: unknown): TxCodeSpec {
  const ctx = 'TxCodeSpec'
  const obj = requireObject(ctx, 'tx_code', raw)

  const input_mode = requireString(ctx, 'input_mode', obj.input_mode)
  if (!TX_CODE_INPUT_MODES.includes(input_mode as 'numeric' | 'text')) {
    throw new ContractError(ctx, 'input_mode', input_mode)
  }

  return {
    input_mode: input_mode as TxCodeSpec['input_mode'],
    length: requireNumberOrNull(ctx, 'length', obj.length),
    description: requireStringOrNull(ctx, 'description', obj.description),
  }
}

export function validateStartIssuanceResponse(raw: unknown): StartIssuanceResponse {
  const ctx = 'StartIssuanceResponse'
  const obj = requireObject(ctx, 'response', raw)

  const session_id = requireString(ctx, 'session_id', obj.session_id)
  const expires_at = requireDateTimeString(ctx, 'expires_at', obj.expires_at)
  const issuer = validateIssuerSummary(obj.issuer)

  const rawTypes = requireArray(ctx, 'credential_types', obj.credential_types)
  if (rawTypes.length === 0) throw new ContractError(ctx, 'credential_types', rawTypes)
  const credential_types = rawTypes.map((ct, i) => {
    // Extract id first to handle null display fallback
    const ctObj = requireObject(`credential_types[${i}]`, 'credential_type', ct)
    const id = requireString(
      `credential_types[${i}]`,
      'credential_configuration_id',
      ctObj.credential_configuration_id
    )
    return validateCredentialTypeDisplay(ct, i, id)
  })

  const flow = requireString(ctx, 'flow', obj.flow)
  if (!ISSUANCE_FLOWS.includes(flow as IssuanceFlow))
    throw new ContractError(ctx, 'flow', flow)

  const tx_code_required = requireBoolean(ctx, 'tx_code_required', obj.tx_code_required)

  let tx_code: TxCodeSpec | null = null
  if (obj.tx_code !== null && obj.tx_code !== undefined) {
    tx_code = validateTxCodeSpec(obj.tx_code)
  }

  return {
    session_id,
    expires_at,
    issuer,
    credential_types,
    flow: flow as IssuanceFlow,
    tx_code_required,
    tx_code,
  }
}

export function validateCredentialRecord(raw: unknown): CredentialRecord {
  const ctx = 'CredentialRecord'
  const obj = requireObject(ctx, 'response', raw)

  const status = requireString(ctx, 'status', obj.status)
  if (!CREDENTIAL_STATUSES.includes(status as CredentialStatus))
    throw new ContractError(ctx, 'status', status)

  const format = requireString(ctx, 'format', obj.format)
  if (!CREDENTIAL_FORMATS.includes(format as CredentialFormat))
    throw new ContractError(ctx, 'format', format)

  const claims = requireObject(ctx, 'claims', obj.claims)

  return {
    id: requireString(ctx, 'id', obj.id),
    credential_configuration_id: requireString(
      ctx,
      'credential_configuration_id',
      obj.credential_configuration_id
    ),
    format: format as CredentialFormat,
    issuer: requireString(ctx, 'issuer', obj.issuer),
    status: status as CredentialStatus,
    issued_at: requireString(ctx, 'issued_at', obj.issued_at),
    expires_at: requireStringOrNull(ctx, 'expires_at', obj.expires_at),
    claims,
  }
}

export function validateCredentialListResponse(raw: unknown): CredentialListResponse {
  const ctx = 'CredentialListResponse'
  const obj = requireObject(ctx, 'response', raw)
  const rawCreds = requireArray(ctx, 'credentials', obj.credentials)
  return {
    credentials: rawCreds.map((c, i) => {
      try {
        return validateCredentialRecord(c)
      } catch (err) {
        throw new Error(
          `[ContractError] credentials[${i}]: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }),
  }
}

// --- SSE issuance stream (GET …/events): null + warn, not ContractError ---

const SSE_PROCESSING_STEPS = new Set<string>([
  'exchanging_token',
  'requesting_credential',
  'awaiting_deferred_credential',
])

const SSE_FAILED_STEPS = new Set<string>([
  'offer_resolution',
  'metadata',
  'authorization',
  'token',
  'credential_request',
  'deferred_credential',
  'internal',
])

/** OpenAPI `format: uuid` for `credential_ids` items (hex UUID string). */
const SSE_UUID_STRING_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sseIsUuidString(value: string): boolean {
  return SSE_UUID_STRING_RE.test(value)
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
  if (typeof record.step !== 'string' || !SSE_PROCESSING_STEPS.has(record.step))
    return null
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
      (id) => typeof id === 'string' && id.length > 0 && sseIsUuidString(id)
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
  if (typeof record.step !== 'string' || !SSE_FAILED_STEPS.has(record.step)) return null
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
