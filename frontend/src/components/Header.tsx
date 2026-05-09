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
import { ArrowUpRight, Lock, List, X } from '@phosphor-icons/react'
import ThemeToggle from '../theme/ThemeToggle'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/',           label: 'Accueil',    end: true },
  { to: '/joueurs',    label: 'Joueurs' },
  { to: '/actualites', label: 'Actualités' },
  { to: '/a-propos',   label: 'À propos' },
  { to: '/contact',    label: 'Contact' },
]

const MEGA_PLAYERS = [
  { name: 'Karim Touré',  pos: 'Attaquant',          club: 'Borussia Dortmund', seed: 'karim-toure' },
  { name: 'Adil Berkane', pos: 'Milieu défensif',    club: 'Standard Liège',    seed: 'adil-berkane' },
  { name: 'Yanis Lefèvre',pos: 'Milieu défensif',    club: 'KRC Genk',          seed: 'yanis-lefevre' },
]
const TOTAL_PLAYERS = 12

/* Per-item hover-pill geometry. The capsule stays dark in both themes (premium
   editorial-sport identity), so a single tint per item is enough. */
const HOVER_SHAPES: Record<string, { borderRadius: number; tint: string }> = {
  '/':           { borderRadius: 999, tint: 'rgba(250,250,249,0.08)' },
  '/joueurs':    { borderRadius: 14,  tint: 'rgba(15,81,50,0.20)'    },
  '/actualites': { borderRadius: 6,   tint: 'rgba(250,250,249,0.07)' },
  '/a-propos':   { borderRadius: 999, tint: 'rgba(250,250,249,0.08)' },
  '/contact':    { borderRadius: 999, tint: 'rgba(132,184,150,0.18)' },
}

/* ---- Top-of-viewport scroll progress (full-width, hue-shifting) ---- */
const ScrollProgress = memo(function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.4 })
  const c1 = useTransform(scrollYProgress, [0, 0.5, 1], ['#84b896', '#2d7d4f', '#175133'])
  const c2 = useTransform(scrollYProgress, [0, 0.5, 1], ['#52996d', '#0f5132', '#06251a'])
  const glow = useTransform(scrollYProgress, [0, 0.5, 1], ['#84b89655', '#0f513288', '#175133aa'])
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

/* ---- Brand mark — compact for capsule. Sweep + pulse perpetual. ---- */
const BrandMark = memo(function BrandMark() {
  return (
    <span className="relative inline-flex">
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-turf-800 text-stone-50 font-display font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] overflow-hidden relative">
        R
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-stone-50/0 via-stone-50/15 to-stone-50/0"
          animate={{ x: ['-150%', '150%'] }}
          transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3 }}
        />
      </span>
      <motion.span
        aria-hidden="true"
        className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-turf-300"
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1, 0.85] }}
        transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        style={{ boxShadow: '0 0 6px rgba(132,184,150,0.7)' }}
      />
    </span>
  )
})

/* ---- Magnetic NavLink — each link tugs the cursor subtly. ---- */
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
          isActive ? 'text-stone-50' : 'text-stone-300 hover:text-stone-50'
        }`}
      >
        {children}
      </NavLink>
    </motion.span>
  )
}

/* ---- Stadium lights — drifting radial gradients inside the mega-menu. ---- */
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
        style={{ background: 'radial-gradient(circle, rgba(15,81,50,0.45) 0%, rgba(15,81,50,0.08) 45%, transparent 75%)' }}
        animate={{ x: [0, -22, 14, 0], y: [0, -14, 8, 0], opacity: [0.5, 0.9, 0.65, 0.5] }}
        transition={{ duration: 14, ease: 'easeInOut', repeat: Infinity, delay: 1.5 }}
      />
      <motion.span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(82,153,109,0.18) 0%, transparent 65%)' }}
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
          <div className="relative rounded-2xl border border-stone-50/10 bg-zinc-950/95 backdrop-blur-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
            <StadiumLights />
            <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-50/8">
              <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
                Dernières signatures
              </span>
              <span className="font-mono text-[0.65rem] tabular-nums text-stone-500">
                {TOTAL_PLAYERS} joueurs actifs
              </span>
            </div>
            <ul className="relative z-10 grid grid-cols-3 gap-3 p-4">
              {MEGA_PLAYERS.map((p, i) => (
                <motion.li
                  key={p.seed}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, type: 'spring', stiffness: 180, damping: 22 }}
                >
                  <Link to={`/joueurs/${p.seed}`} onClick={onClose} className="group block">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-stone-50/8">
                      <img
                        src={`https://picsum.photos/seed/${p.seed}/300/400`}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.06]"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 text-stone-50">
                        <div className="font-display font-medium text-[0.85rem] leading-tight">
                          {p.name}
                        </div>
                        <div className="text-[0.65rem] text-stone-300 mt-0.5">{p.pos}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[0.7rem] text-stone-400 group-hover:text-stone-200 transition flex items-center justify-between">
                      <span>{p.club}</span>
                      <ArrowUpRight size={11} weight="bold" className="text-stone-500 group-hover:text-turf-300 transition" />
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
            <Link
              to="/joueurs"
              onClick={onClose}
              className="relative z-10 flex items-center justify-between px-5 py-4 border-t border-stone-50/8 text-sm text-stone-200 hover:text-stone-50 hover:bg-stone-50/5 transition group"
            >
              <span className="flex items-center gap-2">
                <span>Voir tous nos joueurs</span>
                <span className="font-mono text-[0.7rem] text-stone-500 tabular-nums">({TOTAL_PLAYERS})</span>
              </span>
              <ArrowUpRight
                size={15}
                weight="bold"
                className="text-stone-400 group-hover:text-turf-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

