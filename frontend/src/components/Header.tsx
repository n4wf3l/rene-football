import { memo, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { ArrowUpRight, CaretDown, Gauge, Lock, List, X } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import ThemeToggle from '../theme/ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import BrandLogo from './BrandLogo'
import { useAuth } from '../auth/AuthContext'
import { useHasDarkHero } from '../hooks/useDarkHero'
import { usePublicPlayers, pickShowcase } from '../lib/usePublicPlayers'
import { playerImage } from '../lib/playerImage'

interface NavItem {
  to: string
  /** i18next key resolved on render — labels swap live when the user picks a language. */
  labelKey: 'nav.home' | 'nav.players' | 'nav.news' | 'nav.about'
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/',           labelKey: 'nav.home',    end: true },
  { to: '/joueurs',    labelKey: 'nav.players' },
  { to: '/a-propos',   labelKey: 'nav.about' },
  { to: '/actualites', labelKey: 'nav.news' },
  // Contact is intentionally omitted here: it is rendered as a CTA button
  // in the right cluster (see the Contact variants below the mega-menu).
]

/*
 * Solid dark Contact CTA - same DNA as the hero's "Découvrir nos joueurs"
 * button (bg-zinc-950 in light, bg-stone-50 in dark, inverted text +
 * arrow-up-right). Positioned in a small cluster before the theme/admin
 * divider so it reads as the primary action of the navbar.
 */
function ContactCta({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="hidden md:flex items-center">
      <Link
        to="/contact"
        onClick={onClose}
        className="group inline-flex items-center gap-1.5 rounded-full bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-stone-200 px-3.5 py-1.5 text-[0.8rem] font-semibold tracking-tight transition-colors ease-premium"
      >
        <span>{t('nav.contact')}</span>
        <ArrowUpRight size={13} weight="bold" className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform ease-premium" />
      </Link>
    </div>
  )
}

/* Mega-menu showcase is populated live from /api/players via usePublicPlayers().
   No more hardcoded names - what's on the public roster IS what shows here. */

/* Per-item hover-pill geometry. Neutral tints flip per theme (dark on the
   light navbar, light on the dark navbar) so the pill stays visible in both;
   the coloured tints (blue for /joueurs, turf for /contact) work on both bgs
   as-is. */
const HOVER_SHAPES: Record<string, { borderRadius: number; tint: string; tintLight: string }> = {
  '/':           { borderRadius: 999, tint: 'rgba(250,250,249,0.08)', tintLight: 'rgba(24,24,27,0.06)' },
  '/joueurs':    { borderRadius: 14,  tint: 'rgba(30, 64, 175,0.20)', tintLight: 'rgba(30, 64, 175,0.12)' },
  '/actualites': { borderRadius: 6,   tint: 'rgba(250,250,249,0.07)', tintLight: 'rgba(24,24,27,0.05)' },
  '/a-propos':   { borderRadius: 999, tint: 'rgba(250,250,249,0.08)', tintLight: 'rgba(24,24,27,0.06)' },
}

/* Reactively tracks the `dark` class on <html> so motion tints can swap in
   real time when the user toggles the theme. */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )
  useEffect(() => {
    if (typeof document === 'undefined') return
    const target = document.documentElement
    const observer = new MutationObserver(() => {
      setIsDark(target.classList.contains('dark'))
    })
    observer.observe(target, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

/* ---- Top-of-viewport scroll progress (full-width, hue-shifting) ---- */
const ScrollProgress = memo(function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.4 })
  const c1 = useTransform(scrollYProgress, [0, 0.5, 1], ['#93c5fd', '#3b82f6', '#1d4ed8'])
  const c2 = useTransform(scrollYProgress, [0, 0.5, 1], ['#60a5fa', '#1e40af', '#0f2664'])
  const glow = useTransform(scrollYProgress, [0, 0.5, 1], ['#93c5fd55', '#1e40af88', '#1d4ed8aa'])
  const background = useMotionTemplate`linear-gradient(90deg, ${c1} 0%, ${c2} 100%)`
  const boxShadow = useMotionTemplate`0 0 12px ${glow}`

  return (
    <motion.span
      aria-hidden="true"
      className="fixed left-0 right-0 top-0 h-[2px] origin-left z-[60] pointer-events-none"
      style={{ scaleX, background, boxShadow }}
    />
  )
})

