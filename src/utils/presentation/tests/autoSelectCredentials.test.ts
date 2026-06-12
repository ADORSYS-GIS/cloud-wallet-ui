import { describe, expect, it } from 'vitest'
import { autoSelectCredentials } from '../autoSelectCredentials'
import type { CredentialMatch } from '../../../types/presentation'

const matches: CredentialMatch[] = [
  {
    query_id: 'pid_request',
    required: true,
    candidates: [
      {
        credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
        display: {
          name: 'EU Personal ID',
          issuer_name: 'Example Issuer',
          credential_type: 'dc+sd-jwt',
        },
        requested_claims: [{ path: ['family_name'] }],
      },
    ],
  },
]

describe('autoSelectCredentials', () => {
  it('selects the first candidate for each match', () => {
    expect(autoSelectCredentials(matches)).toEqual([
      {
        query_id: 'pid_request',
        credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
      },
    ])
  })
})
