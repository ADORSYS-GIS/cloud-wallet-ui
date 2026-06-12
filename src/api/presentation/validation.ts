import type { Logo } from '../../types/credential'
import type {
  CredentialCandidate,
  CredentialMatch,
  CredentialSummaryDisplay,
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function requireOptionalStringOrNull(
  ctx: string,
  field: string,
  value: unknown
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return requireString(ctx, field, value)
}

function validateLogo(ctx: string, raw: unknown): Logo {
  const obj = requireObject(ctx, 'logo', raw)
  const logo: Logo = {
    uri: requireString(ctx, 'logo.uri', obj.uri),
  }
  if (obj.alt_text !== undefined) {
    logo.alt_text = requireString(ctx, 'logo.alt_text', obj.alt_text)
  }
  return logo
}

function validateCredentialSummaryDisplay(
  ctx: string,
  raw: unknown
): CredentialSummaryDisplay {
  const obj = requireObject(ctx, 'display', raw)
  const display: CredentialSummaryDisplay = {
    name: requireString(ctx, 'display.name', obj.name),
    issuer_name: requireString(ctx, 'display.issuer_name', obj.issuer_name),
    credential_type: requireString(ctx, 'display.credential_type', obj.credential_type),
    logo: null,
  }

  if (obj.description !== undefined) {
    display.description = requireString(ctx, 'display.description', obj.description)
  }
  if (obj.background_color !== undefined) {
    display.background_color = requireString(
      ctx,
      'display.background_color',
      obj.background_color
    )
  }
  if (obj.text_color !== undefined) {
    display.text_color = requireString(ctx, 'display.text_color', obj.text_color)
  }
  if (obj.logo !== undefined && obj.logo !== null) {
    display.logo = validateLogo(ctx, obj.logo)
  }

  return display
}

function validateRequestedClaim(raw: unknown, index: number): RequestedClaim {
  const ctx = `requested_claims[${index}]`
  const obj = requireObject(ctx, 'requested_claims[]', raw)
  const path = requireArray(ctx, 'path', obj.path)

  const claim: RequestedClaim = { path: path as RequestedClaim['path'] }
  if (obj.display_name !== undefined) {
    claim.display_name = requireOptionalStringOrNull(
      ctx,
      'display_name',
      obj.display_name
    )
  }
  if (obj.value_required !== undefined) {
    claim.value_required = requireBoolean(ctx, 'value_required', obj.value_required)
  }
  return claim
}

function validateCredentialCandidate(raw: unknown, index: number): CredentialCandidate {
  const ctx = `candidates[${index}]`
  const obj = requireObject(ctx, 'candidates[]', raw)
  const credential_id = requireString(ctx, 'credential_id', obj.credential_id)
  if (!UUID_REGEX.test(credential_id)) {
    throw new ContractError(ctx, 'credential_id', credential_id)
  }

  const requestedClaimsRaw = requireArray(ctx, 'requested_claims', obj.requested_claims)

  return {
    credential_id,
    display: validateCredentialSummaryDisplay(ctx, obj.display),
    requested_claims: requestedClaimsRaw.map((claim, claimIndex) =>
      validateRequestedClaim(claim, claimIndex)
    ),
  }
}

function validateCredentialMatch(raw: unknown, index: number): CredentialMatch {
  const ctx = `credential_matches[${index}]`
  const obj = requireObject(ctx, 'credential_matches[]', raw)
  const candidatesRaw = requireArray(ctx, 'candidates', obj.candidates)

  return {
    query_id: requireString(ctx, 'query_id', obj.query_id),
    required: requireBoolean(ctx, 'required', obj.required),
    candidates: candidatesRaw.map((candidate, candidateIndex) =>
      validateCredentialCandidate(candidate, candidateIndex)
    ),
  }
}

function validateVerifierDisplay(raw: unknown): VerifierDisplay {
  const ctx = 'StartPresentationResponse.verifier'
  const obj = requireObject(ctx, 'verifier', raw)

  const verifier: VerifierDisplay = {
    name: requireString(ctx, 'name', obj.name),
    verified: requireBoolean(ctx, 'verified', obj.verified),
  }

  if (obj.logo_uri !== undefined) {
    verifier.logo_uri = requireOptionalStringOrNull(ctx, 'logo_uri', obj.logo_uri)
  }
  if (obj.policy_uri !== undefined) {
    verifier.policy_uri = requireOptionalStringOrNull(ctx, 'policy_uri', obj.policy_uri)
  }
  if (obj.verification_method !== undefined) {
    const method = requireOptionalStringOrNull(
      ctx,
      'verification_method',
      obj.verification_method
    )
    if (
      method !== null &&
      method !== undefined &&
      !VERIFICATION_METHODS.has(method as VerifierVerificationMethod)
    ) {
      throw new ContractError(ctx, 'verification_method', method)
    }
    verifier.verification_method = method as VerifierVerificationMethod | null | undefined
  }

  return verifier
}

function validateTransactionDataDisplay(
  raw: unknown,
  index: number
): TransactionDataDisplay {
  const ctx = `transaction_data[${index}]`
  const obj = requireObject(ctx, 'transaction_data[]', raw)
  const credentialIds = requireArray(ctx, 'credential_ids', obj.credential_ids)

  return {
    type: requireString(ctx, 'type', obj.type),
    credential_ids: credentialIds.map((id, idIndex) =>
      requireString(ctx, `credential_ids[${idIndex}]`, id)
    ),
    display_data: requireObject(ctx, 'display_data', obj.display_data),
  }
}

function validateOptionalCredentialSetOptions(
  ctx: string,
  raw: unknown
): string[][] | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null) return null
  const outer = requireArray(ctx, 'credential_set_options', raw)
  return outer.map((option, optionIndex) => {
    const inner = requireArray(ctx, `credential_set_options[${optionIndex}]`, option)
    return inner.map((id, idIndex) =>
      requireString(ctx, `credential_set_options[${optionIndex}][${idIndex}]`, id)
    )
  })
}

