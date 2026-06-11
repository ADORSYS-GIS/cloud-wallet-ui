import type {
  CredentialCandidate,
  CredentialMatch,
  CredentialSummaryDisplay,
  PresentationConsentResponse,
  RequestedClaim,
  StartPresentationResponse,
  TransactionDataDisplay,
  VerifierDisplay,
  VerifierVerificationMethod,
} from '../../types/presentation'
import { ContractError } from '../validation'

const VERIFICATION_METHODS = new Set<VerifierVerificationMethod>([
  'pre-registered',
  'decentralized_identifier',
  'redirect_uri',
  'verifier_attestation',
  'x509_san_dns',
  'x509_san_uri',
  'x509_hash',
  'openid_federation',
])

function requireString(ctx: string, field: string, value: unknown): string {
  if (typeof value !== 'string') throw new ContractError(ctx, field, value)
  return value
}

function requireBoolean(ctx: string, field: string, value: unknown): boolean {
  if (typeof value !== 'boolean') throw new ContractError(ctx, field, value)
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

function optionalString(ctx: string, field: string, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  return requireString(ctx, field, value)
}

function optionalNullableString(
  ctx: string,
  field: string,
  value: unknown
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return requireString(ctx, field, value)
}

function validateClaimsPath(
  ctx: string,
  field: string,
  value: unknown
): RequestedClaim['path'] {
  const path = requireArray(ctx, field, value)
  return path as RequestedClaim['path']
}

function validateCredentialSummaryDisplay(
  raw: unknown,
  ctx: string
): CredentialSummaryDisplay {
  const obj = requireObject(ctx, 'display', raw)
  const name = requireString(ctx, 'display.name', obj.name)

  const display: CredentialSummaryDisplay = { name }

  const description = optionalString(ctx, 'display.description', obj.description)
  if (description) display.description = description

  const issuer_name = optionalString(ctx, 'display.issuer_name', obj.issuer_name)
  if (issuer_name) display.issuer_name = issuer_name

  const credential_type = optionalString(
    ctx,
    'display.credential_type',
    obj.credential_type
  )
  if (credential_type) display.credential_type = credential_type

  const background_color = optionalString(
    ctx,
    'display.background_color',
    obj.background_color
  )
  if (background_color) display.background_color = background_color

  const text_color = optionalString(ctx, 'display.text_color', obj.text_color)
  if (text_color) display.text_color = text_color

  if (obj.logo !== undefined && obj.logo !== null) {
    const logoObj = requireObject(ctx, 'display.logo', obj.logo)
    display.logo = {
      uri: requireString(ctx, 'display.logo.uri', logoObj.uri),
      ...(logoObj.alt_text !== undefined
        ? { alt_text: requireString(ctx, 'display.logo.alt_text', logoObj.alt_text) }
        : {}),
    }
  } else if (obj.logo === null) {
    display.logo = null
  }

  return display
}

function validateRequestedClaim(raw: unknown, index: number): RequestedClaim {
  const ctx = `requested_claims[${index}]`
  const obj = requireObject(ctx, 'requested_claims[]', raw)
  const path = validateClaimsPath(ctx, 'path', obj.path)

  const display_name = optionalNullableString(ctx, 'display_name', obj.display_name)
  const value_required =
    obj.value_required === undefined
      ? undefined
      : requireBoolean(ctx, 'value_required', obj.value_required)
  return {
    path,
    ...(display_name !== undefined ? { display_name } : {}),
    ...(value_required !== undefined ? { value_required } : {}),
  }
}

function validateCredentialCandidate(raw: unknown, index: number): CredentialCandidate {
  const ctx = `candidates[${index}]`
  const obj = requireObject(ctx, 'candidates[]', raw)
  const credential_id = requireString(ctx, 'credential_id', obj.credential_id)
  const display = validateCredentialSummaryDisplay(obj.display, ctx)
  const rawClaims = requireArray(ctx, 'requested_claims', obj.requested_claims)
  const requested_claims = rawClaims.map((claim, claimIndex) =>
    validateRequestedClaim(claim, claimIndex)
  )

  return { credential_id, display, requested_claims }
}

function validateCredentialMatch(raw: unknown, index: number): CredentialMatch {
  const ctx = `credential_matches[${index}]`
  const obj = requireObject(ctx, 'credential_matches[]', raw)
  const query_id = requireString(ctx, 'query_id', obj.query_id)
  const required = requireBoolean(ctx, 'required', obj.required)
  const rawCandidates = requireArray(ctx, 'candidates', obj.candidates)
  const candidates = rawCandidates.map((candidate, candidateIndex) =>
    validateCredentialCandidate(candidate, candidateIndex)
  )

  return { query_id, required, candidates }
}

function validateVerifierDisplay(raw: unknown): VerifierDisplay {
  const ctx = 'StartPresentationResponse.verifier'
  const obj = requireObject(ctx, 'verifier', raw)
  const name = requireString(ctx, 'name', obj.name)
  const verified = requireBoolean(ctx, 'verified', obj.verified)

  const logo_uri = optionalNullableString(ctx, 'logo_uri', obj.logo_uri)
  const policy_uri = optionalNullableString(ctx, 'policy_uri', obj.policy_uri)

  let verification_method: VerifierVerificationMethod | null | undefined
  if (obj.verification_method === null) {
    verification_method = null
  } else if (obj.verification_method !== undefined) {
    const method = requireString(ctx, 'verification_method', obj.verification_method)
    if (!VERIFICATION_METHODS.has(method as VerifierVerificationMethod)) {
      throw new ContractError(ctx, 'verification_method', method)
    }
    verification_method = method as VerifierVerificationMethod
  }

  return {
    name,
    verified,
    ...(logo_uri !== undefined ? { logo_uri } : {}),
    ...(policy_uri !== undefined ? { policy_uri } : {}),
    ...(verification_method !== undefined ? { verification_method } : {}),
  }
}

function validateTransactionData(raw: unknown, index: number): TransactionDataDisplay {
  const ctx = `transaction_data[${index}]`
  const obj = requireObject(ctx, 'transaction_data[]', raw)
  const type = requireString(ctx, 'type', obj.type)
  const credential_ids = requireArray(ctx, 'credential_ids', obj.credential_ids).map(
    (id, idIndex) => requireString(ctx, `credential_ids[${idIndex}]`, id)
  )
  const display_data = requireObject(ctx, 'display_data', obj.display_data)

  return { type, credential_ids, display_data }
}

function validateCredentialSetOptions(raw: unknown): string[][] | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null) return null

  const options = requireArray('StartPresentationResponse', 'credential_set_options', raw)
  return options.map((option, index) =>
    requireArray(
      'StartPresentationResponse',
      `credential_set_options[${index}]`,
      option
    ).map((id, idIndex) =>
      requireString(
        'StartPresentationResponse',
        `credential_set_options[${index}][${idIndex}]`,
        id
      )
    )
  )
}

