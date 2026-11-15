import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CheckCircle, Eye, EyeSlash, LockKey } from '@phosphor-icons/react'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../api/client'
import ScrambleText from '../../components/home/ScrambleText'
import AuthLayout, { AUTH_BUTTON, AUTH_ERROR, AUTH_INPUT, AUTH_LABEL, AuthSpinner } from '../../components/admin/login/AuthLayout'

/**
 * Admin sign-in, inside the match-analysis room (AuthLayout). On success
 * the board dives into the centre circle and "Accès autorisé" plays before
 * the dashboard opens.
 */

interface LocationState {
  from?: { pathname?: string }
  /** Set by the new-password page after a successful reset. */
  passwordReset?: boolean
  email?: string
}

/** Delay between "Accès autorisé" and the dashboard, so the dive can play. */
const ENTER_MS = 1150

function AdminLogin() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const state = location.state as LocationState | null

  // Demo credentials are a local-dev convenience only: `import.meta.env.DEV`
  // is false in production builds, so Vite strips them from the bundle.
  const [email, setEmail] = useState(state?.email ?? (import.meta.env.DEV ? 'admin@rene-football.test' : ''))
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [granted, setGranted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (enterTimer.current) clearTimeout(enterTimer.current) }, [])

  const destination = () => state?.from?.pathname || '/admin'

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-[100dvh] bg-zinc-950 text-stone-400">
        <motion.span
          aria-label="Chargement"
          className="w-3 h-3 rounded-full bg-turf-500"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.05, 0.85] }}
          transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
        />
      </div>
    )
  }
  // While a sign-in is in flight or playing its entrance, this page owns the
  // redirect (after the animation); otherwise an existing session skips it.
  if (isAuthenticated && !submitting && !granted) {
    return <Navigate to={destination()} replace />
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ email, password })
      if (reduce) {
        navigate(destination(), { replace: true })
        return
      }
      setGranted(true)
      enterTimer.current = setTimeout(() => navigate(destination(), { replace: true }), ENTER_MS)
    } catch (err) {
      let fieldErr: string | undefined
      let dataMessage: string | undefined
      if (err instanceof ApiError) {
        const data = err.data as
          | { errors?: { email?: string[]; password?: string[] }; message?: string }
          | null
          | undefined
        fieldErr = data?.errors?.email?.[0] || data?.errors?.password?.[0]
        dataMessage = data?.message
      }
      setError(fieldErr || dataMessage || 'Connexion impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <AuthLayout entering={granted}>
        <span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.2em] text-[0.62rem] text-turf-700 dark:text-turf-300">
          <LockKey size={12} weight="bold" /> Console d'accès
        </span>
        <h2 className="mt-3 font-display font-semibold text-3xl lg:text-[2.4rem] tracking-tight text-zinc-950 dark:text-stone-50">
          Identifiez-vous.
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
          Accès réservé à l'équipe Rene Football. Chaque session est chiffrée et tracée.
        </p>

        {state?.passwordReset && !error && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-turf-200 bg-turf-50 dark:border-turf-400/25 dark:bg-turf-900/25 px-4 py-3 text-sm text-turf-800 dark:text-turf-100" role="status">
            <CheckCircle size={17} weight="fill" className="mt-px shrink-0 text-turf-600 dark:text-turf-300" />
            Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-9 space-y-5">
          <label className="block">
            <span className={AUTH_LABEL}>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-2 ${AUTH_INPUT}`}
              placeholder="vous@renefootball.com"
            />
          </label>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="login-password" className={AUTH_LABEL}>Mot de passe</label>
              <Link
                to="/admin/mot-de-passe-oublie"
                state={{ email }}
                className="text-xs text-turf-700 dark:text-turf-300 hover:underline underline-offset-4"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative mt-2">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${AUTH_INPUT} pr-11`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-lg text-zinc-500 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
              >
                {showPassword ? <EyeSlash size={16} weight="regular" /> : <Eye size={16} weight="regular" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={AUTH_ERROR} role="alert">
              {error}
            </motion.div>
          )}

          <button type="submit" disabled={submitting || granted} className={AUTH_BUTTON}>
            {submitting || granted ? (
              <>
                <AuthSpinner />
                {granted ? 'Ouverture…' : 'Vérification…'}
              </>
            ) : (
              <>
                Entrer dans le dashboard
                <ArrowRight size={15} weight="bold" />
              </>
            )}
          </button>
        </form>

        {/* Demo creds - local development only, never shipped to production */}
        {import.meta.env.DEV && (
          <div className="mt-8 rounded-xl border border-dashed border-stone-300 dark:border-stone-50/10 bg-white/60 dark:bg-zinc-900/30 p-4">
            <div className="font-mono uppercase tracking-[0.18em] text-[0.6rem] text-zinc-500 dark:text-stone-500 mb-2">
              Compte de démo
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <button
                type="button"
                onClick={() => { setEmail('admin@rene-football.test'); setPassword('admin1234') }}
                className="font-mono text-zinc-700 dark:text-stone-300 hover:text-turf-700 dark:hover:text-turf-300 transition text-left"
                title="Cliquer pour pré-remplir"
              >
                admin@rene-football.test · admin1234
              </button>
              <span className="text-zinc-500 dark:text-stone-500 text-[0.7rem]">
                Cliquer pour pré-remplir le formulaire.
              </span>
            </div>
          </div>
        )}
      </AuthLayout>

      {/* ───────────── Access granted - the dive into the dashboard ───────────── */}
      <AnimatePresence>
        {granted && (
          <motion.div
            key="granted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.25 }}
            className="fixed inset-0 z-50 grid place-items-center bg-zinc-950 text-stone-50"
            role="status"
          >
            <div aria-hidden="true" className="absolute inset-0 grid place-items-center overflow-hidden">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full border border-turf-300/40"
                  style={{ width: 180, height: 180 }}
                  initial={{ scale: 0.4, opacity: 0.9 }}
                  animate={{ scale: 7, opacity: 0 }}
                  transition={{ duration: 1.1, delay: 0.25 + i * 0.16, ease: [0.2, 0.7, 0.3, 1] }}
                />
              ))}
            </div>
            <div className="relative text-center px-6">
              <ScrambleText
                text="ACCÈS AUTORISÉ"
                baseMs={180}
                stepMs={28}
                className="block font-display font-semibold tracking-tight text-3xl sm:text-5xl"
              />
              <div className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-turf-300">
                Chargement de l'effectif
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AdminLogin
