export type CredentialOfferIssuer = {
  name?: string
  logoUrl?: string
  url?: string
}

export type CredentialOfferOption = {
  id: string
  displayName?: string
}

// UI-facing simplified credential-offer resolution response from backend (#93).
export type CredentialOfferResolutionResponse = {
  issuer?: CredentialOfferIssuer
  credentialTypes: string[]
  options?: CredentialOfferOption[]
}

// TODO(#93-backend-integration): Keep this envelope in sync with backend error responses.
export type BackendErrorEnvelope = {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

