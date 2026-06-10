import { describe, expect, it } from 'vitest'
import {
  buildCredentialSetGroupDisplays,
  buildRequestedCredentialDisplays,
  detectSecurityWarnings,
  formatClaimPathLabel,
  formatClaimPathLabelForFormat,
  humanizeClaimLabel,
} from '../dcqlDisplay'
import type { DcqlQuery } from '../../../types/presentation'

const dcqlQuery: DcqlQuery = {
  credentials: [
    {
      id: 'identity',
      format: 'dc+sd-jwt',
      meta: {
        vct_values: ['https://credentials.example.com/identity_credential'],
      },
      claims: [
        { id: 'a', path: ['family_name'] },
        { id: 'b', path: ['portrait'] },
      ],
      claim_sets: [['a'], ['b']],
    },
    {
      id: 'mdl',
      format: 'mso_mdoc',
      meta: { doctype_value: 'org.iso.18013.5.1.mDL' },
      claims: [{ path: ['org.iso.18013.5.1', 'given_name'] }],
    },
  ],
  credential_sets: [
    {
      options: [['identity'], ['mdl']],
      required: true,
    },
    {
      options: [['identity']],
      required: false,
    },
  ],
}

describe('dcqlDisplay', () => {
  it('formats claim paths and labels', () => {
    expect(formatClaimPathLabel(['address', 'street_address'])).toBe(
      'address.street_address'
    )
    expect(
      formatClaimPathLabelForFormat(['org.iso.18013.5.1', 'given_name'], 'mso_mdoc')
    ).toBe('org.iso.18013.5.1 → given_name')
    expect(humanizeClaimLabel(['family_name'])).toBe('Family Name')
    expect(humanizeClaimLabel(['org.iso.18013.5.1', 'given_name'], 'mso_mdoc')).toBe(
      'Given Name'
    )
  })

  it('builds requested credential displays', () => {
    const credentials = buildRequestedCredentialDisplays(dcqlQuery)
    expect(credentials).toHaveLength(2)
    expect(credentials[0].formatDisplay.label).toBe('SD-JWT VC')
    expect(credentials[0].claims[0].label).toBe('Family Name')
    expect(credentials[1].typeLabel).toBe('org.iso.18013.5.1.mDL')
  })

  it('builds credential set group summaries', () => {
    const groups = buildCredentialSetGroupDisplays(dcqlQuery)
    expect(groups).toHaveLength(2)
    expect(groups[0].label).toBe('Group A')
    expect(groups[0].required).toBe(true)
    expect(groups[1].label).toBe('Group B')
    expect(groups[1].required).toBe(false)
  })

  it('detects sensitive claim warnings', () => {
    const warnings = detectSecurityWarnings(dcqlQuery)
    expect(warnings.some((warning) => warning.id === 'sensitive-single')).toBe(true)
  })
})
