import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, PointerEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { ArrowLeft, ArrowRight, Eye, EyeSlash, LockKey } from '@phosphor-icons/react'
import { useAuth } from '../../auth/AuthContext'
import { api, ApiError } from '../../api/client'
import type { Player } from '../../types/player'
import ThemeToggle from '../../theme/ThemeToggle'
import BrandLogo from '../../components/BrandLogo'
import ScrambleText from '../../components/home/ScrambleText'
import TacticalScene from '../../components/admin/login/TacticalScene'
import ScoutCard from '../../components/admin/login/ScoutCard'

/**
 * Admin sign-in, staged as the entrance of a match-analysis room: a tilted
 * tactical board that follows the pointer, the agency's real numbers
 * (published players, clubs, nationalities), a live scouting card cycling
 * through the roster, and the access console on the right. On success the
 * board dives into the centre circle before the dashboard opens.
 */

interface LocationState {
  from?: { pathname?: string }
}

interface PlayersResponse {
  data: Player[]
}

const MODULES = [
  'Fiches joueurs', 'Import Excel', 'Data analyse', 'Scouting', 'Missions', 'Shortlists',
  'Fiches PDF', 'Carte des clubs', 'Fréquentation', 'Actualités',
]

/** Delay between "Accès autorisé" and the dashboard, so the dive can play. */
const ENTER_MS = 1150

function AdminLogin() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  // Demo credentials are a local-dev convenience only: `import.meta.env.DEV`
  // is false in production builds, so Vite strips them from the bundle.
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@rene-football.test' : '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [granted, setGranted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Public roster, for the live numbers and the scouting card. Purely
  // decorative: the page works the same if it fails.
  useEffect(() => {
    const controller = new AbortController()
    api.get<PlayersResponse>('/players', { signal: controller.signal })
      .then((r) => setPlayers(r.data ?? []))
      .catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => () => { if (enterTimer.current) clearTimeout(enterTimer.current) }, [])

  const figures = useMemo(() => {
    const clubs = new Set(players.map((p) => p.club?.trim().toLowerCase()).filter(Boolean))
    const nations = new Set(players.map((p) => p.nationality?.split('/')[0].trim().toLowerCase()).filter(Boolean))
    return [
      { value: players.length, label: 'joueurs suivis' },
      { value: clubs.size, label: 'clubs' },
      { value: nations.size, label: 'nationalités' },
    ].filter((f) => f.value > 0)
  }, [players])

  // Board tilt follows the pointer (motion values: no re-render per move).
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 60, damping: 18 })
  const sy = useSpring(py, { stiffness: 60, damping: 18 })
  const rotateX = useTransform(sy, (v) => 54 + v * 5)
  const rotateZ = useTransform(sx, (v) => -24 + v * 7)
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce) return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }

  const destination = () => (location.state as LocationState | null)?.from?.pathname || '/admin'

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
    <div className="relative min-h-[100dvh] bg-zinc-950 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(400px,460px)]">
      {/* ───────────── Scene - the analysis room ───────────── */}
      <section
        onPointerMove={onPointerMove}
        className="relative overflow-hidden text-stone-100 min-h-[400px] sm:min-h-[460px] lg:min-h-[100dvh] flex flex-col p-6 sm:p-10 lg:p-12"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 60% 55%, rgba(30,64,175,0.28), transparent 70%), #09090b' }}
        />
        <TacticalScene rotateX={rotateX} rotateZ={rotateZ} entering={granted} />
        {/* Vignette so the copy stays readable over the board */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-zinc-950/10 to-zinc-950/80" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="relative z-10 flex items-center justify-between"
        >
          <Link to="/" className="inline-flex items-center gap-3 text-stone-50">
            <BrandLogo size={34} variant="light" withPulse />
            <span className="font-display font-semibold tracking-tight text-[1.05rem]">
              Rene <span className="text-turf-300">Football</span>
            </span>
          </Link>
          <span className="hidden sm:inline font-mono text-[0.6rem] uppercase tracking-[0.24em] text-stone-500">
            Réseau de passes · 4-3-3
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 110, damping: 22, delay: 0.12 }}
          className="relative z-10 mt-8 lg:mt-16 max-w-[30rem]"
        >
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-turf-300">
            Espace agence · Cellule data
          </span>
          <h1 className="mt-4 font-display font-semibold leading-[1.02] tracking-tightest text-stone-50 text-[2.1rem] sm:text-5xl xl:text-[3.6rem]">
            Votre effectif, <span className="text-turf-300">lu comme un match.</span>
          </h1>
          <p className="mt-4 hidden sm:block max-w-[40ch] text-[0.95rem] leading-relaxed text-stone-400">
            Fiches joueurs, scouting, analyse de données et présentations clubs, réunis dans un seul poste de travail.
          </p>

          {figures.length > 0 && (
            <dl className="mt-6 lg:mt-8 flex gap-6 sm:gap-8">
              {figures.map((f, i) => (
                <div key={f.label} className="flex flex-col-reverse">
                  <dt className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-stone-500">{f.label}</dt>
                  <dd className="font-mono text-2xl sm:text-3xl tabular-nums text-stone-50">
                    <CountUp to={f.value} delay={0.3 + i * 0.15} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </motion.div>

        <div className="relative z-10 mt-auto hidden lg:flex items-end justify-between gap-6 pt-10">
          {players.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 140, damping: 22 }}>
              <ScoutCard players={players} />
            </motion.div>
          )}
        </div>
        <ModuleTicker />
      </section>

      {/* ───────────── Access console ───────────── */}
      <main className="relative flex flex-col lg:min-h-0 px-6 sm:px-10 lg:px-12 py-8 lg:py-10 bg-stone-50 dark:bg-zinc-950 lg:border-l lg:border-stone-200 dark:lg:border-stone-50/[0.07]">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-50 transition group"
          >
            <ArrowLeft size={12} weight="bold" className="transition-transform group-hover:-translate-x-0.5" />
            Retour au site
          </Link>
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.1 }}
          className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto py-8 lg:py-10"
        >
          <span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.2em] text-[0.62rem] text-turf-700 dark:text-turf-300">
            <LockKey size={12} weight="bold" /> Console d'accès
          </span>
          <h2 className="mt-3 font-display font-semibold text-3xl lg:text-[2.4rem] tracking-tight text-zinc-950 dark:text-stone-50">
            Identifiez-vous.
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
            Accès réservé à l'équipe Rene Football. Chaque session est chiffrée et tracée.
          </p>

          <form onSubmit={onSubmit} className="mt-9 space-y-5">
            <label className="block">
              <span className="text-[0.68rem] font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-stone-300 dark:border-stone-50/10 px-4 py-3.5 text-[0.95rem] text-zinc-950 dark:text-stone-50 placeholder:text-zinc-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-turf-700/20 focus:border-turf-700 dark:focus:border-turf-300 transition"
                placeholder="vous@renefootball.com"
              />
            </label>

            <label className="block">
              <span className="text-[0.68rem] font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400">
                Mot de passe
              </span>
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-stone-300 dark:border-stone-50/10 pl-4 pr-11 py-3.5 text-[0.95rem] text-zinc-950 dark:text-stone-50 placeholder:text-zinc-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-turf-700/20 focus:border-turf-700 dark:focus:border-turf-300 transition"
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
              disabled={submitting || granted}
              className="btn w-full text-[0.95rem] py-3.5 bg-turf-700 hover:bg-turf-600 text-stone-50 shadow-[0_10px_30px_-12px_rgba(30,64,175,0.7),inset_0_1px_0_rgba(255,255,255,0.14)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {submitting || granted ? (
                <>
                  <motion.span
                    aria-hidden="true"
                    className="inline-block w-3.5 h-3.5 rounded-full border-2 border-stone-50/30 border-t-stone-50"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
                  />
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
        </motion.div>

        <div className="text-[0.7rem] text-zinc-500 dark:text-stone-500 text-center">
          © {new Date().getFullYear()} Rene Football · Espace privé
        </div>
      </main>

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
    </div>
  )
}

