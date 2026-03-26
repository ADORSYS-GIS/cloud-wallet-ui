import type { HealthResponse } from '../types/api'
import { apiGet } from './client'

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/health')
}
