import { describe, expect, it } from 'vitest'
import {
  credentialDetailPath,
  credentialTypeDetailsPath,
  issuanceSuccessPath,
} from '../routes'

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
})
