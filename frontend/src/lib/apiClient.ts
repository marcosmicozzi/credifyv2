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

  const url = buildUrl(path)
  
  // Log request details in development for debugging
  if (import.meta.env.DEV) {
    console.log('[apiRequest]', init.method || 'GET', url, {
      hasBody: !!init.body,
      hasToken: !!accessToken,
      body: init.body,
      headers: Object.fromEntries(headers.entries()),
    })
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
    })
  } catch (fetchError) {
    // Log fetch errors for debugging
    if (import.meta.env.DEV) {
      console.error('[apiRequest] Fetch error:', fetchError, {
        url,
        method: init.method,
        hasBody: !!init.body,
      })
    }
    throw fetchError
  }

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


