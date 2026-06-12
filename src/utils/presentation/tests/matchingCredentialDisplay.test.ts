import { describe, expect, it } from 'vitest'
import {
  flattenCredentialMatches,
  resolveMatchingCredentialDisplay,
} from '../matchingCredentialDisplay'

describe('resolveMatchingCredentialDisplay', () => {
  it('resolves display metadata from a credential candidate', () => {
    const result = resolveMatchingCredentialDisplay({
      credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
      display: {
        name: 'Identity Credential',
        issuer_name: 'Keycloak-demo Solution Adorsys',
        credential_type: 'eu.europa.ec.eudi.pid.1',
        logo: {
          uri: 'https://issuer.example/logo.png',
          alt_text: 'Issuer logo',
        },
      },
    })

    expect(result).toEqual({
      name: 'Identity Credential',
      issuerName: 'Keycloak-demo Solution Adorsys',
      logoUri: 'https://issuer.example/logo.png',
      description: undefined,
      backgroundColor: undefined,
      textColor: undefined,
    })
  })
})

describe('flattenCredentialMatches', () => {
  it('flattens credential_matches into selectable rows', () => {
    const result = flattenCredentialMatches([
      {
        query_id: 'pid_request',
        required: true,
        candidates: [
          {
            credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
            display: {
              name: 'Identity Credential',
              issuer_name: 'Issuer',
              credential_type: 'eu.europa.ec.eudi.pid.1',
            },
            requested_claims: [],
          },
        ],
      },
    ])

    expect(result).toHaveLength(1)
    expect(result[0].query_id).toBe('pid_request')
    expect(result[0].credential_id).toBe('c3d4e5f6-7890-abcd-ef12-3456789abcde')
  })
})
