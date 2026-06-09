// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'

vi.mock('../../api/presentationActivity', () => ({
  getPresentationActivity: vi.fn(),
  deletePresentationActivity: vi.fn(),
}))

import {
  deletePresentationActivity,
  getPresentationActivity,
} from '../../api/presentationActivity'
import { usePresentationActivity } from '../usePresentationActivity'

const mockGet = vi.mocked(getPresentationActivity)
const mockDelete = vi.mocked(deletePresentationActivity)

const record = {
  id: 'a1111111-1111-4111-8111-111111111111',
  presented_at: '2026-06-01T10:00:00Z',
  verifier: {
    client_id: 'redirect_uri:https://verifier.example/cb',
    name: 'Example Verifier',
    logo_uri: null,
  },
  credential_types: ['eu.europa.ec.eudi.pid.1'],
  disclosed_claim_count: 1,
}

describe('usePresentationActivity', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockDelete.mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('does not surface an error when the initial list load fails', async () => {
    mockGet.mockRejectedValue(new ApiError(404, 'not found'))

    const { result } = renderHook(() => usePresentationActivity())

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      { timeout: 2000 }
    )

    expect(result.current.items).toEqual([])
    expect(result.current.errorMessage).toBeNull()
  })

  it('does not surface an error when the backend is unreachable', async () => {
    mockGet.mockRejectedValue(new TypeError('Failed to fetch'))

    const { result } = renderHook(() => usePresentationActivity())

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      { timeout: 2000 }
    )

    expect(result.current.items).toEqual([])
    expect(result.current.errorMessage).toBeNull()
  })

  it('clears error message after successful delete', async () => {
    mockGet.mockResolvedValue({
      items: [record],
      total: 1,
      page: 1,
      page_size: 20,
    })
    mockDelete.mockResolvedValue(undefined)

    const { result } = renderHook(() => usePresentationActivity())

    await waitFor(
      () => {
        expect(result.current.items).toHaveLength(1)
      },
      { timeout: 2000 }
    )

    act(() => {
      result.current.reportError('Could not delete this presentation record.')
    })

    expect(result.current.errorMessage).not.toBeNull()

    await act(async () => {
      await result.current.removeItem(record.id)
    })

    expect(result.current.errorMessage).toBeNull()
    expect(result.current.items).toHaveLength(0)
  })
})