/* ---- Brand mark - swaps with the theme so the black logo shows on the light
   navbar and the white logo shows on the dark one. ---- */
const BrandMark = memo(function BrandMark() {
  return <BrandLogo size={32} variant="auto" withPulse />
})

/* ---- Magnetic NavLink - each link tugs the cursor subtly. ---- */
const NAV_SPRING = { stiffness: 220, damping: 22, mass: 0.5 }

interface MagneticNavLinkProps {
  to: string
  end?: boolean
  isActive: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  children: ReactNode
}

function MagneticNavLink({ to, end, isActive, onMouseEnter, onMouseLeave, children }: MagneticNavLinkProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, NAV_SPRING)
  const sy = useSpring(y, NAV_SPRING)

  const handleMove = (event: ReactMouseEvent<HTMLSpanElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((event.clientX - rect.left - rect.width / 2) * 0.14)
    y.set((event.clientY - rect.top - rect.height / 2) * 0.18)
  }
  const handleLeave = () => {
    x.set(0); y.set(0)
    onMouseLeave?.()
  }

  return (
    <motion.span
      ref={ref}
      style={{ x: sx, y: sy, display: 'inline-block' }}
      onMouseMove={handleMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleLeave}
    >
      <NavLink
        to={to}
        end={end}
        className={`relative px-3.5 py-1.5 text-[0.85rem] font-medium transition-colors duration-200 ease-premium inline-block ${
          isActive
            ? 'text-zinc-900 dark:text-stone-50'
            : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-300 dark:hover:text-stone-50'
        }`}
      >
        {children}
      </NavLink>
    </motion.span>
  )
}

/* ---- Stadium lights - drifting radial gradients inside the mega-menu. ---- */
const StadiumLights = memo(function StadiumLights() {
  return (
    <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.span
        className="absolute -top-16 -left-12 w-72 h-72 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(132,184,150,0.22) 0%, rgba(132,184,150,0.04) 40%, transparent 70%)' }}
        animate={{ x: [0, 28, -8, 0], y: [0, 18, -4, 0], opacity: [0.55, 0.95, 0.7, 0.55] }}
        transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.span
        className="absolute -bottom-12 -right-10 w-64 h-64 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(30, 64, 175,0.45) 0%, rgba(30, 64, 175,0.08) 45%, transparent 75%)' }}
        animate={{ x: [0, -22, 14, 0], y: [0, -14, 8, 0], opacity: [0.5, 0.9, 0.65, 0.5] }}
        transition={{ duration: 14, ease: 'easeInOut', repeat: Infinity, delay: 1.5 }}
      />
      <motion.span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(96, 165, 250,0.18) 0%, transparent 65%)' }}
        animate={{ scale: [0.9, 1.1, 0.95, 0.9], opacity: [0.4, 0.7, 0.5, 0.4] }}
        transition={{ duration: 9, ease: 'easeInOut', repeat: Infinity, delay: 0.8 }}
      />
    </div>
  )
})

