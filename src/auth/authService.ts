/**
 * Auth service — single entry-point for the wallet's self-issued JWT auth.
 *
 * Responsibilities:
 * 1. On first run: register a new tenant, store the tenant_id.
 * 2. On every subsequent run: reuse the stored tenant_id.
 * 3. Ensure a key pair exists (generated once, persisted in localStorage).
 * 4. Vend short-lived Bearer JWTs (1 hour TTL) via `getBearerToken()`.
 *    Tokens are cached and regenerated when they are within 60 s of expiry.
 */

import {
  getOrCreateKeyPair,
  createJwt,
  clearPersistedKeyPair,
  type StoredKeyPair,
} from './crypto'
import {
  registerTenant,
  storeTenantId,
  getStoredTenantId,
  DEFAULT_TENANT_NAME,
} from './tenant'

// How many seconds before expiry we proactively refresh the token.
const REFRESH_BUFFER_SECONDS = 60

// Default JWT TTL in seconds (1 hour).
const TOKEN_TTL_SECONDS = 3600

type CachedToken = {
  token: string
  /** Unix timestamp (seconds) when this token was issued. */
  issuedAt: number
}

let cachedToken: CachedToken | null = null
let keyPairPromise: Promise<StoredKeyPair> | null = null
let initPromise: Promise<string> | null = null

function isTokenFresh(cached: CachedToken): boolean {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = cached.issuedAt + TOKEN_TTL_SECONDS
  return expiresAt - now > REFRESH_BUFFER_SECONDS
}

async function ensureKeyPair(): Promise<StoredKeyPair> {
  if (!keyPairPromise) {
    keyPairPromise = getOrCreateKeyPair()
  }
  return keyPairPromise
}

/**
 * Register a new tenant or reuse an existing tenant_id.
 * Returns the tenant_id that should be used as the `sub` claim.
 *
 * Tenant registration is only triggered from `initAuth()` behind the module-level
 * `initPromise` singleton, so concurrent `initAuth()` calls cannot both pass the
 * “no stored tenant” check and invoke `registerTenant()` twice.
 *
 * `registerTenant()` uses raw `fetch` for POST /tenants (OpenAPI `security: []`);
 * it must never go through `apiPost`, which always attaches Bearer auth.
 */
async function ensureTenantId(): Promise<string> {
  const existing = getStoredTenantId()
  if (existing) return existing

  const { tenant_id } = await registerTenant(DEFAULT_TENANT_NAME)
  storeTenantId(tenant_id)
  return tenant_id
}

/**
 * Initialize the auth service.
 *
 * Must be called once at app startup (before any authenticated API requests).
 * Idempotent — safe to call multiple times; registration only happens once.
 *
 * Concurrent callers share one `initPromise`, which serializes the first-run path
 * (including `ensureTenantId()`) so only one tenant registration runs per session.
 *
 * Returns the tenant_id for informational use; callers do NOT need to store it.
 */
export async function initAuth(): Promise<string> {
  if (!initPromise) {
    initPromise = (async () => {
      // Key pair work is independent of tenant registration; run both in parallel.
      const [tenantId] = await Promise.all([ensureTenantId(), ensureKeyPair()])
      return tenantId
    })()
  }
  return initPromise
}

/**
 * Returns a valid Bearer JWT for the current tenant.
 *
 * Automatically:
 * - Waits for `initAuth()` to complete if it hasn't already.
 * - Reuses a cached token if it is still fresh.
 * - Generates a new token when the cached one is about to expire.
 */
export async function getBearerToken(): Promise<string> {
  if (cachedToken && isTokenFresh(cachedToken)) {
    return cachedToken.token
  }

  const [tenantId, keyPair] = await Promise.all([initAuth(), ensureKeyPair()])

  const issuedAt = Math.floor(Date.now() / 1000)
  const token = await createJwt(tenantId, keyPair, TOKEN_TTL_SECONDS)
  cachedToken = { token, issuedAt }
  return token
}

/**
 * Clear all in-memory cached auth state (token + init promise + key pair promise).
 *
 * IMPORTANT: This resets in-memory state only. It does NOT remove the
 * persisted key pair from localStorage. After calling this function:
 * - The next call to `getBearerToken()` will re-run `initAuth()`, which will
 *   reload the key pair from localStorage and reuse the stored tenant_id.
 * - A new JWT will be generated (the cached token is cleared), but it will
 *   be signed with the same key pair that was already registered with the
 *   backend.
 *
 * Use cases:
 * - Testing: reset between test cases without touching localStorage.
 * - Forcing a fresh token to be generated (e.g. after detecting expiry).
 *
 * To also remove the persisted key pair (e.g. for explicit logout or test
 * isolation that requires a brand-new key), call `clearPersistedKeyPair()`
 * from `./crypto` in addition to this function.
 */
export function resetAuthState(): void {
  cachedToken = null
  initPromise = null
  keyPairPromise = null
}

/**
 * Re-export `clearPersistedKeyPair` for callers that need a fully clean auth
 * slate (e.g. logout flows that must invalidate the old key on the backend,
 * or integration tests that require a new key pair per run).
 *
 * Always call `resetAuthState()` alongside this to clear the in-memory cache.
 */
export { clearPersistedKeyPair }
