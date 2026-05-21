import type { Page } from '@playwright/test'

import { E2E_CREDENTIAL_CONFIGURATION_ID } from '../../src/e2e/scan-sample-offer'

/** Must match `session_id` returned from mocked `POST /issuance/start`. */
export const E2E_SESSION_ID = 'ses_e2e_playwright_session'

/** Credential id returned in mocked SSE `completed` and `GET /credentials/:id`. */
export const E2E_ISSUED_CREDENTIAL_ID = 'cccccccc-cccc-4ccc-cccc-cccccccccccc'

const MOCK_AUTH_BASE = 'https://mock-authorize.e2e.test'

export type IssuanceStartProfile = 'auth_code' | 'pre_no_tx' | 'pre_tx'

export type InstallApiMockOptions = {
  startProfile: IssuanceStartProfile
  /** Simulated `POST /issuance/start` failures (after QR payload parses). */
  startFailure?: 'invalid_offer' | 'network'
}

function buildStartIssuanceBody(profile: IssuanceStartProfile) {
  const base = {
    session_id: E2E_SESSION_ID,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    credential_issuer: 'https://issuer.e2e.test',
    issuer: [
      {
        name: 'E2E Issuer',
        locale: 'en-US',
      },
    ],
    credential_types: [
      {
        credential_configuration_id: E2E_CREDENTIAL_CONFIGURATION_ID,
        format: 'dc+sd-jwt',
        display: [
          {
            name: 'E2E PID',
            description: 'Playwright fixture credential',
            background_color: '#12107c',
            text_color: '#ffffff',
            logo: null,
          },
        ],
      },
    ],
  }

  if (profile === 'auth_code') {
    return {
      ...base,
      flow: 'authorization_code',
      tx_code_required: false,
      tx_code: null,
    }
  }

  if (profile === 'pre_tx') {
    return {
      ...base,
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: {
        input_mode: 'numeric',
        length: 6,
        description: 'Enter the 6-digit code from the mock issuer.',
      },
    }
  }

  return {
    ...base,
    flow: 'pre_authorized_code',
    tx_code_required: false,
    tx_code: null,
  }
}

/**
 * Intercepts same-origin `/api/v1/**` and the fake authorization-server origin used
 * in the authorization-code scenario. Keeps tests deterministic without a real backend.
 */
function sseProcessingFrame(sessionId: string) {
  return `event: processing\ndata: ${JSON.stringify({
    session_id: sessionId,
    state: 'processing',
    step: 'requesting_credential',
  })}\n\n`
}

function sseCompletedFrame(sessionId: string) {
  return `event: completed\ndata: ${JSON.stringify({
    session_id: sessionId,
    state: 'completed',
    credential_ids: [E2E_ISSUED_CREDENTIAL_ID],
    credential_types: [E2E_CREDENTIAL_CONFIGURATION_ID],
  })}\n\n`
}

