import { getApiBaseUrl } from '../utils/env'

export class ApiError<TBody = unknown> extends Error {
  readonly status: number
  readonly body?: TBody

  constructor(message: string, status: number, body?: TBody) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function readJsonBodySafe(response: Response): Promise<unknown | undefined> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return undefined
  }

  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`)

  if (!response.ok) {
    const body = await readJsonBodySafe(response)
    throw new ApiError(`Request failed with ${response.status}`, response.status, body)
  }

  return (await response.json()) as T
}

export async function apiPost<TResponse, TBody>(
  path: string,
  body: TBody
): Promise<TResponse> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const responseBody = await readJsonBodySafe(response)
    throw new ApiError(
      `Request failed with ${response.status}`,
      response.status,
      responseBody
    )
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
