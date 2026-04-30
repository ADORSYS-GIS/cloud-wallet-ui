import { describe, expect, it } from 'vitest'
import {
  ContractError,
  validateStartIssuanceResponse,
  validateCredentialRecord,
  validateCredentialListResponse,
} from '../validation'
import type { StartIssuanceResponse } from '../../types/issuance'
import type { CredentialRecord } from '../../types/credential'

const validStartIssuanceResponse: StartIssuanceResponse = {
  session_id: 'ses_abc123',
  expires_at: '2026-04-08T14:35:00Z',
  issuer: {
    credential_issuer: 'https://issuer.example.eu',
    display_name: 'Example Issuer',
    logo_uri: null,
  },
  credential_types: [
    {
      credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
      format: 'vc+sd-jwt',
      display: {
        name: 'EU Personal ID',
        description: 'Official EU personal identity document',
        background_color: '#12107c',
        text_color: '#ffffff',
        logo: null,
      },
    },
  ],
  flow: 'authorization_code',
  tx_code_required: false,
  tx_code: null,
}

const validCredentialRecord: CredentialRecord = {
  id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
  credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
  format: 'dc+sd-jwt',
  issuer: 'https://issuer.example.eu',
  status: 'active',
  issued_at: '2026-04-08T14:35:00Z',
  expires_at: '2027-04-08T14:35:00Z',
  claims: { given_name: 'Jane', family_name: 'Doe' },
}

describe('validateStartIssuanceResponse', () => {
  it('accepts a valid authorization_code flow response', () => {
    const result = validateStartIssuanceResponse(validStartIssuanceResponse)
    expect(result).toEqual(validStartIssuanceResponse)
  })

  it('accepts a valid pre_authorized_code flow response with tx_code', () => {
    const input: StartIssuanceResponse = {
      ...validStartIssuanceResponse,
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: 'Check your email.' },
    }
    const result = validateStartIssuanceResponse(input)
    expect(result.tx_code?.length).toBe(6)
  })

  it('accepts null logo_uri and null display_name on issuer', () => {
    const input = {
      ...validStartIssuanceResponse,
      issuer: {
        credential_issuer: 'https://issuer.example.eu',
        display_name: null,
        logo_uri: null,
      },
    }
    expect(() => validateStartIssuanceResponse(input)).not.toThrow()
  })

  it('throws ContractError when session_id is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { session_id: _, ...rest } = validStartIssuanceResponse
    expect(() => validateStartIssuanceResponse(rest)).toThrow(ContractError)
  })

  it('throws ContractError when credential_types is empty', () => {
    const input = { ...validStartIssuanceResponse, credential_types: [] }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError for unknown flow value', () => {
    const input = { ...validStartIssuanceResponse, flow: 'implicit' }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when tx_code_required is not a boolean', () => {
    const input = { ...validStartIssuanceResponse, tx_code_required: 'yes' }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when issuer.credential_issuer is missing', () => {
    const input = {
      ...validStartIssuanceResponse,
      issuer: { display_name: 'X', logo_uri: null },
    }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when credential_types entry is missing display.name', () => {
    const input = {
      ...validStartIssuanceResponse,
      credential_types: [
        {
          credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
          format: 'vc+sd-jwt',
          display: { description: 'no name here' },
        },
      ],
    }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError for unknown tx_code.input_mode', () => {
    const input = {
      ...validStartIssuanceResponse,
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'qwerty', length: 6, description: null },
    }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when issuer.display_name is neither string nor null', () => {
    const input = {
      ...validStartIssuanceResponse,
      issuer: {
        ...validStartIssuanceResponse.issuer,
        display_name: 42,
      },
    }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when tx_code.length is not number|null', () => {
    const input = {
      ...validStartIssuanceResponse,
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: '6', description: null },
    }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when display.logo exists but is not an object', () => {
    const input = {
      ...validStartIssuanceResponse,
      credential_types: [
        {
          ...validStartIssuanceResponse.credential_types[0],
          display: {
            ...validStartIssuanceResponse.credential_types[0].display,
            logo: 'https://issuer.example.eu/logo.svg',
          },
        },
      ],
    }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('accepts display object with only required name field', () => {
    const input = {
      ...validStartIssuanceResponse,
      credential_types: [
        {
          ...validStartIssuanceResponse.credential_types[0],
          display: { name: 'Only Name' },
        },
      ],
    }
    expect(() => validateStartIssuanceResponse(input)).not.toThrow()
  })

  it('accepts display.logo object without alt_text', () => {
    const input = {
      ...validStartIssuanceResponse,
      credential_types: [
        {
          ...validStartIssuanceResponse.credential_types[0],
          display: {
            name: 'EU Personal ID',
            logo: { uri: 'https://issuer.example.eu/logo.svg' },
          },
        },
      ],
    }
    expect(() => validateStartIssuanceResponse(input)).not.toThrow()
  })

  it('accepts display.logo object with alt_text', () => {
    const input = {
      ...validStartIssuanceResponse,
      credential_types: [
        {
          ...validStartIssuanceResponse.credential_types[0],
          display: {
            name: 'EU Personal ID',
            logo: {
              uri: 'https://issuer.example.eu/logo.svg',
              alt_text: 'Issuer mark',
            },
          },
        },
      ],
    }
    expect(() => validateStartIssuanceResponse(input)).not.toThrow()
  })

  it('throws ContractError when the response is null', () => {
    expect(() => validateStartIssuanceResponse(null)).toThrow(ContractError)
  })

  it('throws ContractError when the response is a string', () => {
    expect(() => validateStartIssuanceResponse('bad')).toThrow(ContractError)
  })
})

