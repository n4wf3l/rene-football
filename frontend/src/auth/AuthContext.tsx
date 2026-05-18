import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, getToken, setToken } from '../api/client'

export interface AdminUser {
  id?: number
  name?: string
  email?: string
  is_admin?: boolean
  /** True for users wired into the validator pool - see ScoutingRoutingService. */
  is_head_of_scouting?: boolean
  /** Player-category buckets this validator owns (`['Pro']`, `['U19','U23']`, …).
   *  Null/undefined means "covers everything". */
  scouting_scope?: string[] | null
  [key: string]: unknown
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface LoginPayload {
  email: string
  password: string
}

interface LoginResponse {
  token: string
  user: AdminUser
}

export interface AuthContextValue {
  user: AdminUser | null
  status: AuthStatus
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<AdminUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setStatus('unauthenticated')
      return
    }
    try {
      const me = await api.get<AdminUser>('/admin/me', { auth: true })
      setUser(me)
      setStatus('authenticated')
    } catch {
      setToken(null)
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => { loadMe() }, [loadMe])

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    const result = await api.post<LoginResponse>('/admin/login', { email, password })
    setToken(result.token)
    setUser(result.user)
    setStatus('authenticated')
    return result.user
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/admin/logout', null, { auth: true }) } catch { /* ignore */ }
    setToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    login,
    logout,
    refresh: loadMe,
  }), [user, status, login, logout, loadMe])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