export async function installIssuanceApiMock(
  page: Page,
  options: InstallApiMockOptions
): Promise<void> {
  /**
   * For `pre_tx`, `GET /events` must not send `completed` before the user submits the TX code.
   * Playwright `route.fulfill` only accepts string/Buffer bodies (no live streams), so we block
   * the SSE route until `POST .../tx-code` resolves with the full SSE payload.
   */
  let resolvePreTxSseBody: ((body: string) => void) | null = null

  await page.route(`${MOCK_AUTH_BASE}/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html lang="en"><head><title>E2E mock AS</title></head><body><p>Mock authorization server (Playwright)</p></body></html>',
    })
  })

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname
    const method = req.method()

    if (method === 'POST' && path === '/api/v1/tenants') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          tenant_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
          name: 'E2E Tenant',
        }),
      })
      return
    }

    if (method === 'POST' && path === '/api/v1/issuance/start') {
      if (options.startFailure === 'invalid_offer') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_credential_offer',
            error_description: 'Mock: offer rejected by wallet backend.',
          }),
        })
        return
      }
      if (options.startFailure === 'network') {
        await route.abort('failed')
        return
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(buildStartIssuanceBody(options.startProfile)),
      })
      return
    }

    const consentMatch = /^\/api\/v1\/issuance\/([^/]+)\/consent$/.exec(path)
    if (method === 'POST' && consentMatch) {
      const sessionId = consentMatch[1]
      let body: { accepted?: boolean } = {}
      try {
        body = (req.postDataJSON() as { accepted?: boolean }) ?? {}
      } catch {
        body = {}
      }

      if (body.accepted === false) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ session_id: sessionId, next_action: 'rejected' }),
        })
        return
      }

      if (options.startProfile === 'auth_code') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            session_id: sessionId,
            next_action: 'redirect',
            authorization_url: `${MOCK_AUTH_BASE}/authorize?e2e=1`,
          }),
        })
        return
      }

      if (options.startProfile === 'pre_tx') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ session_id: sessionId, next_action: 'provide_tx_code' }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session_id: sessionId, next_action: 'none' }),
      })
      return
    }

    const eventsMatch = /^\/api\/v1\/issuance\/([^/]+)\/events$/.exec(path)
    if (method === 'GET' && eventsMatch) {
      const sessionId = eventsMatch[1]

      if (options.startProfile === 'pre_tx') {
        const body = await new Promise<string>((resolve) => {
          resolvePreTxSseBody = resolve
        })
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
          body,
        })
        return
      }

      const sse = sseProcessingFrame(sessionId) + sseCompletedFrame(sessionId)

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sse,
      })
      return
    }

    if (method === 'POST' && /\/issuance\/[^/]+\/tx-code$/.test(path)) {
      const sid = path.match(/\/issuance\/([^/]+)\//)?.[1] ?? E2E_SESSION_ID
      const releaseSse = resolvePreTxSseBody
      resolvePreTxSseBody = null
      if (options.startProfile === 'pre_tx' && releaseSse) {
        releaseSse(sseProcessingFrame(sid) + sseCompletedFrame(sid))
      }
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ session_id: sid }),
      })
      return
    }

    if (method === 'POST' && /\/issuance\/[^/]+\/cancel$/.test(path)) {
      await route.fulfill({ status: 204 })
      return
    }

    if (method === 'GET' && path === '/api/v1/credentials') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          credentials: [
            {
              id: E2E_ISSUED_CREDENTIAL_ID,
              display: {
                name: 'E2E PID',
                description: 'Playwright fixture credential for E2E testing',
                background_color: '#12107c',
                text_color: '#ffffff',
                logo: null,
                issuer_name: 'E2E Test Issuer',
                credential_type: E2E_CREDENTIAL_CONFIGURATION_ID,
              },
              issued_at: new Date().toISOString(),
            },
          ],
        }),
      })
      return
    }

    const credMatch = /^\/api\/v1\/credentials\/([^/]+)$/.exec(path)
    if (method === 'GET' && credMatch) {
      const id = credMatch[1]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id,
          credential_configuration_id: E2E_CREDENTIAL_CONFIGURATION_ID,
          format: 'dc+sd-jwt',
          issuer: 'https://issuer.e2e.test',
          status: 'active',
          issued_at: new Date().toISOString(),
          expires_at: null,
          claims: { given_name: 'E2E' },
          display: {
            name: 'E2E PID',
            description: 'Playwright fixture credential for E2E testing',
            background_color: '#12107c',
            text_color: '#ffffff',
            logo: null,
            issuer_name: 'E2E Test Issuer',
            credential_type: E2E_CREDENTIAL_CONFIGURATION_ID,
          },
        }),
      })
      return
    }

    await route.fulfill({
      status: 501,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'e2e_unmocked',
        error_description: `No mock for ${method} ${path}`,
      }),
    })
  })
}
