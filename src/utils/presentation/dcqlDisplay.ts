import type {
  ClaimsPathPointer,
  DcqlClaimQuery,
  DcqlCredentialQuery,
  DcqlCredentialSetQuery,
  DcqlQuery,
} from '../../types/presentation'

export type CredentialFormatDisplay = {
  id: string
  label: string
  description: string
  supportsSelectiveDisclosure: boolean
}

export type RequestedClaimDisplay = {
  id: string
  label: string
  pathLabel: string
  mandatory: boolean
  valuePreview?: string
}

export type RequestedCredentialDisplay = {
  id: string
  format: string
  formatDisplay: CredentialFormatDisplay
  typeLabel?: string
  claims: RequestedClaimDisplay[]
  claimSetOptions?: string[][]
  requireHolderBinding: boolean
}

export type CredentialSetGroupDisplay = {
  label: string
  required: boolean
  options: string[][]
  optionLabels: string[][]
}

export type SecurityWarning = {
  id: string
  message: string
}

const SENSITIVE_CLAIM_SEGMENTS = new Set([
  'portrait',
  'biometric',
  'birthdate',
  'birth_date',
  'date_of_birth',
  'social_security_number',
  'ssn',
  'national_id',
  'document_number',
  'driving_privileges',
  'email',
  'phone_number',
  'mobile',
])

const FORMAT_DISPLAY: Record<string, CredentialFormatDisplay> = {
  'dc+sd-jwt': {
    id: 'dc+sd-jwt',
    label: 'SD-JWT VC',
    description: 'Selective disclosure available',
    supportsSelectiveDisclosure: true,
  },
  'vc+sd-jwt': {
    id: 'vc+sd-jwt',
    label: 'SD-JWT VC',
    description: 'Selective disclosure available',
    supportsSelectiveDisclosure: true,
  },
  mso_mdoc: {
    id: 'mso_mdoc',
    label: 'Mobile Document',
    description: 'ISO mdoc format',
    supportsSelectiveDisclosure: true,
  },
  jwt_vc_json: {
    id: 'jwt_vc_json',
    label: 'JWT Verifiable Credential',
    description: 'JWT credentialSubject claim structure',
    supportsSelectiveDisclosure: false,
  },
  ldp_vc: {
    id: 'ldp_vc',
    label: 'Linked Data VC',
    description: 'JSON-LD verifiable credential',
    supportsSelectiveDisclosure: false,
  },
}