describe('validateCredentialRecord', () => {
  it('accepts a valid credential record', () => {
    const result = validateCredentialRecord(validCredentialRecord)
    expect(result).toEqual(validCredentialRecord)
  })

  it('accepts a record with null expires_at', () => {
    const input = { ...validCredentialRecord, expires_at: null }
    const result = validateCredentialRecord(input)
    expect(result.expires_at).toBeNull()
  })

  it('accepts a record with additional claim properties', () => {
    const input = {
      ...validCredentialRecord,
      claims: { given_name: 'Jane', birth_date: '1990-01-01', age_over_18: true },
    }
    expect(() => validateCredentialRecord(input)).not.toThrow()
  })

  it('throws ContractError for unknown status', () => {
    const input = { ...validCredentialRecord, status: 'pending' }
    expect(() => validateCredentialRecord(input)).toThrow(ContractError)
  })

  it('throws ContractError for unknown format', () => {
    const input = { ...validCredentialRecord, format: 'jwt' }
    expect(() => validateCredentialRecord(input)).toThrow(ContractError)
  })

  it('throws ContractError when id is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...rest } = validCredentialRecord
    expect(() => validateCredentialRecord(rest)).toThrow(ContractError)
  })

  it('throws ContractError when claims is an array instead of an object', () => {
    const input = { ...validCredentialRecord, claims: ['a', 'b'] }
    expect(() => validateCredentialRecord(input)).toThrow(ContractError)
  })

  it('throws ContractError when claims is null', () => {
    const input = { ...validCredentialRecord, claims: null }
    expect(() => validateCredentialRecord(input)).toThrow(ContractError)
  })

  it('throws ContractError when the response is not an object', () => {
    expect(() => validateCredentialRecord(42)).toThrow(ContractError)
  })
})

describe('validateCredentialListResponse', () => {
  it('accepts a response with multiple credentials', () => {
    const input = {
      credentials: [validCredentialRecord, { ...validCredentialRecord, id: 'cred-2' }],
    }
    const result = validateCredentialListResponse(input)
    expect(result.credentials).toHaveLength(2)
  })

  it('accepts a response with an empty credentials array', () => {
    const result = validateCredentialListResponse({ credentials: [] })
    expect(result.credentials).toEqual([])
  })

  it('throws when credentials is not an array', () => {
    expect(() => validateCredentialListResponse({ credentials: null })).toThrow()
  })

  it('throws when a credential entry is invalid, with index in the error message', () => {
    const input = {
      credentials: [validCredentialRecord, { ...validCredentialRecord, format: 'bad' }],
    }
    try {
      validateCredentialListResponse(input)
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).message).toContain('credentials[1]')
    }
  })

  it('stringifies non-Error throws while preserving credentials index', () => {
    const badRecord = {
      get id() {
        throw 'id getter failed'
      },
      credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
      format: 'dc+sd-jwt',
      issuer: 'https://issuer.example.eu',
      status: 'active',
      issued_at: '2026-04-08T14:35:00Z',
      expires_at: null,
      claims: {},
    }

    try {
      validateCredentialListResponse({ credentials: [badRecord] })
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).message).toContain('credentials[0]')
      expect((err as Error).message).toContain('id getter failed')
    }
  })

  it('throws ContractError when the response has no credentials field', () => {
    expect(() => validateCredentialListResponse({ items: [] })).toThrow()
  })
})
