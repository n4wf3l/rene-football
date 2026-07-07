const TOKEN_KEY = 'rene_admin_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/* --------------------------------------------------------------------------
 * In-flight request tracker
 *
 * Every request() call bumps the shared counter. Listeners get notified
 * whenever the count changes, so a top-of-viewport progress bar can show
 * itself while any request is running and hide as soon as the last one
 * settles. Keeps loading affordance uniform across the app without having to
 * wire spinners into every button.
 * -------------------------------------------------------------------------- */

type ApiActivityListener = (count: number) => void

let inflightCount = 0
const listeners = new Set<ApiActivityListener>()

function notify(): void {
  listeners.forEach((fn) => fn(inflightCount))
}

export function subscribeToApiActivity(fn: ApiActivityListener): () => void {
  listeners.add(fn)
  fn(inflightCount)
  return () => { listeners.delete(fn) }
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export interface RequestOptions {
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function request<T = unknown>(
  method: HttpMethod,
  path: string,
  { body, auth = false, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  // Don't set Content-Type for FormData - the browser injects the multipart
  // boundary automatically. JSON bodies stay explicit.
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  inflightCount++
  notify()
  try {
    const response = await fetch(`/api${path}`, {
      method,
      headers,
      body:
        body === undefined ? undefined
        : isFormData ? (body as FormData)
        : JSON.stringify(body),
      signal,
    })

    if (response.status === 204) return null as T

    const text = await response.text()
    const data = text ? safeJson(text) : null

    if (!response.ok) {
      const message =
        (data && typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message?: unknown }).message ?? '')
          : '') || `Erreur ${response.status}`
      throw new ApiError(message, response.status, data)
    }
    return data as T
  } finally {
    inflightCount = Math.max(0, inflightCount - 1)
    notify()
  }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}

export const api = {
  get:    <T = unknown>(path: string, opts?: RequestOptions): Promise<T> => request<T>('GET', path, opts),
  post:   <T = unknown>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> => request<T>('POST', path, { ...opts, body }),
  put:    <T = unknown>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> => request<T>('PUT', path, { ...opts, body }),
  patch:  <T = unknown>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> => request<T>('PATCH', path, { ...opts, body }),
  delete: <T = unknown>(path: string, opts?: RequestOptions): Promise<T> => request<T>('DELETE', path, opts),
}

export const pdfUrl = (slug: string): string => `/api/players/${slug}/pdf`
