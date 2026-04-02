import { ApiError, apiGet, apiPost } from './client'
import type { CredentialOfferResolutionResponse } from '../types/credentialOffer'

// TODO(#93-backend-integration): Backend must implement POST /credential-offer.
// Expected request: { credential_offer_uri: string }.
// Expected 200 response: CredentialOfferResolutionResponse.
// Expected error envelope: { error: { code, message, details? } }.
// Note: current GET fallback is temporary; restrict fallback to specific statuses once backend is stable.
export function resolveCredentialOfferUri(
  credentialOfferUri: string
): Promise<CredentialOfferResolutionResponse> {
  const query = new URLSearchParams({
    credential_offer_uri: credentialOfferUri,
  })

  return apiPost<CredentialOfferResolutionResponse, { credential_offer_uri: string }>(
    '/credential-offer',
    { credential_offer_uri: credentialOfferUri }
  ).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 405) {
      return apiGet<CredentialOfferResolutionResponse>(
        `/credential-offer?${query.toString()}`
      )
    }

    throw err
  })
}
