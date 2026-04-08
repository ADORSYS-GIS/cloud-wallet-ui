export const routes = {
  home: '/',
  scan: '/scan',
  credentialTypes: '/credential-types',
  credentials: '/credentials',
} as const

export function credentialDetailPath(id: string) {
  return `${routes.credentials}/${encodeURIComponent(id)}`
}