/**
 * Validate POST /presentation/start response against the OpenAPI contract.
 */
export function validateStartPresentationResponse(
  raw: unknown
): StartPresentationResponse {
  const ctx = 'StartPresentationResponse'
  const obj = requireObject(ctx, 'response', raw)

  const session_id = requireString(ctx, 'session_id', obj.session_id)
  const expires_at = requireString(ctx, 'expires_at', obj.expires_at)
  const flow = requireString(ctx, 'flow', obj.flow)
  if (flow !== 'cross_device' && flow !== 'same_device') {
    throw new ContractError(ctx, 'flow', flow)
  }

  const verifier = validateVerifierDisplay(obj.verifier)
  const purpose = optionalNullableString(ctx, 'purpose', obj.purpose)
  const requires_consent = requireBoolean(ctx, 'requires_consent', obj.requires_consent)

  const rawMatches = requireArray(ctx, 'credential_matches', obj.credential_matches)
  const credential_matches = rawMatches.map((match, index) =>
    validateCredentialMatch(match, index)
  )

  const credential_set_options = validateCredentialSetOptions(obj.credential_set_options)

  let transaction_data: TransactionDataDisplay[] | null | undefined
  if (obj.transaction_data === null) {
    transaction_data = null
  } else if (obj.transaction_data !== undefined) {
    const entries = requireArray(ctx, 'transaction_data', obj.transaction_data)
    transaction_data = entries.map((entry, index) =>
      validateTransactionData(entry, index)
    )
  }

  return {
    session_id,
    expires_at,
    flow,
    verifier,
    credential_matches,
    requires_consent,
    ...(purpose !== undefined ? { purpose } : {}),
    ...(credential_set_options !== undefined ? { credential_set_options } : {}),
    ...(transaction_data !== undefined ? { transaction_data } : {}),
  }
}

/**
 * Validate POST /presentation/{session_id}/consent response.
 */
export function validatePresentationConsentResponse(
  raw: unknown
): PresentationConsentResponse {
  const ctx = 'PresentationConsentResponse'
  const obj = requireObject(ctx, 'response', raw)

  const status = requireString(ctx, 'status', obj.status)
  if (status !== 'completed' && status !== 'rejected') {
    throw new ContractError(ctx, 'status', status)
  }

  const redirect_uri =
    obj.redirect_uri === null
      ? null
      : obj.redirect_uri === undefined
        ? null
        : requireString(ctx, 'redirect_uri', obj.redirect_uri)

  let verifier_response: PresentationConsentResponse['verifier_response'] = null
  if (obj.verifier_response === null || obj.verifier_response === undefined) {
    verifier_response = null
  } else {
    const responseObj = requireObject(ctx, 'verifier_response', obj.verifier_response)
    verifier_response = {
      ...(responseObj.redirect_uri !== undefined
        ? {
            redirect_uri: requireString(
              ctx,
              'verifier_response.redirect_uri',
              responseObj.redirect_uri
            ),
          }
        : {}),
    }
  }

  return { status, redirect_uri, verifier_response }
}
