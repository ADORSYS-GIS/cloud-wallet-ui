import { describe, expect, it } from 'vitest'
import { sanitizeRequestBodyForLog } from '../debugApiLogger'

describe('sanitizeRequestBodyForLog', () => {
  it('truncates long offer strings', () => {
    const offer = 'x'.repeat(300)
    const out = sanitizeRequestBodyForLog({ offer }) as { offer: string }
    expect(out.offer).toContain('…')
    expect(out.offer).toContain('300 chars total')
    expect(out.offer.length).toBeLessThan(250)
  })

  it('leaves short bodies unchanged', () => {
    expect(sanitizeRequestBodyForLog({ offer: 'short' })).toEqual({ offer: 'short' })
  })
})
