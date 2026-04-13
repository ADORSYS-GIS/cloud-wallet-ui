/**
 * Tenant lifecycle: registration with POST /tenants, key-pair persistence in
 * localStorage, and the in-memory auth state used by the API client.
 *
 * Initialization sequence (called once at app boot):
 *   1. Check localStorage for an existing tenant_id + key pair.
 *   2. If found, import the private key and cache everything in memory.
 *   3. If not found, generate a new key pair, call POST /tenants, then persist.
 *
 * POST /tenants is the only unauthenticated call — it has no Bearer header.
 */

import { STORAGE_KEYS } from '../constants/storageKeys'
import {
  createBearerToken,
  generateKeyPair,
  importPrivateKey,
} from './crypto'

// ---------------------------------------------------------------------------
// In-memory auth state
// ---------------------------------------------------------------------------

/**
 * Live auth state held in module-level variables.
 * These are populated once during `initializeTenant()` and then read by
 * `getAuthorizationHeader()` on every API request.
 */
let _tenantId: string | null = null
let _privateKey: CryptoKey | null = null
let _publicKeyJwk: JsonWebKey | null = null

// ---------------------------------------------------------------------------
// Tenant registration API call (unauthenticated)
// ---------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

type TenantRegistrationResponse = {
  tenant_id: string
  name: string
}

async function registerTenant(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // The spec requires a `name` field (minLength 1, maxLength 255).
    // We use a fixed app-level name; this is a one-time registration call.
    body: JSON.stringify({ name: 'DATEV Cloud Wallet' }),
  })

  if (!response.ok) {
    throw new Error(`Tenant registration failed with status ${response.status}`)
  }

  const data = (await response.json()) as TenantRegistrationResponse
  return data.tenant_id
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function persistTenantData(
  tenantId: string,
  publicKeyJwk: JsonWebKey,
  privateKeyJwk: JsonWebKey
): void {
  localStorage.setItem(STORAGE_KEYS.TENANT_ID, tenantId)
  localStorage.setItem(STORAGE_KEYS.PUBLIC_KEY_JWK, JSON.stringify(publicKeyJwk))
  localStorage.setItem(STORAGE_KEYS.PRIVATE_KEY_JWK, JSON.stringify(privateKeyJwk))
}

type StoredTenantData = {
  tenantId: string
  publicKeyJwk: JsonWebKey
  privateKeyJwk: JsonWebKey
} | null

function loadStoredTenantData(): StoredTenantData {
  const tenantId = localStorage.getItem(STORAGE_KEYS.TENANT_ID)
  const publicKeyRaw = localStorage.getItem(STORAGE_KEYS.PUBLIC_KEY_JWK)
  const privateKeyRaw = localStorage.getItem(STORAGE_KEYS.PRIVATE_KEY_JWK)

  if (!tenantId || !publicKeyRaw || !privateKeyRaw) {
    return null
  }

  try {
    return {
      tenantId,
      publicKeyJwk: JSON.parse(publicKeyRaw) as JsonWebKey,
      privateKeyJwk: JSON.parse(privateKeyRaw) as JsonWebKey,
    }
  } catch {
    // Corrupted storage — clear and start fresh
    clearStoredTenantData()
    return null
  }
}

function clearStoredTenantData(): void {
  localStorage.removeItem(STORAGE_KEYS.TENANT_ID)
  localStorage.removeItem(STORAGE_KEYS.PUBLIC_KEY_JWK)
  localStorage.removeItem(STORAGE_KEYS.PRIVATE_KEY_JWK)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the tenant auth state.
 *
 * Must be awaited before the app renders so that every API call made by React
 * components already has a valid Bearer token available.
 *
 * Idempotent: calling it multiple times is safe (subsequent calls are no-ops
 * once `_tenantId` is set).
 */
export async function initializeTenant(): Promise<void> {
  // Already initialized in this session — nothing to do
  if (_tenantId !== null) {
    return
  }

  const stored = loadStoredTenantData()

  if (stored) {
    // Re-use existing tenant — just import the private key into memory
    try {
      _privateKey = await importPrivateKey(stored.privateKeyJwk)
      _publicKeyJwk = stored.publicKeyJwk
      _tenantId = stored.tenantId
      return
    } catch {
      // Key import failed (e.g. corrupted JWK) — fall through to re-register
      clearStoredTenantData()
    }
  }

  // New tenant: generate keys → register → persist
  const { publicKeyJwk, privateKeyJwk } = await generateKeyPair()
  const tenantId = await registerTenant()

  _privateKey = await importPrivateKey(privateKeyJwk)
  _publicKeyJwk = publicKeyJwk
  _tenantId = tenantId

  persistTenantData(tenantId, publicKeyJwk, privateKeyJwk)
}

/**
 * Generate and return a fresh `Authorization: Bearer <JWT>` header value.
 *
 * A new JWT is minted on every call (5-minute TTL) to avoid clock-skew
 * issues from long-lived tokens.
 *
 * Throws if `initializeTenant()` has not been called yet — this is a
 * programming error and should surface loudly in development.
 */
export async function getAuthorizationHeader(): Promise<string> {
  if (!_tenantId || !_privateKey || !_publicKeyJwk) {
    throw new Error(
      'Auth not initialized. Ensure initializeTenant() has resolved before making API calls.'
    )
  }

  const token = await createBearerToken(_tenantId, _privateKey, _publicKeyJwk)
  return `Bearer ${token}`
}

/**
 * Expose the current tenant ID for use in components / debugging.
 * Returns `null` before `initializeTenant()` has resolved.
 */
export function getTenantId(): string | null {
  return _tenantId
}