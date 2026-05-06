// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSseStream, useConsentFlow } from '../useSseStream'

const MOCK_TOKEN = 'mock.bearer.jwt'

vi.mock('../../auth/authService', () => ({
  getBearerToken: vi.fn(async () => MOCK_TOKEN),
}))

vi.mock('../../utils/env', () => ({
  getApiBaseUrl: vi.fn(() => 'http://api.test/api/v1'),
}))

import { getBearerToken } from '../../auth/authService'
const mockGetBearerToken = vi.mocked(getBearerToken)

/**
 * Build a ReadableStream that yields the provided SSE frame strings and then
 * closes. Each string should already be a complete SSE frame, e.g.:
 *   "event: processing\ndata: {...}\n\n"
 */
function makeStream(...frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index < frames.length) {
        controller.enqueue(encoder.encode(frames[index++]))
      } else {
        controller.close()
      }
    },
  })
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

type MockFetchOptions = {
  ok?: boolean
  status?: number
  body?: ReadableStream<Uint8Array> | null
}

function mockFetch(opts: MockFetchOptions = {}) {
  const { ok = true, status = 200, body = makeStream() } = opts
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return vi.fn(async (_url: unknown, _init: unknown) => ({
    ok,
    status,
    body,
  }))
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('useSseStream — BearerAuth via Authorization header (spec compliance)', () => {
  it('sends Authorization: Bearer <token> on the SSE fetch request', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_abc')
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>

    expect(headers['Authorization']).toBe(`Bearer ${MOCK_TOKEN}`)
    expect(url).toBe('http://api.test/api/v1/issuance/ses_abc/events')
  })

  it('sends Accept: text/event-stream on the SSE fetch request', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_abc')
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>

    expect(headers['Accept']).toBe('text/event-stream')
  })

  it('calls getBearerToken before opening the fetch connection', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_abc')
    })

    await waitFor(() => expect(mockGetBearerToken).toHaveBeenCalledOnce())
    // fetch must only be called after the token is available
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does NOT open a fetch connection when getBearerToken rejects', async () => {
    mockGetBearerToken.mockRejectedValueOnce(new Error('key store unavailable'))
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_fail')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('failed'))

    // No unauthenticated request must be made
    expect(fetchMock).not.toHaveBeenCalled()

    if (result.current.streamStatus.status === 'failed') {
      expect(result.current.streamStatus.error).toBe('unauthorized')
    }
  })

  it('transitions to failed with unauthorized when the server returns 401', async () => {
    const fetchMock = mockFetch({ ok: false, status: 401, body: null })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_401')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('failed'))

    if (result.current.streamStatus.status === 'failed') {
      expect(result.current.streamStatus.error).toBe('unauthorized')
    }
  })

  it('URL-encodes the sessionId in the request path', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses/with spaces')
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

    const [url] = fetchMock.mock.calls[0] as [string, unknown]
    expect(url).toContain(encodeURIComponent('ses/with spaces'))
  })

  it('passes an AbortSignal to fetch so the stream can be cancelled', async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_signal')
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('useSseStream — event handling', () => {
  it('transitions to processing when a processing event is received', async () => {
    const stream = makeStream(
      sseFrame('processing', {
        session_id: 'ses_proc',
        state: 'processing',
        step: 'requesting_credential',
      })
    )
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_proc')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('processing'))

    if (result.current.streamStatus.status === 'processing') {
      expect(result.current.streamStatus.step).toBe('requesting_credential')
    }
  })

  it('transitions to completed on completed event', async () => {
    const stream = makeStream(
      sseFrame('completed', {
        session_id: 'ses_done',
        state: 'completed',
        credential_ids: ['cred-uuid-1'],
        credential_types: ['eu.europa.ec.eudi.pid.1'],
      })
    )
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_done')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('completed'))

    if (result.current.streamStatus.status === 'completed') {
      expect(result.current.streamStatus.credentialIds).toEqual(['cred-uuid-1'])
      expect(result.current.streamStatus.credentialTypes).toEqual([
        'eu.europa.ec.eudi.pid.1',
      ])
    }
  })

  it('transitions to failed on failed event', async () => {
    const stream = makeStream(
      sseFrame('failed', {
        session_id: 'ses_fail',
        state: 'failed',
        error: 'access_denied',
        error_description: 'The user denied authorization.',
        step: 'authorization',
      })
    )
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_fail')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('failed'))

    if (result.current.streamStatus.status === 'failed') {
      expect(result.current.streamStatus.error).toBe('access_denied')
      expect(result.current.streamStatus.errorDescription).toBe(
        'The user denied authorization.'
      )
      expect(result.current.streamStatus.step).toBe('authorization')
    }
  })

  it('handles multiple processing steps before completed', async () => {
    const stream = makeStream(
      sseFrame('processing', {
        session_id: 'ses_multi',
        state: 'processing',
        step: 'exchanging_token',
      }),
      sseFrame('processing', {
        session_id: 'ses_multi',
        state: 'processing',
        step: 'requesting_credential',
      }),
      sseFrame('completed', {
        session_id: 'ses_multi',
        state: 'completed',
        credential_ids: ['cred-1'],
        credential_types: ['eu.europa.ec.eudi.pid.1'],
      })
    )
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_multi')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('completed'))
  })

  it('transitions to failed when fetch itself throws (network error)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_net')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('failed'))

    if (result.current.streamStatus.status === 'failed') {
      expect(result.current.streamStatus.error).toBe('internal_error')
      expect(result.current.streamStatus.step).toBe('internal')
    }
  })

  it('transitions to failed when the server returns a non-2xx status other than 401', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 404, body: null }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_404')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('failed'))

    if (result.current.streamStatus.status === 'failed') {
      expect(result.current.streamStatus.error).toBe('internal_error')
    }
  })
})

