export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
  const normalized = configured.replace(/\/+$/, '')
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`
}
