export const routes = {
  home: '/',
  scan: '/scan',
  credentialTypes: '/credential-types',
  credentials: '/credentials',
  issuanceSuccess: '/issuance/success/:credentialId?',
} as const

export function credentialDetailPath(id: string) {
  return `${routes.credentials}/${encodeURIComponent(id)}`
}

export function issuanceSuccessPath(credentialId?: string) {
  return credentialId
    ? `/issuance/success/${encodeURIComponent(credentialId)}`
    : '/issuance/success'
}