describe('useSseStream — lifecycle', () => {
  it('starts in idle status', () => {
    const { result } = renderHook(() => useSseStream())
    expect(result.current.streamStatus.status).toBe('idle')
  })

  it('transitions to connecting synchronously when openStream is called', () => {
    vi.stubGlobal('fetch', mockFetch())

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_sync')
    })

    // connecting is set before the async getBearerToken resolves
    expect(result.current.streamStatus.status).toBe('connecting')
  })

  it('aborts the previous fetch when openStream is called a second time', async () => {
    let capturedSignal: AbortSignal | undefined

    const fetchMock = vi.fn(async (_url: unknown, init: unknown) => {
      capturedSignal = (init as RequestInit).signal as AbortSignal
      // Return a stream that never closes so the first call stays open
      return {
        ok: true,
        status: 200,
        body: new ReadableStream({ pull() {} }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_first')
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const firstSignal = capturedSignal!

    act(() => {
      result.current.openStream('ses_second')
    })

    // The first request's signal must have been aborted
    await waitFor(() => expect(firstSignal.aborted).toBe(true))
  })

  it('closeStream aborts the active fetch', async () => {
    let capturedSignal: AbortSignal | undefined

    const fetchMock = vi.fn(async (_url: unknown, init: unknown) => {
      capturedSignal = (init as RequestInit).signal as AbortSignal
      return {
        ok: true,
        status: 200,
        body: new ReadableStream({ pull() {} }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_close')
    })

    await waitFor(() => expect(capturedSignal).toBeDefined())

    act(() => {
      result.current.closeStream()
    })

    expect(capturedSignal!.aborted).toBe(true)
  })
})

describe('useSseStream — edge cases and error handling', () => {
  it('transitions to failed when response body is null', async () => {
    const fetchMock = mockFetch({ body: null })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_nobody')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('failed'))

    if (result.current.streamStatus.status === 'failed') {
      expect(result.current.streamStatus.error).toBe('internal_error')
      expect(result.current.streamStatus.errorDescription).toBe(
        'SSE response body is unavailable.'
      )
      expect(result.current.streamStatus.step).toBe('internal')
    }
  })

  it('handles invalid JSON in SSE frame gracefully', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(
          encoder.encode('event: processing\ndata: invalid json here\n\n')
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_badjson')
    })

    // Should remain in connecting state since the invalid frame is skipped
    await waitFor(() => expect(result.current.streamStatus.status).toBe('connecting'))
  })

  it('handles SSE frame with missing event type', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(encoder.encode('data: {"test": "value"}\n\n'))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_noevent')
    })

    // Should remain in connecting state since the frame is skipped
    await waitFor(() => expect(result.current.streamStatus.status).toBe('connecting'))
  })

  it('handles SSE frame with missing data', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(encoder.encode('event: processing\n\n'))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_nodata')
    })

    // Should remain in connecting state since the frame is skipped
    await waitFor(() => expect(result.current.streamStatus.status).toBe('connecting'))
  })

  it('handles empty SSE frames', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(encoder.encode('\n\n\n\n'))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_empty')
    })

    // Should remain in connecting state since empty frames are skipped
    await waitFor(() => expect(result.current.streamStatus.status).toBe('connecting'))
  })

  it('handles stream read errors gracefully', async () => {
    const encoder = new TextEncoder()
    let readCount = 0
    const stream = new ReadableStream({
      pull(controller) {
        readCount++
        if (readCount === 1) {
          controller.enqueue(
            encoder.encode('event: processing\ndata: {"step": "test"}\n\n')
          )
        } else {
          throw new Error('Read error')
        }
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_readerror')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('failed'))

    if (result.current.streamStatus.status === 'failed') {
      expect(result.current.streamStatus.error).toBe('internal_error')
      expect(result.current.streamStatus.errorDescription).toBe(
        'Connection to server lost.'
      )
      expect(result.current.streamStatus.step).toBe('internal')
    }
  })

  it('does not set failed status when stream read error occurs due to abort', async () => {
    let capturedController: AbortController | null = null
    const encoder = new TextEncoder()

    const fetchMock = vi.fn(async (_url: unknown, init: unknown) => {
      capturedController = (init as RequestInit).signal as unknown as AbortController
      return {
        ok: true,
        status: 200,
        body: new ReadableStream({
          async pull(controller) {
            // Simulate a slow stream that gets aborted
            await new Promise((resolve) => setTimeout(resolve, 100))
            if (capturedController?.signal.aborted) {
              throw new Error('Aborted')
            }
            controller.enqueue(
              encoder.encode('event: processing\ndata: {"step": "test"}\n\n')
            )
          },
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_abort_during_read')
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

    // Abort the stream immediately
    act(() => {
      result.current.closeStream()
    })

    // Wait a bit for the abort to process
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Status should not be 'failed' since the abort was intentional
    expect(result.current.streamStatus.status).not.toBe('failed')
  })
})

describe('useConsentFlow', () => {
  it('starts in idle status', () => {
    const { result } = renderHook(() => useConsentFlow())
    expect(result.current.consentStatus.status).toBe('idle')
  })

  it('handles redirect next_action', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.handleConsentResponse(
        {
          session_id: 'ses_test',
          next_action: 'redirect',
          authorization_url: 'https://example.com/auth',
        },
        'ses_test'
      )
    })

    expect(result.current.consentStatus.status).toBe('awaiting_redirect')
    if (result.current.consentStatus.status === 'awaiting_redirect') {
      expect(result.current.consentStatus.authorizationUrl).toBe(
        'https://example.com/auth'
      )
    }
  })

  it('handles provide_tx_code next_action', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.handleConsentResponse(
        {
          session_id: 'ses_test',
          next_action: 'provide_tx_code',
        },
        'ses_test'
      )
    })

    expect(result.current.consentStatus.status).toBe('awaiting_tx_code')
  })

  it('handles none next_action', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.handleConsentResponse(
        {
          session_id: 'ses_test',
          next_action: 'none',
        },
        'ses_test'
      )
    })

    expect(result.current.consentStatus.status).toBe('processing')
    if (result.current.consentStatus.status === 'processing') {
      expect(result.current.consentStatus.step).toBe('')
    }
  })

  it('handles rejected next_action', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.handleConsentResponse(
        {
          session_id: 'ses_test',
          next_action: 'rejected',
        },
        'ses_test'
      )
    })

    expect(result.current.consentStatus.status).toBe('rejected')
  })

  it('updates from SSE processing status', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.updateFromSse({ status: 'processing', step: 'issuing_credential' })
    })

    expect(result.current.consentStatus.status).toBe('processing')
    if (result.current.consentStatus.status === 'processing') {
      expect(result.current.consentStatus.step).toBe('issuing_credential')
    }
  })

  it('updates from SSE completed status', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.updateFromSse({
        status: 'completed',
        credentialIds: ['cred-1', 'cred-2'],
        credentialTypes: ['type1', 'type2'],
      })
    })

    expect(result.current.consentStatus.status).toBe('completed')
    if (result.current.consentStatus.status === 'completed') {
      expect(result.current.consentStatus.credentialIds).toEqual(['cred-1', 'cred-2'])
      expect(result.current.consentStatus.credentialTypes).toEqual(['type1', 'type2'])
    }
  })

  it('updates from SSE failed status', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.updateFromSse({
        status: 'failed',
        error: 'test_error',
        errorDescription: 'Test error description',
        step: 'test_step',
      })
    })

    expect(result.current.consentStatus.status).toBe('failed')
    if (result.current.consentStatus.status === 'failed') {
      expect(result.current.consentStatus.error).toBe('test_error')
      expect(result.current.consentStatus.errorDescription).toBe('Test error description')
    }
  })

  it('resets to idle status', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.handleConsentResponse(
        { session_id: 'ses_test', next_action: 'rejected' },
        'ses_test'
      )
    })
    expect(result.current.consentStatus.status).toBe('rejected')

    act(() => {
      result.current.reset()
    })
    expect(result.current.consentStatus.status).toBe('idle')
  })
})

