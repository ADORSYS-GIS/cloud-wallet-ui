import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ContractError,
  parseValidatedSsePayload,
  validateCredentialListResponse,
  validateCredentialRecord,
  validateSseCompletedEvent,
  validateSseFailedEvent,
  validateSseProcessingEvent,
  validateStartIssuanceResponse,
  validateTenantRegistrationResponse,
} from '../validation'
import type { StartIssuanceResponse } from '../../types/issuance'
import type { CredentialRecord } from '../../types/credential'

const validStartIssuanceResponse: StartIssuanceResponse = {
  session_id: 'ses_abc123',
  expires_at: '2026-04-08T14:35:00Z',
  credential_issuer: 'https://issuer.example.eu',
  issuer: [
    {
      name: 'Example Issuer',
      locale: 'en-US',
      logo: {
        uri: 'https://issuer.example.eu/logo.png',
        alt_text: 'Issuer logo',
      },
      description: 'An example issuer',
    },
  ],
  credential_types: [
    {
      credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
      format: 'dc+sd-jwt',
      display: [
        {
          name: 'EU Personal ID',
          description: 'Official EU personal identity document',
          background_color: '#12107c',
          text_color: '#ffffff',
          logo: null,
        },
      ],
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

  it('accepts empty display array on issuer', () => {
    const input = {
      ...validStartIssuanceResponse,
      issuer: [],
    }
    expect(() => validateStartIssuanceResponse(input)).not.toThrow()
  })

  it('accepts display entry without optional fields', () => {
    const input = {
      ...validStartIssuanceResponse,
      issuer: [{ name: 'Minimal Issuer' }],
    }
    expect(() => validateStartIssuanceResponse(input)).not.toThrow()
  })

  it('accepts display entry with only logo', () => {
    const input = {
      ...validStartIssuanceResponse,
      issuer: [
        {
          logo: {
            uri: 'https://issuer.example.eu/logo.png',
            alt_text: 'Issuer logo',
          },
        },
      ],
    }
    expect(() => validateStartIssuanceResponse(input)).not.toThrow()
  })

  it('throws ContractError when issuer is not an array', () => {
    const input = {
      ...validStartIssuanceResponse,
      issuer: {
        credential_issuer: 'https://issuer.example.eu',
        display_name: 'Example Issuer',
        logo_uri: null,
      },
    }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when session_id is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { session_id: _, ...rest } = validStartIssuanceResponse
    expect(() => validateStartIssuanceResponse(rest)).toThrow(ContractError)
  })

  it('throws ContractError when expires_at is not a valid date-time', () => {
    const input = { ...validStartIssuanceResponse, expires_at: 'not-a-date' }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
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
          format: 'dc+sd-jwt',
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
          display: [{ name: 'Only Name' }],
        },
      ],
    }
    expect(() => validateStartIssuanceResponse(input)).not.toThrow()
  })

  it('throws ContractError when display.logo object omits alt_text', () => {
    const input = {
      ...validStartIssuanceResponse,
      credential_types: [
        {
          ...validStartIssuanceResponse.credential_types[0],
          display: [
            {
              name: 'EU Personal ID',
              logo: { uri: 'https://issuer.example.eu/logo.svg' },
            },
          ],
        },
      ],
    }
    expect(() => validateStartIssuanceResponse(input)).toThrow(ContractError)
  })

  it('accepts display.logo object with alt_text', () => {
    const input = {
      ...validStartIssuanceResponse,
      credential_types: [
        {
          ...validStartIssuanceResponse.credential_types[0],
          display: [
            {
              name: 'EU Personal ID',
              logo: {
                uri: 'https://issuer.example.eu/logo.svg',
                alt_text: 'Issuer mark',
              },
            },
          ],
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

  it('accepts a record with undefined expires_at (field omitted)', () => {
    const { expires_at: _, ...rest } = validCredentialRecord
    const result = validateCredentialRecord(rest)
    expect(result.expires_at).toBeUndefined()
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

  it('accepts null claims and converts to empty object', () => {
    const input = { ...validCredentialRecord, claims: null }
    const result = validateCredentialRecord(input)
    expect(result.claims).toEqual({})
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

describe('validateTenantRegistrationResponse', () => {
  const validTenantResponse = {
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'adorsys GmbH',
  }

  it('accepts a valid tenant registration response', () => {
    const result = validateTenantRegistrationResponse(validTenantResponse)
    expect(result).toEqual(validTenantResponse)
  })

  it('throws ContractError when tenant_id is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tenant_id: _, ...rest } = validTenantResponse
    expect(() => validateTenantRegistrationResponse(rest)).toThrow(ContractError)
  })

  it('throws ContractError when tenant_id is not a string', () => {
    const input = { ...validTenantResponse, tenant_id: 123 }
    expect(() => validateTenantRegistrationResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when tenant_id is not a valid UUID format', () => {
    const input = { ...validTenantResponse, tenant_id: 'not-a-uuid' }
    expect(() => validateTenantRegistrationResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when tenant_id has invalid UUID pattern (missing dashes)', () => {
    const input = {
      ...validTenantResponse,
      tenant_id: 'f47ac10b58cc4372a5670e02b2c3d479',
    }
    expect(() => validateTenantRegistrationResponse(input)).toThrow(ContractError)
  })

  it('throws ContractError when tenant_id has invalid UUID pattern (wrong length)', () => {
    const input = {
      ...validTenantResponse,
      tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47',
    }
    expect(() => validateTenantRegistrationResponse(input)).toThrow(ContractError)
  })

  it('accepts valid UUID with uppercase letters', () => {
    const input = {
      ...validTenantResponse,
      tenant_id: 'F47AC10B-58CC-4372-A567-0E02B2C3D479',
    }
    const result = validateTenantRegistrationResponse(input)
    expect(result.tenant_id).toBe('F47AC10B-58CC-4372-A567-0E02B2C3D479')
  })

  it('throws ContractError when name is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: _, ...rest } = validTenantResponse
    expect(() => validateTenantRegistrationResponse(rest)).toThrow(ContractError)
  })

  it('throws ContractError when name is not a string', () => {
    const input = { ...validTenantResponse, name: 123 }
    expect(() => validateTenantRegistrationResponse(input)).toThrow(ContractError)
  })

  it('accepts empty string for name (valid per OpenAPI spec)', () => {
    const input = { ...validTenantResponse, name: '' }
    const result = validateTenantRegistrationResponse(input)
    expect(result.name).toBe('')
  })

  it('throws ContractError when response is not an object', () => {
    expect(() => validateTenantRegistrationResponse(null)).toThrow(ContractError)
    expect(() => validateTenantRegistrationResponse('string')).toThrow(ContractError)
    expect(() => validateTenantRegistrationResponse(123)).toThrow(ContractError)
    expect(() => validateTenantRegistrationResponse([])).toThrow(ContractError)
  })
})

const SSE_CRED_UUID = 'c3d4e5f6-7890-abcd-ef12-3456789abcde'
const SSE_CRED_UUID_2 = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'

describe('validateSseProcessingEvent', () => {
  it('accepts a spec-shaped processing payload', () => {
    const record = {
      event: 'processing',
      session_id: 'ses_1',
      state: 'processing',
      step: 'requesting_credential',
    }
    expect(validateSseProcessingEvent(record)).toEqual(record)
  })

  it('rejects wrong state', () => {
    expect(
      validateSseProcessingEvent({
        event: 'processing',
        session_id: 'ses_1',
        state: 'completed',
        step: 'requesting_credential',
      })
    ).toBeNull()
  })

  it('rejects unknown step', () => {
    expect(
      validateSseProcessingEvent({
        event: 'processing',
        session_id: 'ses_1',
        state: 'processing',
        step: 'custom_step',
      })
    ).toBeNull()
  })

  it('rejects missing session_id', () => {
    expect(
      validateSseProcessingEvent({
        event: 'processing',
        state: 'processing',
        step: 'requesting_credential',
      } as Record<string, unknown>)
    ).toBeNull()
  })
})

describe('validateSseCompletedEvent', () => {
  it('accepts parallel arrays with UUID credential ids', () => {
    const record = {
      event: 'completed',
      session_id: 'ses_1',
      state: 'completed',
      credential_ids: [SSE_CRED_UUID],
      credential_types: ['eu.europa.ec.eudi.pid.1'],
    }
    expect(validateSseCompletedEvent(record)).toEqual(record)
  })

  it('rejects non-UUID credential id', () => {
    expect(
      validateSseCompletedEvent({
        event: 'completed',
        session_id: 'ses_1',
        state: 'completed',
        credential_ids: ['not-a-uuid'],
        credential_types: ['t1'],
      })
    ).toBeNull()
  })

  it('rejects mismatched array lengths', () => {
    expect(
      validateSseCompletedEvent({
        event: 'completed',
        session_id: 'ses_1',
        state: 'completed',
        credential_ids: [SSE_CRED_UUID, SSE_CRED_UUID_2],
        credential_types: ['t1'],
      })
    ).toBeNull()
  })
})

describe('validateSseFailedEvent', () => {
  it('accepts null error_description', () => {
    const record = {
      event: 'failed',
      session_id: 'ses_1',
      state: 'failed',
      error: 'access_denied',
      error_description: null,
      step: 'authorization',
    }
    expect(validateSseFailedEvent(record)).toEqual(record)
  })

  it('rejects missing error_description key', () => {
    expect(
      validateSseFailedEvent({
        event: 'failed',
        session_id: 'ses_1',
        state: 'failed',
        error: 'x',
        step: 'internal',
      } as Record<string, unknown>)
    ).toBeNull()
  })

  it('rejects invalid step', () => {
    expect(
      validateSseFailedEvent({
        event: 'failed',
        session_id: 'ses_1',
        state: 'failed',
        error: 'x',
        error_description: 'msg',
        step: 'unknown_step',
      })
    ).toBeNull()
  })
})

describe('parseValidatedSsePayload', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs and returns null for unknown event line type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseValidatedSsePayload('heartbeat', {})).toBeNull()
    expect(warn).toHaveBeenCalled()
  })

  it('merges event line over conflicting JSON event field', () => {
    const v = parseValidatedSsePayload('processing', {
      event: 'completed',
      session_id: 'ses_x',
      state: 'processing',
      step: 'exchanging_token',
    })
    expect(v).not.toBeNull()
    if (v?.event === 'processing') {
      expect(v.step).toBe('exchanging_token')
    }
  })
})
