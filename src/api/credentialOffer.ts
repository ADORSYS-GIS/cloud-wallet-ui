import { apiGet } from './client'

export type SubmitCredentialOfferResponse = {
  accepted: boolean
  message?: string
}

export function submitCredentialOfferUri(
  credentialOfferUri: string
): Promise<SubmitCredentialOfferResponse> {
  const query = new URLSearchParams({
    credential_offer_uri: credentialOfferUri,
  })

  return apiGet<SubmitCredentialOfferResponse>(`/credential-offer?${query.toString()}`)
}