describe('useSseStream — additional edge cases', () => {
  it('handles SSE frame with only event line (no data)', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Frame with only event line, no data line - should be skipped
        controller.enqueue(encoder.encode('event: processing\n\n'))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_event_only')
    })

    // Should remain in connecting state since frame is skipped (no data)
    await waitFor(() => expect(result.current.streamStatus.status).toBe('connecting'))
  })

  it('handles SSE frame with only data line (no event)', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Frame with only data line, no event line - should be skipped
        controller.enqueue(encoder.encode('data: {"step": "test"}\n\n'))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_data_only')
    })

    // Should remain in connecting state since frame is skipped (no event)
    await waitFor(() => expect(result.current.streamStatus.status).toBe('connecting'))
  })

  it('handles processing event with missing step field', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Processing event without step - should default to empty string
        controller.enqueue(
          encoder.encode('event: processing\ndata: {"session_id": "test"}\n\n')
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_no_step')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('processing'))

    if (result.current.streamStatus.status === 'processing') {
      expect(result.current.streamStatus.step).toBe('')
    }
  })

  it('handles fetch error when aborted during request', async () => {
    const fetchMock = vi.fn(async (_url: unknown, init: unknown) => {
      // Simulate a delay then throw error when aborted
      await new Promise((_, reject) => {
        const checkAbort = setInterval(() => {
          if ((init as RequestInit).signal?.aborted) {
            clearInterval(checkAbort)
            reject(new Error('Aborted'))
          }
        }, 10)
      })
      return { ok: true, status: 200, body: new ReadableStream() }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_abort_fetch')
    })

    // Immediately close to abort during fetch
    act(() => {
      result.current.closeStream()
    })

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Should not be in failed state since abort was intentional
    expect(result.current.streamStatus.status).not.toBe('failed')
  })

  it('handles empty buffer after splitting frames', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Send data that ends with double newline (complete frame, empty buffer)
        controller.enqueue(
          encoder.encode(
            'event: completed\ndata: {"session_id": "test", "credential_ids": ["c1"], "credential_types": ["t1"]}\n\n'
          )
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_empty_buffer')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('completed'))
  })
})