/* ─────────────────────────── Helpers ─────────────────────────── */

interface CountUpProps {
  to: number
  delay?: number
}

/** Counts from 0 to `to`, written straight to the DOM (no per-frame render). */
const CountUp = memo(function CountUp({ to, delay = 0 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduce) { node.textContent = String(to); return }
    const controls = animate(0, to, {
      duration: 1.1,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { node.textContent = String(Math.round(v)).padStart(2, '0') },
    })
    return () => controls.stop()
  }, [to, delay, reduce])
  return <span ref={ref}>00</span>
})

/** The dashboard's modules, scrolling along the bottom of the scene. */
const ModuleTicker = memo(function ModuleTicker() {
  const reduce = useReducedMotion()
  const items = [...MODULES, ...MODULES]
  return (
    <div aria-hidden="true" className="relative z-10 mt-auto pt-6 lg:mt-6 lg:pt-0 -mx-6 sm:-mx-10 lg:-mx-12 -mb-6 sm:-mb-10 lg:-mb-12 border-t border-stone-50/[0.07] bg-zinc-950/60 backdrop-blur-sm overflow-hidden">
      <motion.div
        className="flex w-max gap-8 py-3 pl-8"
        animate={reduce ? undefined : { x: ['0%', '-50%'] }}
        transition={{ duration: 38, ease: 'linear', repeat: Infinity }}
      >
        {items.map((m, i) => (
          <span key={i} className="inline-flex items-center gap-8 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-stone-500">
            {m}
            <span className="w-1 h-1 rounded-full bg-turf-300/60" />
          </span>
        ))}
      </motion.div>
    </div>
  )
})

export default AdminLogin
