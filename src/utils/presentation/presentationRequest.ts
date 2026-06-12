import type {
  PresentationAuthorizationRequest,
  PresentationError,
} from '../../types/presentation'

const SUPPORTED_RESPONSE_TYPES = new Set(['vp_token', 'vp_token id_token'])
const SUPPORTED_RESPONSE_MODES = new Set([
  'direct_post',
  'direct_post.jwt',
  'fragment',
  'query',
])
const MAX_REQUEST_URI_LENGTH = 4096
const MAX_CLIENT_ID_LENGTH = 2048

export type ParsedPresentationRequestParams =
  | { ok: true; authorization: PresentationAuthorizationRequest }
  | { ok: false; error: PresentationError }

function invalidRequest(message: string): ParsedPresentationRequestParams {
  return {
    ok: false,
    error: {
      httpStatus: 400,
      code: 'invalid_request',
      message,
      error_description: null,
    },
  }
}

function pickOptionalParam(
  searchParams: URLSearchParams,
  key: string
): string | undefined {
  const value = searchParams.get(key)?.trim()
  return value || undefined
}

/** `request_uri` and `client_metadata_uri` must be HTTPS per OID4VP security requirements. */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function isJwtStructure(value: string): boolean {
  const parts = value.split('.')
  return parts.length === 3 && parts.every((part) => part.length > 0)
}

function normalizeRequestUriMethod(
  value: string
): NonNullable<PresentationAuthorizationRequest['request_uri_method']> | null {
  const normalized = value.toUpperCase()
  if (normalized === 'GET' || normalized === 'POST') {
    return normalized
  }
  return null
}

function isValidClientId(value: string): boolean {
  if (value.length > MAX_CLIENT_ID_LENGTH) {
    return false
  }
  if (value.startsWith('https://')) {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }
  const knownPrefixes = ['did:', 'x509_san_dns:', 'x509_hash:', 'urn:']
  if (knownPrefixes.some((prefix) => value.startsWith(prefix))) {
    return true
  }
  // Opaque client_id values are permitted; backend performs authoritative validation.
  return value.length > 0 && !/\s/.test(value)
}

/**
 * Parse and validate OpenID4VP authorization request query parameters.
 * @see https://github.com/ADORSYS-GIS/cloud-wallet-ui/issues/84
 * @see https://openid.net/specs/openid-4-verifiable-presentations-1_0.html
 */
export function parsePresentationRequestParams(
  searchParams: URLSearchParams
): ParsedPresentationRequestParams {
  const client_id = searchParams.get('client_id')?.trim()
  if (!client_id) {
    return invalidRequest('Missing required parameter: client_id.')
  }
  if (!isValidClientId(client_id)) {
    return invalidRequest('Invalid client_id format.')
  }

  const request_uri = pickOptionalParam(searchParams, 'request_uri')
  const request = pickOptionalParam(searchParams, 'request')
  if (!request_uri && !request) {
    return invalidRequest('One of request_uri or request is required.')
  }
  if (request_uri && request) {
    return invalidRequest('Provide either request_uri or request, not both.')
  }

  if (request_uri) {
    if (request_uri.length > MAX_REQUEST_URI_LENGTH) {
      return invalidRequest('request_uri exceeds maximum allowed length.')
    }
    if (!isHttpsUrl(request_uri)) {
      return invalidRequest('Invalid request_uri format. Expected an https URL.')
    }
  }

  if (request && !isJwtStructure(request)) {
    return invalidRequest(
      'Invalid request format. Expected a JWT (header.payload.signature).'
    )
  }

  const requestUriMethodRaw = pickOptionalParam(searchParams, 'request_uri_method')
  let request_uri_method: PresentationAuthorizationRequest['request_uri_method']
  if (requestUriMethodRaw) {
    const normalized = normalizeRequestUriMethod(requestUriMethodRaw)
    if (!normalized) {
      return invalidRequest('Unsupported request_uri_method. Expected GET or POST.')
    }
    request_uri_method = normalized
  }
  if (request_uri_method && !request_uri) {
    return invalidRequest('request_uri_method is only valid with request_uri.')
  }

  const response_type = searchParams.get('response_type')?.trim()
  const nonce = searchParams.get('nonce')?.trim()
  const scope = pickOptionalParam(searchParams, 'scope')
  const dcql_query = pickOptionalParam(searchParams, 'dcql_query')

  // JAR flows (`request_uri` or signed `request`): response_type, nonce, and
  // scope/dcql_query may live inside the fetched or embedded JWT. We do not
  // decode the JWT client-side; POST /presentation/start resolves and validates
  // the full authorization request server-side.
  const isJarFlow = Boolean(request_uri || request)

  if (!isJarFlow) {
    if (!response_type) {
      return invalidRequest('Missing required parameter: response_type.')
    }
    if (!nonce) {
      return invalidRequest('Missing required parameter: nonce.')
    }
    if (!scope && !dcql_query) {
      return invalidRequest('One of scope or dcql_query is required.')
    }
  }

  if (response_type && !SUPPORTED_RESPONSE_TYPES.has(response_type)) {
    return invalidRequest(
      'Unsupported response_type. Expected vp_token or vp_token id_token.'
    )
  }

  if (scope && dcql_query) {
    return invalidRequest('Provide either scope or dcql_query, not both.')
  }

  const state = pickOptionalParam(searchParams, 'state')

  const response_mode = pickOptionalParam(searchParams, 'response_mode')
  if (response_mode && !SUPPORTED_RESPONSE_MODES.has(response_mode)) {
    return invalidRequest(`Unsupported response_mode: ${response_mode}.`)
  }

  const client_metadata_uri = pickOptionalParam(searchParams, 'client_metadata_uri')
  if (client_metadata_uri && !isHttpsUrl(client_metadata_uri)) {
    return invalidRequest('Invalid client_metadata_uri format. Expected an https URL.')
  }

  const authorization: PresentationAuthorizationRequest = { client_id }

  if (request_uri) authorization.request_uri = request_uri
  if (request) authorization.request = request
  if (request_uri_method) authorization.request_uri_method = request_uri_method
  if (response_type) authorization.response_type = response_type
  if (nonce) authorization.nonce = nonce

  if (state) authorization.state = state
  if (response_mode) authorization.response_mode = response_mode
  if (scope) authorization.scope = scope
  if (dcql_query) authorization.dcql_query = dcql_query

  const client_metadata = pickOptionalParam(searchParams, 'client_metadata')
  if (client_metadata) authorization.client_metadata = client_metadata
  if (client_metadata_uri) authorization.client_metadata_uri = client_metadata_uri

  return { ok: true, authorization }
}

/** Build an internal `/present` route from authorization params (used after QR scan). */
export function presentationRequestPath(
  authorization: PresentationAuthorizationRequest
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(authorization)) {
    if (value !== undefined) {
      params.set(key, value)
    }
  }
  return `/present?${params.toString()}`
}
