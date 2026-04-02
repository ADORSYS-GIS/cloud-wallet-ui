export const routes = {
  home: '/',
  scan: '/scan',
  credentials: '/credentials',
} as const

export function credentialDetailPath(id: string) {
  return `${routes.credentials}/${encodeURIComponent(id)}`
}
