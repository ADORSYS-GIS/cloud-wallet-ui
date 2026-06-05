import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/client'
import { presentationActivityUserMessage } from '../presentationActivityErrors'

describe('presentationActivityUserMessage', () => {
  it('maps list 404 to a user-friendly message without API path', () => {
    const message = presentationActivityUserMessage(
      new ApiError(404, 'GET /presentation/activity?page=1 failed with 404'),
      'list'
    )
    expect(message).toBe(
      'Activity history is not available right now. Try again later or contact your administrator if this continues.'
    )
    expect(message).not.toContain('GET /presentation/activity')
    expect(message).not.toContain('404')
  })

  it('prefers server error_description when present', () => {
    const message = presentationActivityUserMessage(
      new ApiError(404, 'technical', {
        errorCode: 'not_found',
        errorDescription: 'Presentation activity is not enabled for this tenant.',
      }),
      'list'
    )
    expect(message).toBe('Presentation activity is not enabled for this tenant.')
  })

  it('maps detail 404 separately', () => {
    const message = presentationActivityUserMessage(new ApiError(404, 'not found'), 'detail')
    expect(message).toContain('could not be found')
  })

  it('maps delete failures', () => {
    const message = presentationActivityUserMessage(new ApiError(500, 'server error'), 'delete')
    expect(message).toContain('delete')
  })
})
