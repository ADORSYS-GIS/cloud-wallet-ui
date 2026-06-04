import { describe, expect, it } from 'vitest'
import {
  filterWithinRetentionWindow,
  sortPresentationActivityNewestFirst,
  verifierDisplayLabel,
} from '../presentationActivity'
import type { PresentationActivityRecord } from '../../types/presentationActivity'

const now = Date.now()

function record(presentedAt: string): PresentationActivityRecord {
  return {
    id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
    presented_at: presentedAt,
    verifier: {
      client_id: 'redirect_uri:https://verifier.example/cb',
      name: 'Verifier Co',
    },
    credential_types: ['t1'],
    disclosed_claim_count: 2,
  }
}

describe('sortPresentationActivityNewestFirst', () => {
  it('orders by presented_at descending', () => {
    const sorted = sortPresentationActivityNewestFirst([
      record(new Date(now - 86_400_000).toISOString()),
      record(new Date(now).toISOString()),
    ])
    expect(Date.parse(sorted[0].presented_at)).toBeGreaterThan(
      Date.parse(sorted[1].presented_at)
    )
  })
})

describe('filterWithinRetentionWindow', () => {
  it('removes records older than retention days', () => {
    const recent = record(new Date(now).toISOString())
    const old = record(new Date(now - 40 * 86_400_000).toISOString())
    const filtered = filterWithinRetentionWindow([recent, old], 30)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe(recent.id)
  })
})

describe('verifierDisplayLabel', () => {
  it('prefers verifier name when set', () => {
    expect(verifierDisplayLabel({ client_id: 'x', name: 'My Verifier' })).toBe(
      'My Verifier'
    )
  })

  it('strips client_id prefix when name is missing', () => {
    expect(
      verifierDisplayLabel({ client_id: 'redirect_uri:https://verifier.example/cb' })
    ).toBe('https://verifier.example/cb')
  })
})
