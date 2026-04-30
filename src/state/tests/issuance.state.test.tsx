// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CredentialOfferProvider,
  useCredentialOfferState,
} from '../issuance.state'

function HookConsumer() {
  const state = useCredentialOfferState()
  return <div>{state.status}</div>
}

function OutsideConsumer() {
  useCredentialOfferState()
  return <div>outside</div>
}

describe('useCredentialOfferState', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<OutsideConsumer />)).toThrow(
      'useCredentialOfferState must be used within CredentialOfferProvider'
    )
  })

  it('provides default idle state inside provider', () => {
    render(
      <CredentialOfferProvider>
        <HookConsumer />
      </CredentialOfferProvider>
    )
    expect(screen.getByText('idle')).toBeDefined()
  })
})
