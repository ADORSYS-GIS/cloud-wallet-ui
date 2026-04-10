import { apiPost } from './client'
import type { CredentialOfferResolutionResponse } from '../types/issuance.types'

export function startIssuanceSession(
  offer: string
): Promise<CredentialOfferResolutionResponse> {
  return apiPost<CredentialOfferResolutionResponse, { offer: string }>(
    '/issuance/start',
    {
      offer,
    }
  )
}
