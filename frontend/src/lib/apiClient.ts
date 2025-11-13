import { apiBaseUrl } from './env'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type ApiRequestOptions = RequestInit & {
  accessToken?: string | null
}

const isAbsoluteUrl = (path: string) => /^https?:\/\//i.test(path)

function buildUrl(path: string) {
  if (isAbsoluteUrl(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl}${normalizedPath}`
}

export async function apiRequest<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
  const { accessToken, ...init } = options

  const headers = new Headers(init.headers ?? {})
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  })

  const contentType = response.headers.get('content-type')

  let payload: unknown = null
  if (contentType?.includes('application/json')) {
    payload = await response.json().catch(() => null)
  } else if (response.status !== 204) {
    payload = await response.text().catch(() => null)
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : response.statusText) || 'Request failed'

    throw new ApiError(response.status, message, payload)
  }

  return payload as TResponse
}


