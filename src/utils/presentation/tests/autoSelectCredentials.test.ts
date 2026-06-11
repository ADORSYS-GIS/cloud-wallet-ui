import { describe, expect, it } from 'vitest'
import { autoSelectCredentials } from '../autoSelectCredentials'
import type { CredentialMatch } from '../../../types/presentation'

const matches: CredentialMatch[] = [
  {
    query_id: 'pid_request',
    required: true,
    candidates: [
      {
        credential_id: 'cred-1',
        display: { name: 'EU Personal ID' },
        requested_claims: [{ path: ['family_name'] }],
      },
    ],
  },
]

describe('autoSelectCredentials', () => {
  it('selects the first candidate for each match', () => {
    expect(autoSelectCredentials(matches)).toEqual([
      { query_id: 'pid_request', credential_id: 'cred-1' },
    ])
  })
})
