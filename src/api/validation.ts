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
} from '../types/issuance'

// ---------------------------------------------------------------------------
// ContractError
// ---------------------------------------------------------------------------

export class ContractError extends Error {
  constructor(context: string, field: string, received: unknown) {
    super(
      `[ContractError] ${context}: field "${field}" is invalid. Received: ${JSON.stringify(received)}`
    )
    this.name = 'ContractError'
  }
}

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

function requireString(ctx: string, field: string, value: unknown): string {
  if (typeof value !== 'string') throw new ContractError(ctx, field, value)
  return value
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

// ---------------------------------------------------------------------------
// Enum helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// IssuerSummary
// ---------------------------------------------------------------------------

function validateIssuerSummary(raw: unknown): IssuerSummary {
  const ctx = 'IssuerSummary'
  const obj = requireObject(ctx, 'issuer', raw)
  return {
    credential_issuer: requireString(ctx, 'credential_issuer', obj.credential_issuer),
    display_name: requireStringOrNull(ctx, 'display_name', obj.display_name),
    logo_uri: requireStringOrNull(ctx, 'logo_uri', obj.logo_uri),
  }
}

// ---------------------------------------------------------------------------
// CredentialDisplay
// ---------------------------------------------------------------------------

function validateCredentialDisplay(raw: unknown): CredentialDisplay {
  const ctx = 'CredentialDisplay'
  const obj = requireObject(ctx, 'display', raw)

  const name = requireString(ctx, 'name', obj.name)

  // Optional fields — only validate type when present
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

  // logo is optional and nullable
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

// ---------------------------------------------------------------------------
// CredentialTypeDisplay
// ---------------------------------------------------------------------------

function validateCredentialTypeDisplay(
  raw: unknown,
  index: number
): CredentialTypeDisplay {
  const ctx = `CredentialTypeDisplay[${index}]`
  const obj = requireObject(ctx, 'credential_type', raw)
  return {
    credential_configuration_id: requireString(
      ctx,
      'credential_configuration_id',
      obj.credential_configuration_id
    ),
    format: requireString(ctx, 'format', obj.format),
    display: validateCredentialDisplay(obj.display),
  }
}

// ---------------------------------------------------------------------------
// TxCodeSpec
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// StartIssuanceResponse  (POST /issuance/start → 201)
// ---------------------------------------------------------------------------

export function validateStartIssuanceResponse(raw: unknown): StartIssuanceResponse {
  const ctx = 'StartIssuanceResponse'
  const obj = requireObject(ctx, 'response', raw)

  const session_id = requireString(ctx, 'session_id', obj.session_id)
  const expires_at = requireString(ctx, 'expires_at', obj.expires_at)
  const issuer = validateIssuerSummary(obj.issuer)

  const rawTypes = requireArray(ctx, 'credential_types', obj.credential_types)
  if (rawTypes.length === 0) throw new ContractError(ctx, 'credential_types', rawTypes)
  const credential_types = rawTypes.map((ct, i) => validateCredentialTypeDisplay(ct, i))

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

// ---------------------------------------------------------------------------
// CredentialRecord  (GET /credentials/{id} → 200)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CredentialListResponse  (GET /credentials → 200)
// ---------------------------------------------------------------------------

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
