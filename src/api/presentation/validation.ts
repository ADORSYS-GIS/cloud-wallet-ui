import type {
  DcqlQuery,
  MatchingCredential,
  ParsedPresentationRequest,
  StartPresentationResponse,
  VerifierMetadata,
} from '../../types/presentation'
import { ContractError } from '../validation'

const SUPPORTED_RESPONSE_TYPES = new Set(['vp_token', 'vp_token id_token'])
const SUPPORTED_RESPONSE_MODES = new Set([
  'direct_post',
  'direct_post.jwt',
  'fragment',
  'query',
])

function requireString(ctx: string, field: string, value: unknown): string {
  if (typeof value !== 'string') throw new ContractError(ctx, field, value)
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

function requireArray(ctx: string, field: string, value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new ContractError(ctx, field, value)
  return value
}

function validateVerifierMetadata(raw: unknown): VerifierMetadata {
  const ctx = 'StartPresentationResponse.verifier'
  const obj = requireObject(ctx, 'verifier', raw)
  const client_id = requireString(ctx, 'client_id', obj.client_id)

  const name = obj.name === undefined ? undefined : requireString(ctx, 'name', obj.name)
  const logo_uri =
    obj.logo_uri === undefined ? undefined : requireString(ctx, 'logo_uri', obj.logo_uri)

  return {
    client_id,
    ...(name !== undefined ? { name } : {}),
    ...(logo_uri !== undefined ? { logo_uri } : {}),
    ...(obj.client_metadata !== undefined
      ? { client_metadata: obj.client_metadata as Record<string, unknown> }
      : {}),
  }
}

function validateMatchingCredential(raw: unknown, index: number): MatchingCredential {
  const ctx = `StartPresentationResponse.matching_credentials[${index}]`
  const obj = requireObject(ctx, 'matching_credentials[]', raw)

  const credentialId = requireString(ctx, 'credentialId', obj.credentialId)
  const queryId = requireString(ctx, 'queryId', obj.queryId)
  const format = requireString(ctx, 'format', obj.format)
  const displayName =
    obj.displayName === undefined
      ? undefined
      : requireString(ctx, 'displayName', obj.displayName)

  return {
    credentialId,
    queryId,
    format,
    ...(displayName !== undefined ? { displayName } : {}),
  }
}

function validateDcqlQuery(raw: unknown): DcqlQuery {
  const ctx = 'StartPresentationResponse.request.dcql_query'
  const obj = requireObject(ctx, 'dcql_query', raw)
  const credentials = requireArray(ctx, 'credentials', obj.credentials)
  if (credentials.length === 0) {
    throw new ContractError(ctx, 'credentials', credentials)
  }
  return obj as DcqlQuery
}

/**
 * Validate the resolved OID4VP Authorization Request (§5.2 required fields).
 */
function validateParsedPresentationRequest(raw: unknown): ParsedPresentationRequest {
  const ctx = 'StartPresentationResponse.request'
  const obj = requireObject(ctx, 'request', raw)

  const client_id = requireString(ctx, 'client_id', obj.client_id)
  const nonce = requireString(ctx, 'nonce', obj.nonce)
  const response_type = requireString(ctx, 'response_type', obj.response_type)
  const response_mode = requireString(ctx, 'response_mode', obj.response_mode)

  if (!SUPPORTED_RESPONSE_TYPES.has(response_type)) {
    throw new ContractError(ctx, 'response_type', response_type)
  }
  if (!SUPPORTED_RESPONSE_MODES.has(response_mode)) {
    throw new ContractError(ctx, 'response_mode', response_mode)
  }

  const scope =
    obj.scope === undefined ? undefined : requireString(ctx, 'scope', obj.scope)
  const dcql_query =
    obj.dcql_query === undefined ? undefined : validateDcqlQuery(obj.dcql_query)

  if (!scope && !dcql_query) {
    throw new ContractError(ctx, 'dcql_query', obj.dcql_query ?? obj.scope)
  }
  if (scope && dcql_query) {
    throw new ContractError(ctx, 'scope', scope)
  }

  const state =
    obj.state === undefined ? undefined : requireString(ctx, 'state', obj.state)
  const request_uri =
    obj.request_uri === undefined
      ? undefined
      : requireString(ctx, 'request_uri', obj.request_uri)
  const request_uri_method =
    obj.request_uri_method === undefined
      ? undefined
      : requireString(ctx, 'request_uri_method', obj.request_uri_method)

  const request: ParsedPresentationRequest = {
    client_id,
    nonce,
    response_type,
    response_mode,
    ...(scope !== undefined ? { scope } : {}),
    ...(dcql_query !== undefined ? { dcql_query } : {}),
    ...(state !== undefined ? { state } : {}),
    ...(request_uri !== undefined ? { request_uri } : {}),
    ...(request_uri_method !== undefined ? { request_uri_method } : {}),
  }

  if (obj.presentation_definition !== undefined) {
    request.presentation_definition = requireObject(
      ctx,
      'presentation_definition',
      obj.presentation_definition
    )
  }
  if (obj.presentation_definition_uri !== undefined) {
    request.presentation_definition_uri = requireString(
      ctx,
      'presentation_definition_uri',
      obj.presentation_definition_uri
    )
  }

  return request
}

/**
 * Validate POST /presentation/start response against the wallet API contract.
 */
export function validateStartPresentationResponse(
  raw: unknown
): StartPresentationResponse {
  const ctx = 'StartPresentationResponse'
  const obj = requireObject(ctx, 'response', raw)

  const request = validateParsedPresentationRequest(obj.request)
  const verifier = validateVerifierMetadata(obj.verifier)
  const rawCredentials = requireArray(
    ctx,
    'matching_credentials',
    obj.matching_credentials
  )

  const matching_credentials = rawCredentials.map((entry, index) =>
    validateMatchingCredential(entry, index)
  )

  return { request, verifier, matching_credentials }
}
