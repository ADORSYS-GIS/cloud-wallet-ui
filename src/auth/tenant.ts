import { getApiBaseUrl } from '../utils/env'

export type TenantRegistrationResponse = {
  tenant_id: string
  name: string
}

const TENANT_ID_KEY = 'cloud_wallet_tenant_id'

export const DEFAULT_TENANT_NAME = 'DATEV Cloud Wallet'

/**
 * Persist the tenant_id returned by the backend.
 */
export function storeTenantId(tenantId: string): void {
  localStorage.setItem(TENANT_ID_KEY, tenantId)
}

/**
 * Retrieve the previously stored tenant_id, or null if not yet registered.
 */
export function getStoredTenantId(): string | null {
  return localStorage.getItem(TENANT_ID_KEY)
}

/**
 * Call POST /tenants and return the registration response.
 * Throws on non-2xx responses, including the full error body for debuggability.
 */
export async function registerTenant(name: string): Promise<TenantRegistrationResponse> {
  const response = await fetch(`${getApiBaseUrl()}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    // Include the response body so callers can see the server's error detail.
    let bodyText = ''
    try {
      bodyText = await response.text()
    } catch {
      // Ignore — body may not be readable (e.g. network stream already closed).
    }
    throw new Error(
      `Tenant registration failed with HTTP ${response.status}${bodyText ? `: ${bodyText}` : ''}`
    )
  }

  const body = (await response.json()) as TenantRegistrationResponse
  if (typeof body.tenant_id !== 'string' || !body.tenant_id) {
    throw new Error('Tenant registration response is missing tenant_id')
  }

  return body
}
