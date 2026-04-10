export type CredentialOfferIssuer = {
  credential_issuer: string
  display_name: string | null
  logo_uri: string | null
}

export type CredentialDisplay = {
  name: string
  description?: string
  background_color?: string
  text_color?: string
  logo?: {
    uri: string
    alt_text?: string
  } | null
}

export type CredentialTypeOption = {
  credential_configuration_id: string
  format: string
  display: CredentialDisplay
}

export type CredentialOfferResolutionResponse = {
  session_id: string
  expires_at: string
  issuer: CredentialOfferIssuer
  credential_types: CredentialTypeOption[]
  flow: 'authorization_code' | 'pre_authorized_code'
  tx_code_required: boolean
  tx_code: {
    input_mode: 'numeric' | 'text'
    length: number | null
    description: string | null
  } | null
}

export type BackendErrorEnvelope = {
  error?: string
  error_description?: string
}
