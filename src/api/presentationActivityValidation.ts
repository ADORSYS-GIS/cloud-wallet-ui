import { ContractError } from './validation'
import type {
  PresentationActivityListResponse,
  PresentationActivityRecord,
  PresentationActivityVerifier,
} from '../types/presentationActivity'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function requireObject(
  ctx: string,
  field: string,
  value: unknown
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new ContractError(ctx, field, value)
  return value as Record<string, unknown>
}

function requireString(ctx: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || value.length === 0)
    throw new ContractError(ctx, field, value)
  return value
}

function requireStringOrNull(ctx: string, field: string, value: unknown): string | null {
  if (value !== null && typeof value !== 'string')
    throw new ContractError(ctx, field, value)
  return value as string | null
}

function requireNumber(ctx: string, field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new ContractError(ctx, field, value)
  return value
}

function requireArray(ctx: string, field: string, value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new ContractError(ctx, field, value)
  return value
}

function requireDateTimeString(ctx: string, field: string, value: unknown): string {
  const dateTime = requireString(ctx, field, value)
  if (!Number.isFinite(Date.parse(dateTime))) {
    throw new ContractError(ctx, field, value)
  }
  return dateTime
}

function validatePresentationActivityVerifier(
  raw: unknown
): PresentationActivityVerifier {
  const ctx = 'PresentationActivityVerifier'
  const obj = requireObject(ctx, 'verifier', raw)
  const client_id = requireString(ctx, 'client_id', obj.client_id)
  const name =
    obj.name !== undefined ? requireStringOrNull(ctx, 'name', obj.name) : undefined
  const logo_uri =
    obj.logo_uri !== undefined
      ? requireStringOrNull(ctx, 'logo_uri', obj.logo_uri)
      : undefined
  return { client_id, name, logo_uri }
}

export function validatePresentationActivityRecord(
  raw: unknown
): PresentationActivityRecord {
  const ctx = 'PresentationActivityRecord'
  const obj = requireObject(ctx, 'record', raw)
  const id = requireString(ctx, 'id', obj.id)
  if (!UUID_RE.test(id)) throw new ContractError(ctx, 'id', id)

  const presented_at = requireDateTimeString(ctx, 'presented_at', obj.presented_at)
  const verifier = validatePresentationActivityVerifier(obj.verifier)

  const rawTypes = requireArray(ctx, 'credential_types', obj.credential_types)
  const credential_types = rawTypes.map((t, i) =>
    requireString(`${ctx}.credential_types[${i}]`, 'credential_type', t)
  )

  const disclosed_claim_count = requireNumber(
    ctx,
    'disclosed_claim_count',
    obj.disclosed_claim_count
  )
  if (disclosed_claim_count < 0 || !Number.isInteger(disclosed_claim_count)) {
    throw new ContractError(ctx, 'disclosed_claim_count', disclosed_claim_count)
  }

  return {
    id,
    presented_at,
    verifier,
    credential_types,
    disclosed_claim_count,
  }
}

export function validatePresentationActivityListResponse(
  raw: unknown
): PresentationActivityListResponse {
  const ctx = 'PresentationActivityListResponse'
  const obj = requireObject(ctx, 'response', raw)
  const rawItems = requireArray(ctx, 'items', obj.items)
  const items = rawItems.map((item, i) => {
    try {
      return validatePresentationActivityRecord(item)
    } catch (err) {
      throw new Error(
        `[ContractError] items[${i}]: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  })

  return {
    items,
    total: requireNumber(ctx, 'total', obj.total),
    page: requireNumber(ctx, 'page', obj.page),
    page_size: requireNumber(ctx, 'page_size', obj.page_size),
  }
}
