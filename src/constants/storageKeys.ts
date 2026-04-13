/**
 * Keys used when reading/writing tenant auth data to localStorage.
 * Centralised here so every module uses the same string literals.
 */
export const STORAGE_KEYS = {
  /** UUID returned by POST /tenants */
  TENANT_ID: 'cw:tenant_id',
  /** ECDSA P-256 private key exported as a JWK JSON string */
  PRIVATE_KEY_JWK: 'cw:private_key_jwk',
  /** ECDSA P-256 public key exported as a JWK JSON string */
  PUBLIC_KEY_JWK: 'cw:public_key_jwk',
} as const