/* ---- Header — floating glass capsule, smart hide-on-scroll-down. ---- */
function Header() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [megaOpen, setMegaOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastY = useRef<number>(0)
  const location = useLocation()

  const { scrollY } = useScroll()

  /* Smart navbar: scrolling down hides it (translateY -100%), scrolling up reveals it.
     Always visible near the top so users never lose access. */
  useMotionValueEvent(scrollY, 'change', (v) => {
    const dy = v - lastY.current
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

      {/* Floating capsule — sticky, glass, centered. */}
      <motion.div
        animate={{ y: hidden ? -120 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 30 }}
        aria-hidden={hidden}
        className="fixed inset-x-0 top-3 sm:top-4 z-40 px-3 sm:px-6 will-change-transform pointer-events-none"
      >
        <nav className="pointer-events-auto relative mx-auto max-w-page flex items-center justify-between gap-2 rounded-full bg-zinc-950/85 backdrop-blur-xl border border-stone-50/10 px-2.5 py-1.5 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
          {/* Top inner hairline — liquid glass refraction. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-stone-50/15 to-transparent"
          />

          {/* Brand */}
          <Link
            to="/"
            onClick={close}
            className="inline-flex items-center gap-2 text-stone-50 pl-1.5 pr-2"
          >
            <BrandMark />
            <span className="font-display font-semibold tracking-tight text-[0.95rem] hidden sm:inline">
              Rene <span className="text-turf-300">Football</span>
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
                        backgroundColor: HOVER_SHAPES[item.to]?.tint ?? 'rgba(250,250,249,0.08)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 border border-stone-50/10"
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-dot"
                        className="w-1 h-1 rounded-full bg-turf-300"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        style={{ boxShadow: '0 0 6px rgba(132,184,150,0.8)' }}
                      />
                    )}
                    {item.label}
                    {isMega && (
                      <motion.span
                        animate={{ rotate: megaOpen ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                        className="text-stone-500 text-[0.6rem] leading-none"
                        aria-hidden="true"
                      >
                        ▾
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

          {/* Right cluster: divider · theme · admin shortcut */}
          <div className="hidden md:flex items-center gap-0.5 pl-2 ml-1 border-l border-stone-50/10">
            <ThemeToggle variant="rail" />
            <Link
              to="/admin/login"
              aria-label="Espace agence"
              title="Espace agence"
              className="group relative grid place-items-center w-10 h-10 rounded-xl text-stone-400 hover:text-stone-50 hover:bg-stone-50/5 transition-colors"
            >
              <Lock size={15} weight="regular" />
              <span
                role="tooltip"
                className="absolute right-0 top-full mt-2 px-2.5 py-1 rounded-md bg-zinc-900 text-stone-100 text-xs whitespace-nowrap opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-premium pointer-events-none border border-stone-50/10 shadow-diffusion"
              >
                Espace agence
              </span>
            </Link>
          </div>

          {/* Mobile cluster */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle variant="rail" />
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-stone-50 hover:bg-stone-50/5 transition"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} weight="regular" /> : <List size={20} weight="regular" />}
            </button>
          </div>
        </nav>
      </motion.div>

      {/* Mobile drawer — anchored just below the floating capsule. */}
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
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <div className="border-t border-stone-50/8 px-3 py-3 flex items-center justify-between">
                <Link
                  to="/admin/login"
                  onClick={close}
                  className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-stone-100 transition"
                >
                  <Lock size={13} weight="regular" />
                  Espace agence
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
