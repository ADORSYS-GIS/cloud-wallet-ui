import { apiGet, apiPost } from './client'
import type { CredentialOfferResolutionResponse } from '../types/credentialOffer'

// TODO(#93-backend-integration): Backend must implement POST /credential-offer.
// Expected request: { credential_offer_uri: string }.
// Expected 200 response: CredentialOfferResolutionResponse.
// Expected error envelope: { error: { code, message, details? } }.
// Note: current GET fallback is temporary; restrict fallback to specific statuses once backend is stable.
export function resolveCredentialOfferUri(
  credentialOfferUri: string
): Promise<CredentialOfferResolutionResponse> {
  return apiPost<CredentialOfferResolutionResponse, { credential_offer_uri: string }>(
    '/credential-offer',
    { credential_offer_uri: credentialOfferUri }
  ).catch(() => {
    const query = new URLSearchParams({
      credential_offer_uri: credentialOfferUri,
    })

    return apiGet<CredentialOfferResolutionResponse>(
      `/credential-offer?${query.toString()}`
    )
  })
}
