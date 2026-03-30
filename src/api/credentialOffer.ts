import { apiGet, apiPost } from './client'

export type SubmitCredentialOfferResponse = {
  accepted: boolean
  message?: string
}

export function submitCredentialOfferUri(
  credentialOfferUri: string
): Promise<SubmitCredentialOfferResponse> {
  // Prefer POST to avoid leaking offer URIs into logs/history/proxies via query strings.
  // Fall back to GET for backward compatibility with older backends.
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
