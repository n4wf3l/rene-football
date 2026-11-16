import type { ReactElement, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Back-office roles (backend: User::ROLES / User::permissions()).
 *   superadmin — everything + members;
 *   admin      — agency side, no Scouting, no Data analyse;
 *   scout      — agency side + Scouting;
 *   analyst    — agency side + Data analyse.
 * The server enforces it; the SPA only hides what the member can't open.
 */
export type AdminRole = 'superadmin' | 'admin' | 'scout' | 'analyst'
export type Permission = 'scouting' | 'analysis' | 'members'

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  scout: 'Scout',
  analyst: 'Data analyste',
}

export function usePermissions(): Record<Permission, boolean> {
  const { user } = useAuth()
  const p = user?.permissions
  return {
    scouting: Boolean(p?.scouting),
    analysis: Boolean(p?.analysis),
    members: Boolean(p?.members),
  }
}

interface RequirePermissionProps {
  need: Permission
  children: ReactNode
}

/** Route guard inside /admin: a page the member's role can't open sends them to the dashboard. */
export function RequirePermission({ need, children }: RequirePermissionProps): ReactElement {
  const allowed = usePermissions()[need]
  return allowed ? <>{children}</> : <Navigate to="/admin" replace />
}
