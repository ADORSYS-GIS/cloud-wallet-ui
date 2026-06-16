// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProofDetailsPage } from '../ProofDetailsPage'
import type { CredentialMatch, VerifierDisplay } from '../../../types/presentation'

const verifier: VerifierDisplay = {
  name: 'Verifier App',
  logo_uri: 'https://verifier.example/logo.png',
  policy_uri: 'https://verifier.example/privacy',
  verified: true,
  verification_method: 'x509_san_dns',
}

const credentialMatches: CredentialMatch[] = [
  {
    query_id: 'username_credential',
    required: true,
    candidates: [
      {
        credential_id: 'cred-username-1',
        display: {
          name: 'Username Credential',
          issuer_name: 'Example Issuer',
          credential_type: 'dc+sd-jwt',
        },
        requested_claims: [{ path: ['username'], display_name: 'Username' }],
      },
    ],
  },
]

describe('ProofDetailsPage', () => {
  afterEach(() => cleanup())

  it('renders headings, verifier info, and requested claims', () => {
    render(
      <ProofDetailsPage
        verifier={verifier}
        credentialMatches={credentialMatches}
        onShare={vi.fn()}
        onDecline={vi.fn()}
      />
    )

    expect(screen.getByText('Select a Claim')).toBeTruthy()
    expect(screen.getByText('to present to')).toBeTruthy()
    expect(screen.getByText('Verifier App')).toBeTruthy()
    expect(screen.getByText('Privacy policy')).toBeTruthy()
    expect(screen.getByText('Credentials to share')).toBeTruthy()
    expect(screen.getByText('Required')).toBeTruthy()
    expect(screen.getByText('Username')).toBeTruthy()
  })

  it('calls share and decline handlers', async () => {
    const onShare = vi.fn()
    const onDecline = vi.fn()
    const user = userEvent.setup()

    render(
      <ProofDetailsPage
        verifier={verifier}
        credentialMatches={credentialMatches}
        onShare={onShare}
        onDecline={onDecline}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Share' }))
    await user.click(screen.getByRole('button', { name: 'Decline' }))

    expect(onShare).toHaveBeenCalledTimes(1)
    expect(onDecline).toHaveBeenCalledTimes(1)
  })

  it('disables Share and Decline only while share submission is in flight', () => {
    render(
      <ProofDetailsPage
        verifier={verifier}
        credentialMatches={credentialMatches}
        onShare={vi.fn()}
        onDecline={vi.fn()}
        isShareSubmitting
      />
    )

    expect(screen.getByRole('button', { name: 'Share' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Decline' })).toHaveProperty(
      'disabled',
      true
    )
  })

  it('keeps Decline enabled when not sharing', () => {
    render(
      <ProofDetailsPage
        verifier={verifier}
        credentialMatches={credentialMatches}
        onShare={vi.fn()}
        onDecline={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Decline' })).toHaveProperty(
      'disabled',
      false
    )
  })
})