function humanizeSegment(segment: string): string {
  return segment
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/** Format a claims path pointer for technical display. */
export function formatClaimPathLabel(path: ClaimsPathPointer): string {
  return path
    .map((segment) => {
      if (segment === null) return '*'
      return String(segment)
    })
    .join('.')
}

/** Format-specific path label (mdoc uses namespace-qualified paths per OID4VP §7.2). */
export function formatClaimPathLabelForFormat(
  path: ClaimsPathPointer,
  format?: string
): string {
  if (format === 'mso_mdoc' && path.length === 2) {
    const namespace = path[0]
    const element = path[1]
    if (typeof namespace === 'string' && typeof element === 'string') {
      return `${namespace} → ${element}`
    }
  }

  if (format === 'jwt_vc_json' || format === 'ldp_vc') {
    return formatClaimPathLabel(path)
  }

  return formatClaimPathLabel(path)
}

/**
 * Human-readable claim label from a DCQL path.
 * mdoc paths use [namespace, element]; JSON paths use the last string segment.
 */
export function humanizeClaimLabel(path: ClaimsPathPointer, format?: string): string {
  if (format === 'mso_mdoc' && path.length === 2) {
    const element = path[1]
    if (typeof element === 'string') {
      return humanizeSegment(element)
    }
  }

  for (let index = path.length - 1; index >= 0; index -= 1) {
    const segment = path[index]
    if (typeof segment === 'string' && segment.length > 0) {
      return humanizeSegment(segment)
    }
  }

  return formatClaimPathLabel(path)
}

export function resolveFormatDisplay(format: string): CredentialFormatDisplay {
  return (
    FORMAT_DISPLAY[format] ?? {
      id: format,
      label: format,
      description: 'Requested credential format',
      supportsSelectiveDisclosure: false,
    }
  )
}

function resolveCredentialTypeLabel(credential: DcqlCredentialQuery): string | undefined {
  const meta = credential.meta
  if (!meta) return undefined

  const vctValues = meta.vct_values
  if (Array.isArray(vctValues) && typeof vctValues[0] === 'string') {
    const value = vctValues[0]
    try {
      const url = new URL(value)
      const segments = url.pathname.split('/').filter(Boolean)
      const last = segments[segments.length - 1]
      return last ? humanizeSegment(last) : value
    } catch {
      return humanizeSegment(value.split('/').pop() ?? value)
    }
  }

  const doctype = meta.doctype_value
  if (typeof doctype === 'string' && doctype.trim()) {
    return doctype
  }

  const typeValues = meta.type_values
  if (Array.isArray(typeValues) && Array.isArray(typeValues[0])) {
    const types = typeValues[0].filter((entry) => typeof entry === 'string')
    const last = types[types.length - 1]
    if (typeof last === 'string') {
      return humanizeSegment(last.split('#').pop() ?? last)
    }
  }

  return undefined
}

function formatValuePreview(values: unknown[] | undefined): string | undefined {
  if (!values || values.length === 0) return undefined
  return values.map((value) => String(value)).join(', ')
}

function buildClaimDisplays(credential: DcqlCredentialQuery): RequestedClaimDisplay[] {
  if (!credential.claims || credential.claims.length === 0) {
    return []
  }

  const mandatoryClaimIds = new Set<string>()
  if (credential.claim_sets && credential.claim_sets.length > 0) {
    for (const option of credential.claim_sets) {
      for (const claimId of option) {
        mandatoryClaimIds.add(claimId)
      }
    }
  }

  return credential.claims.map((claim: DcqlClaimQuery, index) => {
    const pathLabel = formatClaimPathLabelForFormat(claim.path, credential.format)
    const claimId = claim.id ?? `claim-${index}`
    const hasClaimSets = Boolean(credential.claim_sets?.length)
    const mandatory = hasClaimSets ? mandatoryClaimIds.has(claimId) : true

    return {
      id: `${credential.id}:${claimId}`,
      label: humanizeClaimLabel(claim.path, credential.format),
      pathLabel,
      mandatory,
      valuePreview: formatValuePreview(claim.values),
    }
  })
}

export function buildRequestedCredentialDisplays(
  dcqlQuery: DcqlQuery
): RequestedCredentialDisplay[] {
  return dcqlQuery.credentials.map((credential) => ({
    id: credential.id,
    format: credential.format,
    formatDisplay: resolveFormatDisplay(credential.format),
    typeLabel: resolveCredentialTypeLabel(credential),
    claims: buildClaimDisplays(credential),
    claimSetOptions: credential.claim_sets,
    requireHolderBinding: credential.require_cryptographic_holder_binding !== false,
  }))
}

function credentialLabelMap(credentials: DcqlCredentialQuery[]): Map<string, string> {
  const labels = new Map<string, string>()
  for (const credential of credentials) {
    labels.set(credential.id, resolveCredentialTypeLabel(credential) ?? credential.id)
  }
  return labels
}

function formatOptionLabel(option: string[], labels: Map<string, string>): string[] {
  return option.map((id) => labels.get(id) ?? id)
}

export function buildCredentialSetGroupDisplays(
  dcqlQuery: DcqlQuery
): CredentialSetGroupDisplay[] {
  if (!dcqlQuery.credential_sets?.length) {
    return []
  }

  const labels = credentialLabelMap(dcqlQuery.credentials)

  return dcqlQuery.credential_sets.map((set: DcqlCredentialSetQuery, index) => {
    const required = set.required !== false
    const optionLabels = set.options.map((option) => formatOptionLabel(option, labels))

    const groupName = `Group ${String.fromCharCode(65 + index)}`

    return {
      label: groupName,
      required,
      options: set.options,
      optionLabels,
    }
  })
}

function pathContainsSensitiveSegment(path: ClaimsPathPointer): boolean {
  return path.some((segment) => {
    if (typeof segment !== 'string') return false
    return SENSITIVE_CLAIM_SEGMENTS.has(segment.toLowerCase())
  })
}

export function detectSecurityWarnings(dcqlQuery: DcqlQuery): SecurityWarning[] {
  const warnings: SecurityWarning[] = []
  const sensitiveClaims: string[] = []

  for (const credential of dcqlQuery.credentials) {
    for (const claim of credential.claims ?? []) {
      if (pathContainsSensitiveSegment(claim.path)) {
        sensitiveClaims.push(humanizeClaimLabel(claim.path, credential.format))
      }
    }
  }

  if (sensitiveClaims.length >= 2) {
    warnings.push({
      id: 'sensitive-combination',
      message:
        'This request includes multiple sensitive attributes. Only share if you trust the verifier and understand why this data is needed.',
    })
  } else if (sensitiveClaims.length === 1) {
    warnings.push({
      id: 'sensitive-single',
      message: `This request includes a sensitive attribute (${sensitiveClaims[0]}). Verify the verifier before sharing.`,
    })
  }

  const hasUnboundCredential = dcqlQuery.credentials.some(
    (credential) => credential.require_cryptographic_holder_binding === false
  )
  if (hasUnboundCredential) {
    warnings.push({
      id: 'no-holder-binding',
      message:
        'One or more requested credentials do not require holder binding. Shared data may be easier to replay.',
    })
  }

  return warnings
}

export function humanizeScopeLabel(scope: string): string {
  return scope
    .split(/[._\s]+/)
    .filter(Boolean)
    .map((part) => humanizeSegment(part))
    .join(' ')
}
