import type { ReactElement, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from './AuthContext'
import BrandLogo from '../components/BrandLogo'

/**
 * Full-screen splash shown while we verify the admin session. Occupies the
 * whole viewport with a soft radial-lit stage, a slowly-pulsing brand mark
 * and a thin animated progress bar so the wait feels intentional rather
 * than "the app is broken".
 */
function FullScreenLoader() {
  return (
    <div className="relative isolate min-h-[100dvh] w-full overflow-hidden bg-stone-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
      {/* Ambient stage lighting - radial gradients painted onto the background. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 0%, rgba(45,125,79,0.10) 0%, transparent 50%),' +
            'radial-gradient(ellipse at 70% 100%, rgba(15,81,50,0.10) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Pulsing brand mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-2xl bg-turf-500/25 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <BrandLogo size={64} />
            </div>
          </motion.div>
        </motion.div>

        {/* Wordmark + caption */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="text-center"
        >
          <div className="font-display font-semibold text-lg tracking-tight text-zinc-950 dark:text-stone-50">
            Rene <span className="text-turf-700 dark:text-turf-300">Football</span>
          </div>
          <div className="mt-1 text-[0.7rem] font-mono uppercase tracking-[0.24em] text-zinc-500 dark:text-stone-400">
            Vérification de la session
          </div>
        </motion.div>

        {/* Slim progress bar (indeterminate) */}
        <div
          role="progressbar"
          aria-label="Chargement"
          className="relative w-48 h-[3px] rounded-full overflow-hidden bg-stone-200/70 dark:bg-stone-50/10 mt-1"
        >
          <motion.span
            aria-hidden="true"
            className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-turf-500 to-transparent"
            animate={{ x: ['-100%', '350%'] }}
            transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>
      </div>
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
