import type { ReactElement, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from './AuthContext'
import { useTranslation } from 'react-i18next'
import RFLoader from '../components/RFLoader'

/**
 * Full-screen splash shown while we verify the admin session: a soft
 * radial-lit stage with the animated RF monogram, the wordmark and a
 * caption, so the wait feels intentional rather than "the app is broken".
 */
function FullScreenLoader() {
  const { t } = useTranslation()
  return (
    <div className="relative isolate min-h-[100dvh] w-full overflow-hidden bg-stone-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
      {/* Ambient stage lighting - radial gradients painted onto the background. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 0%, rgba(45,125,79,0.10) 0%, transparent 50%),' +
            'radial-gradient(ellipse at 70% 100%, rgba(30, 64, 175,0.10) 0%, transparent 55%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-5"
      >
        <RFLoader size={72} label={null} />
        <div className="text-center">
          <div className="font-display font-semibold text-lg tracking-tight text-zinc-950 dark:text-stone-50">
            Rene <span className="text-turf-700 dark:text-turf-300">Football</span>
          </div>
          <div className="mt-1 text-[0.7rem] font-mono uppercase tracking-[0.24em] text-zinc-500 dark:text-stone-400">
            {t('common.checkingSession')}
          </div>
        </div>
      </motion.div>
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
