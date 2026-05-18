import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiBaseUrl, isDebugApiEnabled } from '../env'

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to localhost api path when env is missing', () => {
    vi.stubEnv('VITE_API_BASE_URL', undefined)
    expect(getApiBaseUrl()).toBe('http://localhost:3000/api/v1')
  })

  it('normalizes trailing slash and appends /api/v1', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    expect(getApiBaseUrl()).toBe('https://api.example.com/api/v1')
  })

  it('does not append /api/v1 when already provided', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/api/v1')
    expect(getApiBaseUrl()).toBe('https://api.example.com/api/v1')
  })
})

describe('isDebugApiEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is false when VITE_DEBUG_API is unset or not the string "true"', () => {
    vi.stubEnv('VITE_DEBUG_API', undefined)
    expect(isDebugApiEnabled()).toBe(false)
    vi.stubEnv('VITE_DEBUG_API', 'false')
    expect(isDebugApiEnabled()).toBe(false)
    vi.stubEnv('VITE_DEBUG_API', '1')
    expect(isDebugApiEnabled()).toBe(false)
  })

  it('is true only when VITE_DEBUG_API is exactly "true"', () => {
    vi.stubEnv('VITE_DEBUG_API', 'true')
    expect(isDebugApiEnabled()).toBe(true)
  })
})
