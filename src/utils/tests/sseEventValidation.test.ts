import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  parseValidatedSsePayload,
  validateSseCompletedEvent,
  validateSseFailedEvent,
  validateSseProcessingEvent,
} from '../sseEventValidation'

const CRED_UUID = 'c3d4e5f6-7890-abcd-ef12-3456789abcde'
const CRED_UUID_2 = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'

afterEach(() => {
  vi.restoreAllMocks()
})

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
      credential_ids: [CRED_UUID],
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
        credential_ids: [CRED_UUID, CRED_UUID_2],
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
