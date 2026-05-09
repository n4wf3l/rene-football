import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeSlash,
  LockKey,
  ShieldCheck,
  SoccerBall,
} from '@phosphor-icons/react'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../api/client'
import ThemeToggle from '../../theme/ThemeToggle'
import MeshGradient from '../../components/MeshGradient'
import FloatingAccents from '../../components/FloatingAccents'
import heroPortrait from '../../assets/player1.png'

interface LocationState {
  from?: { pathname?: string }
}

const FEATURES = [
  { Icon: ShieldCheck, label: 'Auth Sanctum', hint: 'Tokens scopés + SPA stateful.' },
  { Icon: LockKey,     label: 'Sessions privées', hint: 'Chaque action est tracée.' },
  { Icon: SoccerBall,  label: 'Roster + Analyses', hint: 'CRUD joueurs, métriques.' },
]

function AdminLogin() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('admin@rene-football.test')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  if (isAuthenticated) {
    const state = location.state as LocationState | null
    const to = state?.from?.pathname || '/admin'
    return <Navigate to={to} replace />
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ email, password })
      const state = location.state as LocationState | null
      const to = state?.from?.pathname || '/admin'
      navigate(to, { replace: true })
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
    <div className="min-h-[100dvh] grid lg:grid-cols-2 bg-stone-50 dark:bg-zinc-950">
      {/* ───────────── LEFT — editorial dark panel ───────────── */}
      <aside className="relative overflow-hidden text-stone-100 lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-between p-8 sm:p-12 lg:p-14">
        <MeshGradient intensity="strong" />
        <FloatingAccents />

        {/* Filigrane portrait — anchored bottom-right, heavily faded so it
           reads as texture, not as a foreground subject. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -right-12 w-[28rem] h-[36rem] hidden md:block opacity-[0.10] mix-blend-screen"
          style={{
            backgroundImage: `url(${heroPortrait})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            filter: 'grayscale(100%) contrast(1.05) blur(1px)',
            maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
          }}
        />

        {/* Subtle inner top hairline for liquid-glass refraction. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-stone-50/15 to-transparent"
        />

        {/* Top: brand + back link */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="relative z-10 flex items-center justify-between"
        >
          <Link to="/" className="inline-flex items-center gap-3 text-stone-50 group">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-turf-800 text-stone-50 font-display font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] overflow-hidden relative">
              R
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-stone-50/0 via-stone-50/15 to-stone-50/0"
                animate={{ x: ['-150%', '150%'] }}
                transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3 }}
              />
            </span>
            <span className="font-display font-semibold tracking-tight text-[1.05rem]">
              Rene <span className="text-turf-300">Football</span>
            </span>
          </Link>

          <Link
            to="/"
            className="hidden lg:inline-flex items-center gap-2 text-sm text-stone-300 hover:text-stone-50 transition group"
          >
            <ArrowLeft size={14} weight="bold" className="transition-transform group-hover:-translate-x-0.5" />
            Retour au site
          </Link>
        </motion.div>

        {/* Middle: editorial copy */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 110, damping: 22, delay: 0.15 }}
          className="relative z-10 mt-16 lg:mt-0 max-w-[34ch]"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-turf-400/30 bg-turf-800/20 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-turf-300">
            <span className="w-1.5 h-1.5 rounded-full bg-turf-300 animate-pulse" />
            Espace agence
          </span>

          <h1 className="mt-6 font-display font-semibold text-stone-50 leading-[1.02] tracking-tightest text-4xl sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem]">
            Le poste de pilotage <br className="hidden sm:inline" />
            de <span className="text-turf-300">l'agence.</span>
          </h1>
          <p className="mt-6 max-w-[42ch] text-base text-stone-400 leading-relaxed">
            Mises à jour des fiches joueurs, suivi des transferts, analyses
            statistiques. Un espace dédié à l'équipe Rene Football.
          </p>
        </motion.div>

        {/* Bottom: feature list */}
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } } }}
          className="relative z-10 hidden lg:flex items-stretch gap-4 mt-16"
        >
          {FEATURES.map(({ Icon, label, hint }) => (
            <motion.li
              key={label}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show:   { opacity: 1, y: 0 },
              }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="flex-1 rounded-2xl border border-stone-50/10 bg-stone-50/[0.04] backdrop-blur-sm p-4"
            >
              <Icon size={18} weight="regular" className="text-turf-300" />
              <div className="mt-3 font-mono uppercase tracking-wider text-[0.65rem] text-stone-400">
                {label}
              </div>
              <div className="mt-1 text-sm text-stone-200">{hint}</div>
            </motion.li>
          ))}
        </motion.ul>
      </aside>

      {/* ───────────── RIGHT — form panel ───────────── */}
      <main className="relative flex flex-col min-h-[100dvh] lg:min-h-0 px-6 sm:px-10 lg:px-16 py-10 lg:py-12 bg-stone-50 dark:bg-zinc-950">
        {/* Top right utilities */}
        <div className="flex items-center justify-between lg:justify-end gap-3">
          <Link
            to="/"
            className="lg:hidden inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-50 transition"
          >
            <ArrowLeft size={12} weight="bold" />
            Retour au site
          </Link>
          <ThemeToggle />
        </div>

        {/* Centered card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.1 }}
          className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto"
        >
          <div>
            <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-700 dark:text-turf-300">
              Connexion
            </span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-4xl tracking-tight text-zinc-950 dark:text-stone-50">
              Bon retour parmi nous.
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400">
              Identifiez-vous pour accéder au tableau de bord.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-9 space-y-5">
            {/* Email */}
            <label className="block">
              <span className="text-[0.7rem] font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-stone-300 dark:border-stone-50/10 px-4 py-3.5 text-[0.95rem] text-zinc-950 dark:text-stone-50 placeholder:text-zinc-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-turf-700/20 focus:border-turf-700 dark:focus:border-turf-300 transition"
                placeholder="admin@rene-football.test"
              />
            </label>

            {/* Password with show/hide */}
            <label className="block">
              <span className="text-[0.7rem] font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400">
                Mot de passe
              </span>
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-900/50 border border-stone-300 dark:border-stone-50/10 pl-4 pr-11 py-3.5 text-[0.95rem] text-zinc-950 dark:text-stone-50 placeholder:text-zinc-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-turf-700/20 focus:border-turf-700 dark:focus:border-turf-300 transition"
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
            </label>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-rose-200 bg-rose-50/60 dark:bg-rose-500/10 dark:border-rose-500/30 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn w-full text-[0.95rem] py-3.5 bg-turf-700 hover:bg-turf-600 text-stone-50 shadow-[0_10px_30px_-12px_rgba(15,81,50,0.7),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_14px_36px_-10px_rgba(15,81,50,0.85),inset_0_1px_0_rgba(255,255,255,0.18)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <>
                  <motion.span
                    aria-hidden="true"
                    className="inline-block w-3.5 h-3.5 rounded-full border-2 border-stone-50/30 border-t-stone-50"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
                  />
                  Connexion…
                </>
              ) : (
                <>
                  Accéder au dashboard
                  <ArrowRight size={15} weight="bold" />
                </>
              )}
            </button>
          </form>

          {/* Demo creds — discreet hint */}
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
        </motion.div>

        {/* Footer mention */}
        <div className="text-[0.7rem] text-zinc-500 dark:text-stone-500 text-center mt-10 lg:mt-0">
          © {new Date().getFullYear()} Rene Football · Espace privé
        </div>
      </main>
    </div>
  )
}

export default AdminLogin
