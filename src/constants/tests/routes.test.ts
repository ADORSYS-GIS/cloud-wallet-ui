import { describe, expect, it } from 'vitest'
import {
  credentialDetailPath,
  credentialTypeDetailsPath,
  issuanceSuccessPath,
  presentationActivityDetailPath,
} from '../routes'

const ACTIVITY_ID = 'c3d4e5f6-7890-abcd-ef12-3456789abcde'

describe('routes helpers', () => {
  it('builds credential type details path with encoding', () => {
    expect(credentialTypeDetailsPath('a/b')).toBe('/credential-types/a%2Fb')
  })

  it('builds credential detail path with encoding', () => {
    expect(credentialDetailPath('id with space')).toBe('/credentials/id%20with%20space')
  })

  it('builds issuance success path with credential id', () => {
    expect(issuanceSuccessPath('cred-1')).toBe('/issuance/success/cred-1')
  })

  it('builds issuance success path without credential id', () => {
    expect(issuanceSuccessPath()).toBe('/issuance/success')
  })

  it('builds presentation activity detail path with encoding', () => {
    expect(presentationActivityDetailPath(ACTIVITY_ID)).toBe(
      `/activity/${encodeURIComponent(ACTIVITY_ID)}`
    )
  })
})
