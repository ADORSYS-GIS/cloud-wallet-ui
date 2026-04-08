export type CredentialStatus = 'active' | 'revoked' | 'suspended' | string

export type CredentialSummary = {
  id: string
  issuer: string
  credential_type: string
  display_name?: string | null
  status?: CredentialStatus
}

export type CredentialsListResponse = {
  items: CredentialSummary[]
  cursor?: string | null
  has_more?: boolean
}

export type CredentialDetail = CredentialSummary & {
  subject?: string | null
  issued_at?: string | null
  expires_at?: string | null
}
