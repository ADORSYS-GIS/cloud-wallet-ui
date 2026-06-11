import { describe, expect, it } from 'vitest'
import { buildPresentationConsentRequest } from '../consent'

describe('buildPresentationConsentRequest', () => {
  it('builds a decline request without selected credentials', () => {
    expect(buildPresentationConsentRequest(false)).toEqual({ accepted: false })
  })

  it('maps selected credentials to API snake_case', () => {
    expect(
      buildPresentationConsentRequest(
        true,
        [
          {
            credentialId: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
            queryId: 'pid_request',
            format: 'dc+sd-jwt',
          },
        ],
        true
      )
    ).toEqual({
      accepted: true,
      selected_credentials: [
        {
          query_id: 'pid_request',
          credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
        },
      ],
      transaction_data_acknowledged: true,
    })
  })

  it('omits transaction_data_acknowledged when not provided', () => {
    const body = buildPresentationConsentRequest(true, [
      { credentialId: 'cred-1', queryId: 'identity', format: 'dc+sd-jwt' },
    ])
    expect(body.transaction_data_acknowledged).toBeUndefined()
  })
})
