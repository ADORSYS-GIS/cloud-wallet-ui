export type HealthResponse = {
  status: 'ok' | 'degraded' | 'down'
  version: string
}
