import type {
  PresentationConsentResponse,
  StartPresentationResponse,
} from '../../types/presentation'

export function isMockPresentationEnabled(): boolean {
  return import.meta.env.VITE_MOCK_PRESENTATION === 'true'
}

function mockDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createMockStartResponse(): StartPresentationResponse {
  return {
    session_id: 'demo-session-001',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    flow: 'cross_device',
    verifier: {
      name: 'SecureBank AG',
      verified: true,
      verification_method: 'pre-registered',
      logo_uri: 'https://via.placeholder.com/64?text=SB',
      policy_uri: 'https://securebank.example.com/privacy',
    },
    purpose: 'We need to verify your identity to open a new online banking account.',
    credential_matches: [
      {
        query_id: 'identity',
        required: true,
        candidates: [
          {
            credential_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            display: {
              name: 'EU Digital Identity Wallet',
              issuer_name: 'GovID Authority',
              credential_type: 'eu.europa.ec.eudi.pid.1',
              description: 'Your official European digital identity credential.',
              background_color: '#e8f4f8',
              text_color: '#1a3c5a',
              logo: {
                uri: 'https://via.placeholder.com/64?text=ID',
                alt_text: 'GovID logo',
              },
            },
            requested_claims: [
              { path: ['given_name'], display_name: 'Given name', value_required: true },
              {
                path: ['family_name'],
                display_name: 'Family name',
                value_required: true,
              },
              {
                path: ['birth_date'],
                display_name: 'Date of birth',
                value_required: false,
              },
            ],
          },
        ],
      },
    ],
    requires_consent: true,
  }
}

const MOCK_CONSENT_RESPONSE: PresentationConsentResponse = {
  status: 'completed',
  redirect_uri: null,
  verifier_response: null,
}

export async function mockStartPresentation(): Promise<StartPresentationResponse> {
  await mockDelay()
  return createMockStartResponse()
}

export async function mockSubmitPresentationConsent(): Promise<PresentationConsentResponse> {
  await mockDelay()
  return MOCK_CONSENT_RESPONSE
}
