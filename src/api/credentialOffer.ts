import { apiGet, apiPost } from './client'

export type SubmitCredentialOfferResponse = {
  accepted: boolean
  message?: string
}

export function submitCredentialOfferUri(
  credentialOfferUri: string
): Promise<SubmitCredentialOfferResponse> {
  return apiPost<SubmitCredentialOfferResponse, { credential_offer_uri: string }>(
    '/credential-offer',
    { credential_offer_uri: credentialOfferUri }
  ).catch(() => {
    const query = new URLSearchParams({
      credential_offer_uri: credentialOfferUri,
    })

    return apiGet<SubmitCredentialOfferResponse>(`/credential-offer?${query.toString()}`)
  })
}
