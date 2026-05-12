import { describe, expect, it } from 'vitest'
import {
  ContractError,
  validateConsentResponse,
  validateTxCodeResponse,
} from '../validation'
import type { ConsentResponse, TxCodeResponse } from '../../types/issuance'

describe('validateConsentResponse', () => {
  const validRedirect: ConsentResponse = {
    session_id: 'ses_7f3kQ2mXpLnVwRtYbHsD9cAeUjZo1Ni',
    next_action: 'redirect',
    authorization_url:
      'https://as.issuer.example.eu/authorize?response_type=code&client_id=wallet.example.eu',
  }

  const validProvideTxCode: ConsentResponse = {
    session_id: 'ses_9aKpR1xWqNmLvYcZbTsE4dBfUhOo2Gj',
    next_action: 'provide_tx_code',
  }

  const validNone: ConsentResponse = {
    session_id: 'ses_5bMnT8yPqKrWxVeAcFdG6hLjUiOl3Em',
    next_action: 'none',
  }

  const validRejected: ConsentResponse = {
    session_id: 'ses_7f3kQ2mXpLnVwRtYbHsD9cAeUjZo1Ni',
    next_action: 'rejected',
  }

  it('accepts a valid redirect response', () => {
    expect(validateConsentResponse(validRedirect)).toEqual(validRedirect)
  })

  it('accepts a valid provide_tx_code response', () => {
    expect(validateConsentResponse(validProvideTxCode)).toEqual(validProvideTxCode)
  })

  it('accepts a valid none response', () => {
    expect(validateConsentResponse(validNone)).toEqual(validNone)
  })

  it('accepts a valid rejected response', () => {
    expect(validateConsentResponse(validRejected)).toEqual(validRejected)
  })

  it('accepts response without authorization_url when next_action is not redirect', () => {
    const result = validateConsentResponse(validNone)
    expect(result.authorization_url).toBeUndefined()
  })

  it('preserves authorization_url when present', () => {
    const result = validateConsentResponse(validRedirect)
    expect(result.authorization_url).toBe(validRedirect.authorization_url)
  })

  it('throws ContractError when session_id is missing', () => {
    const rest = { ...validRedirect }
    delete (rest as Record<string, unknown>).session_id
    expect(() => validateConsentResponse(rest)).toThrow(ContractError)
  })

  it('throws ContractError when session_id is not a string', () => {
    expect(() => validateConsentResponse({ ...validNone, session_id: 42 })).toThrow(
      ContractError
    )
  })

  it('throws ContractError when next_action is missing', () => {
    const rest = { ...validNone }
    delete (rest as Record<string, unknown>).next_action
    expect(() => validateConsentResponse(rest)).toThrow(ContractError)
  })

  it('throws ContractError for unknown next_action value', () => {
    expect(() =>
      validateConsentResponse({ ...validNone, next_action: 'approve' })
    ).toThrow(ContractError)
  })

  it('throws ContractError when next_action is not a string', () => {
    expect(() => validateConsentResponse({ ...validNone, next_action: true })).toThrow(
      ContractError
    )
  })

  it('throws ContractError when authorization_url is present but not a string', () => {
    expect(() =>
      validateConsentResponse({ ...validRedirect, authorization_url: 123 })
    ).toThrow(ContractError)
  })

  it('throws ContractError when the response is null', () => {
    expect(() => validateConsentResponse(null)).toThrow(ContractError)
  })

  it('throws ContractError when the response is a string', () => {
    expect(() => validateConsentResponse('bad')).toThrow(ContractError)
  })

  it('throws ContractError when the response is an array', () => {
    expect(() => validateConsentResponse([])).toThrow(ContractError)
  })

  it('includes field name in error message', () => {
    try {
      validateConsentResponse({ session_id: 'ses_1', next_action: 'unknown_action' })
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ContractError)
      expect((err as ContractError).message).toContain('next_action')
      expect((err as ContractError).message).toContain('unknown_action')
    }
  })

  it('accepts all four valid next_action values', () => {
    const actions = ['redirect', 'provide_tx_code', 'none', 'rejected'] as const
    for (const action of actions) {
      expect(() =>
        validateConsentResponse({ session_id: 'ses_x', next_action: action })
      ).not.toThrow()
    }
  })
})

describe('validateTxCodeResponse', () => {
  const valid: TxCodeResponse = {
    session_id: 'ses_9aKpR1xWqNmLvYcZbTsE4dBfUhOo2Gj',
  }

  it('accepts a valid tx code response', () => {
    expect(validateTxCodeResponse(valid)).toEqual(valid)
  })

  it('returns the session_id from the response', () => {
    const result = validateTxCodeResponse(valid)
    expect(result.session_id).toBe(valid.session_id)
  })

  it('throws ContractError when session_id is missing', () => {
    expect(() => validateTxCodeResponse({})).toThrow(ContractError)
  })

  it('throws ContractError when session_id is not a string', () => {
    expect(() => validateTxCodeResponse({ session_id: 42 })).toThrow(ContractError)
  })

  it('throws ContractError when session_id is null', () => {
    expect(() => validateTxCodeResponse({ session_id: null })).toThrow(ContractError)
  })

  it('throws ContractError when the response is null', () => {
    expect(() => validateTxCodeResponse(null)).toThrow(ContractError)
  })

  it('throws ContractError when the response is a string', () => {
    expect(() => validateTxCodeResponse('ses_abc')).toThrow(ContractError)
  })

  it('throws ContractError when the response is an array', () => {
    expect(() => validateTxCodeResponse([])).toThrow(ContractError)
  })

  it('ignores extra fields (additionalProperties)', () => {
    const withExtra = { session_id: 'ses_abc', extra_field: 'ignored' }
    const result = validateTxCodeResponse(withExtra)
    expect(result).toEqual({ session_id: 'ses_abc' })
  })

  it('includes field name in error message', () => {
    try {
      validateTxCodeResponse({ session_id: 99 })
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ContractError)
      expect((err as ContractError).message).toContain('session_id')
    }
  })
})
