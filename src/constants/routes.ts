export const routes = {
  home: '/',
  scan: '/scan',
  credentialTypes: '/credential-types',
  credentialTypeDetails: '/credential-types/:optionId',
  issuanceSuccess: '/issuance/success',
  credentials: '/credentials',
} as const

export function credentialTypeDetailsPath(optionId: string) {
  return `/credential-types/${encodeURIComponent(optionId)}`
}

export function credentialDetailPath(id: string) {
  return `${routes.credentials}/${encodeURIComponent(id)}`
}