/**
 * Validate POST /presentation/start response against the OpenAPI contract.
 */
export function validateStartPresentationResponse(
  raw: unknown
): StartPresentationResponse {
  const ctx = 'StartPresentationResponse'
  const obj = requireObject(ctx, 'response', raw)

  const flow = requireString(ctx, 'flow', obj.flow)
  if (flow !== 'cross_device' && flow !== 'same_device') {
    throw new ContractError(ctx, 'flow', flow)
  }

  const matchesRaw = requireArray(ctx, 'credential_matches', obj.credential_matches)
  const transactionDataRaw = obj.transaction_data

  const response: StartPresentationResponse = {
    session_id: requireString(ctx, 'session_id', obj.session_id),
    expires_at: requireString(ctx, 'expires_at', obj.expires_at),
    flow,
    verifier: validateVerifierDisplay(obj.verifier),
    credential_matches: matchesRaw.map((match, index) =>
      validateCredentialMatch(match, index)
    ),
    requires_consent: requireBoolean(ctx, 'requires_consent', obj.requires_consent),
  }

  if (obj.purpose !== undefined) {
    response.purpose = requireOptionalStringOrNull(ctx, 'purpose', obj.purpose)
  }
  if (obj.credential_set_options !== undefined) {
    response.credential_set_options = validateOptionalCredentialSetOptions(
      ctx,
      obj.credential_set_options
    )
  }
  if (transactionDataRaw !== undefined) {
    if (transactionDataRaw === null) {
      response.transaction_data = null
    } else {
      const entries = requireArray(ctx, 'transaction_data', transactionDataRaw)
      response.transaction_data = entries.map((entry, index) =>
        validateTransactionDataDisplay(entry, index)
      )
    }
  }

  return response
}
