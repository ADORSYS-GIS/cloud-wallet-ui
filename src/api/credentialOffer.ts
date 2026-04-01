import { apiGet, apiPost } from './client'

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

  return apiPost<SubmitCredentialOfferResponse, { credential_offer_uri: string }>(
    '/credential-offer',
    { credential_offer_uri: credentialOfferUri }
  ).catch((err: unknown) => {
    if (err instanceof Error) {
      const match = err.message.match(/Request failed with (\d+)/)
      const status = match ? Number(match[1]) : undefined

      if (status === 405) {
        return apiGet<SubmitCredentialOfferResponse>(
          `/credential-offer?${query.toString()}`
        )
      }
    }

    throw err
  })
}
