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

export type ConsentNextAction = 'redirect' | 'provide_tx_code' | 'none' | 'rejected'

export type ConsentResponse = {
  session_id: string
  next_action: ConsentNextAction
  authorization_url?: string
}

export type TxCodeResponse = {
  session_id: string
}

export type SseProcessingStep =
  | 'exchanging_token'
  | 'requesting_credential'
  | 'awaiting_deferred_credential'

export type SseProcessingEvent = {
  event: 'processing'
  session_id: string
  state: 'processing'
  step: SseProcessingStep
}

export type SseCompletedEvent = {
  event: 'completed'
  session_id: string
  state: 'completed'
  credential_ids: string[]
  credential_types: string[]
}

export type SseFailedStep =
  | 'offer_resolution'
  | 'metadata'
  | 'authorization'
  | 'token'
  | 'credential_request'
  | 'deferred_credential'
  | 'internal'

export type SseFailedEvent = {
  event: 'failed'
  session_id: string
  state: 'failed'
  error: string
  error_description: string | null
  step: SseFailedStep
}

export type SseEvent = SseProcessingEvent | SseCompletedEvent | SseFailedEvent

export type IssuanceErrorCode =
  | 'invalid_credential_offer'
  | 'session_not_found'
  | 'invalid_session_state'
  | 'invalid_tx_code'
  | 'issuer_metadata_fetch_failed'
  | 'auth_server_metadata_fetch_failed'
  | 'invalid_request'
  | 'unauthorized'
  | 'internal_error'
  | (string & Record<never, never>)

export type IssuanceApiError = {
  httpStatus: number
  error: IssuanceErrorCode
  error_description: string | null
}
