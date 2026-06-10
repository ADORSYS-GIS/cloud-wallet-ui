// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProofDetailsPage } from '../ProofDetailsPage'
import type {
  ParsedPresentationRequest,
  VerifierMetadata,
} from '../../../types/presentation'

const request: ParsedPresentationRequest = {
  client_id: 'https://verifier.example',
  nonce: 'nonce-123',
  response_type: 'vp_token',
  response_mode: 'direct_post',
  dcql_query: {
    credentials: [
      {
        id: 'identity',
        format: 'dc+sd-jwt',
        meta: {
          vct_values: ['https://credentials.example.com/identity_credential'],
        },
        claims: [{ path: ['username'], values: ['francis'] }],
      },
    ],
  },
}

const verifier: VerifierMetadata = {
  client_id: 'https://verifier.example',
  name: 'Verifier App',
  logo_uri: 'https://verifier.example/logo.png',
  client_metadata: {
    purpose: 'Verify your identity for login.',
  },
}

describe('ProofDetailsPage', () => {
  afterEach(() => cleanup())

  it('renders Figma headings and verifier request details', () => {
    render(
      <ProofDetailsPage
        request={request}
        verifier={verifier}
        onShare={vi.fn()}
        onDecline={vi.fn()}
      />
    )

    expect(screen.getByText('Select a Claim')).toBeTruthy()
    expect(screen.getByText('to present to')).toBeTruthy()
    expect(screen.getByText('is requesting the following credentials:')).toBeTruthy()
    expect(screen.getAllByText('Verifier App').length).toBeGreaterThan(0)
    expect(screen.getByText('Username')).toBeTruthy()
    expect(screen.getByText('francis')).toBeTruthy()
    expect(screen.getByText('Verifier information')).toBeTruthy()
  })

  it('calls share and decline handlers', async () => {
    const onShare = vi.fn()
    const onDecline = vi.fn()
    const user = userEvent.setup()

    render(
      <ProofDetailsPage
        request={request}
        verifier={verifier}
        onShare={onShare}
        onDecline={onDecline}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Share' }))
    await user.click(screen.getByRole('button', { name: 'Decline' }))

    expect(onShare).toHaveBeenCalledTimes(1)
    expect(onDecline).toHaveBeenCalledTimes(1)
  })

  it('renders scope-based requests', () => {
    render(
      <ProofDetailsPage
        request={{
          ...request,
          dcql_query: undefined,
          scope: 'com.example.IDCardCredential_presentation',
        }}
        verifier={verifier}
        onShare={vi.fn()}
        onDecline={vi.fn()}
      />
    )

    expect(screen.getByText('Requested scope')).toBeTruthy()
    expect(screen.getByText('Com Example IDCard Credential Presentation')).toBeTruthy()
  })
})
