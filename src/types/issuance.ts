// ---------------------------------------------------------------------------
// Types derived directly from the OpenAPI spec schemas for the issuance flow.
// ---------------------------------------------------------------------------

export type IssuerSummary = {
  credential_issuer: string
  display_name: string | null
  logo_uri: string | null
}

export type CredentialLogo = {
  uri: string
  alt_text?: string
}

export type CredentialDisplay = {
  name: string
  description?: string
  background_color?: string
  text_color?: string
  logo?: CredentialLogo | null
}

export type CredentialTypeDisplay = {
  credential_configuration_id: string
  format: string
  display: CredentialDisplay
}

export type TxCodeSpec = {
  input_mode: 'numeric' | 'text'
  length: number | null
  description: string | null
}

export type IssuanceFlow = 'authorization_code' | 'pre_authorized_code'

export type StartIssuanceResponse = {
  session_id: string
  expires_at: string
  issuer: IssuerSummary
  credential_types: CredentialTypeDisplay[]
  flow: IssuanceFlow
  tx_code_required: boolean
  tx_code: TxCodeSpec | null
}