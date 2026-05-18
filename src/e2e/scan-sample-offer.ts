/**
 * Stable credential-offer string for E2E (must parse via `parseCredentialOfferInput`).
 * Only referenced from ScanPage when `import.meta.env.VITE_E2E === 'true'` (e2e build).
 */
export const E2E_CREDENTIAL_CONFIGURATION_ID = 'e2e_pid_v1'

const inlineOffer = {
  credential_issuer: 'https://issuer.example.com',
  credential_configuration_ids: [E2E_CREDENTIAL_CONFIGURATION_ID],
}

export const E2E_SCAN_SAMPLE_OFFER =
  'openid-credential-offer://?credential_offer=' +
  encodeURIComponent(JSON.stringify(inlineOffer))
