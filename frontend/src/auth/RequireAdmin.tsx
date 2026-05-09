import type { ReactElement, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

function FullScreenLoader() {
  return (
    <div className="grid place-items-center min-h-[60vh] text-zinc-500 text-sm">
      Chargement…
    </div>
  )
}

interface RequireAdminProps {
  children: ReactNode
}

function RequireAdmin({ children }: RequireAdminProps): ReactElement {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullScreenLoader />

  if (status !== 'authenticated' || !user?.is_admin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}

export default RequireAdmin