describe('useConsentFlow — additional tests', () => {
  it('handles redirect next_action with missing authorization_url', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.handleConsentResponse(
        {
          session_id: 'ses_test',
          next_action: 'redirect',
          // authorization_url is missing
        },
        'ses_test'
      )
    })

    expect(result.current.consentStatus.status).toBe('awaiting_redirect')
    if (result.current.consentStatus.status === 'awaiting_redirect') {
      expect(result.current.consentStatus.authorizationUrl).toBe('')
    }
  })

  it('updates from SSE failed status with all fields', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.updateFromSse({
        status: 'failed',
        error: 'server_error',
        errorDescription: 'Something went wrong',
        step: 'issuance',
      })
    })

    expect(result.current.consentStatus.status).toBe('failed')
    if (result.current.consentStatus.status === 'failed') {
      expect(result.current.consentStatus.error).toBe('server_error')
      expect(result.current.consentStatus.errorDescription).toBe('Something went wrong')
    }
  })

  it('updates from SSE failed status with null errorDescription', () => {
    const { result } = renderHook(() => useConsentFlow())

    act(() => {
      result.current.updateFromSse({
        status: 'failed',
        error: 'access_denied',
        errorDescription: null,
        step: 'authorization',
      })
    })

    expect(result.current.consentStatus.status).toBe('failed')
    if (result.current.consentStatus.status === 'failed') {
      expect(result.current.consentStatus.error).toBe('access_denied')
      expect(result.current.consentStatus.errorDescription).toBeNull()
    }
  })
})