/* ---- Mega-menu (Joueurs preview) ---- */
interface MegaPanelProps {
  open: boolean
  onClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

const MegaPanel = memo(function MegaPanel({ open, onClose, onMouseEnter, onMouseLeave }: MegaPanelProps) {
  const { players } = usePublicPlayers()
  const showcase = pickShowcase(players, 3)
  const total = players.length
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mega"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+10px)] w-[520px] z-50"
          style={{ transformOrigin: 'top center' }}
        >
          <div className="relative rounded-2xl border border-stone-900/10 bg-white/95 dark:border-stone-50/10 dark:bg-zinc-950/95 backdrop-blur-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
            <StadiumLights />
            <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-900/10 dark:border-stone-50/10">
              <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-700 dark:text-turf-300">
                Dernières signatures
              </span>
              <span className="font-mono text-[0.65rem] tabular-nums text-stone-500">
                {total} joueurs actifs
              </span>
            </div>
            <ul className="relative z-10 grid grid-cols-3 gap-3 p-4">
              {showcase.map((p, i) => (
                <motion.li
                  key={p.slug}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, type: 'spring', stiffness: 180, damping: 22 }}
                >
                  <Link to={`/joueurs/${p.slug}`} onClick={onClose} className="group block">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-stone-900/10 dark:border-stone-50/10">
                      <img
                        src={playerImage(p)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.06]"
                      />
                      {/* Bottom gradient stays dark because the caption over the photo
                          is white in both themes — the image is the backdrop. */}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 text-stone-50">
                        <div className="font-display font-medium text-[0.85rem] leading-tight">
                          {p.name}
                        </div>
                        <div className="text-[0.65rem] text-stone-300 mt-0.5">{p.position}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[0.7rem] text-zinc-600 dark:text-stone-400 group-hover:text-zinc-950 dark:group-hover:text-stone-200 transition flex items-center justify-between">
                      <span>{p.club ?? '-'}</span>
                      <ArrowUpRight size={11} weight="bold" className="text-zinc-400 dark:text-stone-500 group-hover:text-turf-700 dark:group-hover:text-turf-300 transition" />
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
            <Link
              to="/joueurs"
              onClick={onClose}
              className="relative z-10 flex items-center justify-between px-5 py-4 border-t border-stone-900/10 dark:border-stone-50/10 text-sm text-zinc-800 hover:text-zinc-950 hover:bg-zinc-900/5 dark:text-stone-200 dark:hover:text-stone-50 dark:hover:bg-stone-50/5 transition group"
            >
              <span className="flex items-center gap-2">
                <span>Voir tous nos joueurs</span>
                <span className="font-mono text-[0.7rem] text-zinc-500 dark:text-stone-500 tabular-nums">({total})</span>
              </span>
              <ArrowUpRight
                size={15}
                weight="bold"
                className="text-zinc-500 dark:text-stone-400 group-hover:text-turf-700 dark:group-hover:text-turf-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

/* ---- Header - floating glass capsule, smart hide-on-scroll-down. ---- */
function Header() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)
  const [megaOpen, setMegaOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastY = useRef<number>(0)
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const isAdmin = isAuthenticated && Boolean(user?.is_admin)
  const isDark = useIsDark()
  const adminLabel = isAdmin ? t('nav.adminDashboard') : t('nav.adminLogin')
  // When a page opts in via useDarkHero() we treat the navbar as if we were
  // in dark theme regardless of the user's picked mode - this stops the
  // "white strip over a dark hero" mismatch.
  const hasDarkHero = useHasDarkHero()
  const effectiveDark = isDark || hasDarkHero

  const { scrollY } = useScroll()

  /* Smart navbar: scrolling down hides it (translateY -100%), scrolling up reveals it.
     Always visible near the top so users never lose access.
     Also tracks whether we're at the very top so the chrome (border, hairline,
     shadow) can fade out when the navbar is flush with the page background. */
  useMotionValueEvent(scrollY, 'change', (v) => {
    const dy = v - lastY.current
    const nextAtTop = v <= 8
    if (nextAtTop !== atTop) setAtTop(nextAtTop)

    if (Math.abs(dy) < 4) return // ignore sub-pixel jitter / trackpad momentum tail

    if (v <= 80) {
      if (hidden) setHidden(false)
    } else if (dy > 0 && !hidden) {
      setHidden(true)
    } else if (dy < 0 && hidden) {
      setHidden(false)
    }
    lastY.current = v
  })

  /* Body class so global CSS can snap sticky sub-navs (Players filters,
     PlayerProfile section nav…) to the viewport top while the capsule is off-screen. */
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (hidden) document.body.classList.add('nav-hidden')
    else document.body.classList.remove('nav-hidden')
    return () => document.body.classList.remove('nav-hidden')
  }, [hidden])

  /* Never hide the capsule while the mobile drawer is open. */
  useEffect(() => {
    if (open && hidden) setHidden(false)
  }, [open, hidden])

  /* Lock body scroll while drawer open (mobile). */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  /* Mega-menu hover safety. */
  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMegaOpen(true)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMegaOpen(false), 140)
  }
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])
  useEffect(() => { setMegaOpen(false) }, [location.pathname])

  const close = () => setOpen(false)

  return (
    <>
      <ScrollProgress />

      {/* Full-width sticky bar - edge to edge, glass. */}
      <motion.div
        animate={{ y: hidden ? -120 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 30 }}
        aria-hidden={hidden}
        className={`fixed inset-x-0 top-0 z-40 will-change-transform pointer-events-none ${hasDarkHero ? 'dark' : ''}`}
      >
        <nav
          className={`pointer-events-auto relative flex items-center justify-between gap-2 bg-stone-50/85 dark:bg-zinc-950/85 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-2.5 transition-[border-color,box-shadow] duration-300 ease-premium ${
            atTop
              ? 'border-b border-transparent shadow-none'
              : 'border-b border-zinc-900/10 dark:border-stone-50/10 shadow-[0_18px_36px_-24px_rgba(24,24,27,0.25),inset_0_1px_0_rgba(24,24,27,0.06)] dark:shadow-[0_24px_50px_-22px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]'
          }`}
        >
          {/* Top inner hairline - liquid glass refraction. Faded out at the
             top of the page so the navbar sits flush with the body bg (both
             themes), then faded back in on scroll. */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-zinc-900/15 dark:via-stone-50/15 to-transparent transition-opacity duration-300 ease-premium ${
              atTop ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Brand */}
          <Link
            to="/"
            onClick={close}
            className="inline-flex items-center gap-2 text-zinc-900 dark:text-stone-50 pl-1.5 pr-2"
          >
            <BrandMark />
            <span className="font-display font-semibold tracking-tight text-[0.95rem] hidden sm:inline">
              Rene <span className="text-turf-400 dark:text-turf-300">Football</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div
            className="hidden md:flex items-center gap-0.5 relative"
            onMouseLeave={() => setHovered(null)}
          >
            {NAV.map((item) => {
              const isActive = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)
              const isMega = item.to === '/joueurs'

              const linkInner = (
                <>
                  {hovered === item.to && (
                    <motion.span
                      layoutId="nav-hover-pill"
                      initial={false}
                      animate={{
                        borderRadius: HOVER_SHAPES[item.to]?.borderRadius ?? 999,
                        backgroundColor: effectiveDark
                          ? (HOVER_SHAPES[item.to]?.tint      ?? 'rgba(250,250,249,0.08)')
                          : (HOVER_SHAPES[item.to]?.tintLight ?? 'rgba(24,24,27,0.06)'),
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 border border-zinc-900/10 dark:border-stone-50/10"
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    {t(item.labelKey)}
                    {/* Active-state indicator: animated underline (2026-standard
                        pattern, more universally readable than the previous dot).
                        `layoutId` makes it slide smoothly between routes. */}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-underline"
                        aria-hidden="true"
                        className="absolute left-0 right-0 -bottom-1 h-[2px] rounded-full bg-turf-700 dark:bg-turf-300"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    {isMega && (
                      <motion.span
                        animate={{ rotate: megaOpen ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                        className="grid place-items-center text-zinc-400 dark:text-stone-500"
                        aria-hidden="true"
                      >
                        <CaretDown size={10} weight="bold" />
                      </motion.span>
                    )}
                  </span>
                </>
              )

              if (isMega) {
                return (
                  <div
                    key={item.to}
                    className="relative"
                    onMouseEnter={() => { setHovered(item.to); openMega() }}
                    onMouseLeave={() => { scheduleClose() }}
                  >
                    <MagneticNavLink to={item.to} end={item.end} isActive={isActive}>
                      {linkInner}
                    </MagneticNavLink>
                    <MegaPanel
                      open={megaOpen}
                      onClose={() => setMegaOpen(false)}
                      onMouseEnter={openMega}
                      onMouseLeave={scheduleClose}
                    />
                  </div>
                )
              }

              return (
                <MagneticNavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  isActive={isActive}
                  onMouseEnter={() => setHovered(item.to)}
                >
                  {linkInner}
                </MagneticNavLink>
              )
            })}
          </div>

          {/* Right side: Contact CTA glued to the language/theme/admin cluster
             with a single divider between them, so it reads as one action bar
             pinned to the right edge instead of drifting mid-navbar. */}
          <div className="hidden md:flex items-center gap-2">
            <ContactCta onClose={close} />
            <div className="flex items-center gap-0.5 pl-2 border-l border-zinc-900/10 dark:border-stone-50/10">
              <LanguageSwitcher variant="chip" />
              <ThemeToggle variant="rail" />
              <Link
                to={isAdmin ? '/admin' : '/admin/login'}
                aria-label={adminLabel}
                title={adminLabel}
                className={`group relative grid place-items-center w-10 h-10 rounded-xl transition-colors ${
                  isAdmin
                    ? 'text-turf-500 hover:text-turf-600 hover:bg-turf-100 dark:text-turf-300 dark:hover:text-turf-200 dark:hover:bg-turf-800/20'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-900/5 dark:text-stone-400 dark:hover:text-stone-50 dark:hover:bg-stone-50/5'
                }`}
              >
                {isAdmin ? <Gauge size={16} weight="regular" /> : <Lock size={15} weight="regular" />}
                {/* Tiny pulsing dot signals an active admin session. */}
                {isAdmin && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-turf-300 animate-pulse"
                    style={{ boxShadow: '0 0 6px rgba(132,184,150,0.8)' }}
                  />
                )}
                <span
                  role="tooltip"
                  className="absolute right-0 top-full mt-2 px-2.5 py-1 rounded-md bg-zinc-900 text-stone-100 text-xs whitespace-nowrap opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-premium pointer-events-none border border-stone-50/10 shadow-diffusion"
                >
                  {adminLabel}
                </span>
              </Link>
            </div>
          </div>

          {/* Mobile cluster */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle variant="rail" />
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-zinc-900 hover:bg-zinc-900/5 dark:text-stone-50 dark:hover:bg-stone-50/5 transition"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} weight="regular" /> : <List size={20} weight="regular" />}
            </button>
          </div>
        </nav>
      </motion.div>

      {/* Mobile drawer - anchored just below the floating capsule. */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="drawer-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-zinc-950/60 backdrop-blur-sm md:hidden"
              onClick={close}
              aria-hidden="true"
            />
            <motion.nav
              key="drawer"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{    opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 240, damping: 26 }}
              className="fixed top-[4.5rem] left-3 right-3 z-40 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-stone-50/10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] md:hidden"
              style={{ transformOrigin: 'top center' }}
            >
              <ul className="px-3 py-3 flex flex-col">
                {NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={close}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                          isActive
                            ? 'text-turf-300 bg-turf-800/20'
                            : 'text-stone-200 hover:text-stone-50 hover:bg-stone-50/5'
                        }`
                      }
                    >
                      {t(item.labelKey)}
                    </NavLink>
                  </li>
                ))}
                {/* Contact is a CTA on desktop but keeps a plain drawer entry
                   on mobile so nothing gets lost in the smaller viewport. */}
                <li>
                  <NavLink
                    to="/contact"
                    onClick={close}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                        isActive
                          ? 'text-turf-300 bg-turf-800/20'
                          : 'text-stone-200 hover:text-stone-50 hover:bg-stone-50/5'
                      }`
                    }
                  >
                    {t('nav.contact')}
                  </NavLink>
                </li>
              </ul>
              <div className="border-t border-stone-50/10 px-3 py-3 space-y-3">
                <LanguageSwitcher variant="full" />
              </div>
              <div className="border-t border-stone-50/10 px-3 py-3 flex items-center justify-between">
                <Link
                  to={isAdmin ? '/admin' : '/admin/login'}
                  onClick={close}
                  className={`inline-flex items-center gap-2 text-xs transition ${
                    isAdmin
                      ? 'text-turf-300 hover:text-turf-200'
                      : 'text-stone-400 hover:text-stone-100'
                  }`}
                >
                  {isAdmin ? <Gauge size={13} weight="regular" /> : <Lock size={13} weight="regular" />}
                  {adminLabel}
                </Link>
                <span className="text-[0.65rem] text-stone-500 font-mono uppercase tracking-wider">
                  Rene Football
                </span>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header
