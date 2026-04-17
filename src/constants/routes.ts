export const routes = {
  home: '/',
  scan: '/scan',
  credentialTypes: '/credential-types',
  credentialTypeDetails: '/credential-types/:optionId',
  issuanceSuccess: '/issuance/success',
  credentials: '/credentials',
  issuanceSuccess: '/issuance/success/:credentialId?',
} as const

export function credentialTypeDetailsPath(optionId: string) {
  return `/credential-types/${encodeURIComponent(optionId)}`
}

export function credentialDetailPath(id: string) {
  return `${routes.credentials}/${encodeURIComponent(id)}`
}

export function issuanceSuccessPath(credentialId?: string) {
  return credentialId
    ? `/issuance/success/${encodeURIComponent(credentialId)}`
    : '/issuance/success'
}