describe('useSseStream — final edge cases for 100% coverage', () => {
  it('handles SSE frame with data field that has content after prefix', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Frame with data field - tests line 38 (else if branch)
        controller.enqueue(
          encoder.encode('event: processing\ndata: {"step": "test_step"}\n\n')
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_data_content')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('processing'))

    if (result.current.streamStatus.status === 'processing') {
      expect(result.current.streamStatus.step).toBe('test_step')
    }
  })

  it('handles SSE frame with event field that has content after prefix', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Frame with event field - tests line 37 (if branch)
        controller.enqueue(
          encoder.encode(
            'event: completed\ndata: {"credential_ids": ["c1"], "credential_types": ["t1"]}\n\n'
          )
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_event_content')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('completed'))
  })

  it('handles multiple frames where last frame is complete (buffer becomes empty)', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Multiple complete frames ending with \n\n - buffer should become empty string
        controller.enqueue(
          encoder.encode(
            'event: processing\ndata: {"step": "step1"}\n\nevent: completed\ndata: {"credential_ids": ["c1"], "credential_types": ["t1"]}\n\n'
          )
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_multi_frames')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('completed'))
  })

  it('handles completed event and returns immediately (line 181)', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Single completed event - the return statement on line 181 should execute
        controller.enqueue(
          encoder.encode(
            'event: completed\ndata: {"credential_ids": ["cred-123"], "credential_types": ["type-1"]}\n\n'
          )
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_completed_return')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('completed'))

    if (result.current.streamStatus.status === 'completed') {
      expect(result.current.streamStatus.credentialIds).toEqual(['cred-123'])
      expect(result.current.streamStatus.credentialTypes).toEqual(['type-1'])
    }
  })

  it('handles failed event and returns immediately', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Single failed event - the return statement should execute
        controller.enqueue(
          encoder.encode(
            'event: failed\ndata: {"error": "test_error", "error_description": "Test desc", "step": "test_step"}\n\n'
          )
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_failed_return')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('failed'))

    if (result.current.streamStatus.status === 'failed') {
      expect(result.current.streamStatus.error).toBe('test_error')
      expect(result.current.streamStatus.errorDescription).toBe('Test desc')
      expect(result.current.streamStatus.step).toBe('test_step')
    }
  })

  it('covers updateFromSse failed branch explicitly (line 271)', () => {
    const { result } = renderHook(() => useConsentFlow())

    // First set to a different status
    act(() => {
      result.current.updateFromSse({
        status: 'processing',
        step: 'test',
      })
    })
    expect(result.current.consentStatus.status).toBe('processing')

    // Then update to failed - this covers the else if (ss.status === 'failed') branch
    act(() => {
      result.current.updateFromSse({
        status: 'failed',
        error: 'explicit_error',
        errorDescription: 'Explicit error description',
        step: 'explicit_step',
      })
    })

    expect(result.current.consentStatus.status).toBe('failed')
    if (result.current.consentStatus.status === 'failed') {
      expect(result.current.consentStatus.error).toBe('explicit_error')
      expect(result.current.consentStatus.errorDescription).toBe(
        'Explicit error description'
      )
    }
  })

  it('handles SSE frame with lines that are neither event nor data', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        // Frame with comment line (starts with :) and empty line - should be ignored
        controller.enqueue(
          encoder.encode(
            ': this is a comment\nevent: processing\ndata: {"step": "test"}\n\n'
          )
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', mockFetch({ body: stream }))

    const { result } = renderHook(() => useSseStream())

    act(() => {
      result.current.openStream('ses_comment_line')
    })

    await waitFor(() => expect(result.current.streamStatus.status).toBe('processing'))
  })
})
