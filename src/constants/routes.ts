export const routes = {
  home: '/',
  scan: '/scan',
  credentials: '/credentials',
  activity: '/activity',
} as const

export function credentialDetailPath(id: string) {
  return `${routes.credentials}/${encodeURIComponent(id)}`
}
