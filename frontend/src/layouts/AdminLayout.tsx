import { useEffect, useState } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowSquareOut,
  Binoculars,
  CaretDoubleLeft,
  CaretDoubleRight,
  ChartLineUp,
  House,
  List as ListIcon,
  Newspaper,
  SignOut,
  SoccerBall,
  X as XIcon,
} from '@phosphor-icons/react'
import { useAuth } from '../auth/AuthContext'
import ThemeToggle from '../theme/ThemeToggle'
import BrandLogo from '../components/BrandLogo'

const SIDEBAR_STATE_KEY = 'rene_admin_sidebar_open'

interface AdminNavItem {
  to: string
  label: string
  icon: PhosphorIcon
  end?: boolean
}

const NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin',           label: 'Tableau de bord', icon: House,         end: true },
  { to: '/admin/joueurs',   label: 'Joueurs',         icon: SoccerBall },
  { to: '/admin/analyse',   label: 'Data analyse',    icon: ChartLineUp },
  { to: '/admin/articles',  label: 'Actualités',      icon: Newspaper },
  { to: '/admin/scouting',  label: 'Scouting',        icon: Binoculars },
]

interface SidebarLinkProps {
  to: string
  label: string
  icon: PhosphorIcon
  end?: boolean
}

function SidebarLink({ to, label, icon: Icon, end }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 pl-5 pr-4 py-2.5 rounded-xl text-sm transition-colors duration-200 ease-premium ${
          isActive
            ? 'bg-turf-50 text-turf-900 border border-turf-200/70 dark:bg-turf-900/25 dark:text-stone-50 dark:border-turf-400/15'
            : 'text-zinc-600 border border-transparent hover:bg-stone-200/50 hover:text-zinc-950 dark:text-stone-400 dark:hover:bg-stone-50/5 dark:hover:text-stone-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="admin-nav-active"
              className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-turf-600 dark:bg-turf-300 shadow-[0_0_12px_-2px_rgba(15,81,50,0.45)] dark:shadow-[0_0_12px_-2px_rgba(134,239,172,0.4)]"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <Icon
            size={18}
            weight={isActive ? 'duotone' : 'regular'}
            className={isActive
              ? 'text-turf-700 dark:text-turf-300'
              : 'text-zinc-500 group-hover:text-zinc-800 dark:text-stone-500 dark:group-hover:text-stone-200'}
          />
          <span className={isActive ? 'font-medium' : ''}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

interface SidebarProps {
  /** Mobile drawer close (X button on small screens). */
  onCloseMobile?: () => void
  /** Desktop collapse (chevron in the header). */
  onCollapseDesktop?: () => void
}

function Sidebar({ onCloseMobile, onCollapseDesktop }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <aside className="flex flex-col h-full w-64 bg-white text-zinc-900 border-r border-stone-200 dark:bg-zinc-950 dark:text-stone-100 dark:border-stone-50/8">
      <div className="flex items-center justify-between px-5 h-16 border-b border-stone-200 dark:border-stone-50/8">
        <div className="inline-flex items-center gap-2.5 min-w-0">
          <BrandLogo size={32} />
          <div className="leading-tight min-w-0">
            <div className="font-display font-semibold text-zinc-950 dark:text-stone-50 text-sm truncate">Rene Football</div>
            <div className="text-[0.65rem] font-mono uppercase tracking-wider text-turf-700 dark:text-turf-300">Back-office</div>
          </div>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-zinc-500 hover:text-zinc-900 dark:text-stone-300 dark:hover:text-stone-50 transition shrink-0"
            aria-label="Fermer le menu"
          >
            <XIcon size={18} weight="regular" />
          </button>
        )}
        {onCollapseDesktop && (
          <button
            type="button"
            onClick={onCollapseDesktop}
            className="hidden lg:grid place-items-center w-7 h-7 rounded-md text-zinc-500 hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 transition shrink-0"
            aria-label="Replier la sidebar"
            title="Replier la sidebar"
          >
            <CaretDoubleLeft size={14} weight="bold" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[0.6rem] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:text-stone-500">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}

        <div className="px-3 mt-6 mb-2 text-[0.6rem] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:text-stone-500">
          Site public
        </div>
        <Link
          to="/"
          onClick={onCloseMobile}
          className="group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors duration-200 ease-premium text-zinc-600 hover:bg-stone-200/50 hover:text-zinc-950 dark:text-stone-400 dark:hover:bg-stone-50/5 dark:hover:text-stone-100"
        >
          <ArrowSquareOut size={18} weight="regular" />
          <span>Voir la landing page</span>
        </Link>
      </nav>

      <div className="border-t border-stone-200 dark:border-stone-50/8 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="grid place-items-center w-9 h-9 rounded-full bg-stone-200 text-zinc-700 dark:bg-stone-50/10 dark:text-stone-100 text-xs font-medium">
            {(user?.name || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="leading-tight overflow-hidden flex-1">
            <div className="text-sm text-zinc-900 dark:text-stone-100 truncate">{user?.name}</div>
            <div className="text-[0.65rem] font-mono text-zinc-500 dark:text-stone-500 truncate">{user?.email}</div>
          </div>
          <ThemeToggle variant="header" className="!w-8 !h-8" />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-[0.16em] text-zinc-600 border border-stone-300 hover:border-zinc-900 hover:text-zinc-900 dark:text-stone-300 dark:border-stone-50/10 dark:hover:border-stone-50/30 dark:hover:text-stone-50 transition"
        >
          <SignOut size={14} weight="bold" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

interface ReopenHandleProps {
  onClick: () => void
}

/**
 * Floating handle on the left edge — only rendered when the desktop sidebar
 * is collapsed. Visually echoes the BrandLogo + a chevron, so the user
 * always has a recognizable way back to the menu.
 */
function ReopenHandle({ onClick }: ReopenHandleProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ x: -32, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -32, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      whileHover={{ x: 2 }}
      aria-label="Rouvrir la sidebar"
      title="Rouvrir la sidebar"
      className="hidden lg:flex fixed left-3 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-1.5 rounded-full bg-white/95 backdrop-blur border border-stone-200 dark:bg-zinc-900/95 dark:border-stone-50/10 px-2 py-3 shadow-diffusion text-zinc-700 dark:text-stone-300 hover:text-zinc-950 dark:hover:text-stone-50 transition-colors"
    >
      <BrandLogo size={22} />
      <CaretDoubleRight size={12} weight="bold" />
    </motion.button>
  )
}

function readInitialDesktopOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = window.localStorage.getItem(SIDEBAR_STATE_KEY)
    if (v === 'closed') return false
    if (v === 'open') return true
  } catch { /* ignore */ }
  return true
}

/* Routes that auto-collapse the sidebar so the editor gets the full width.
   The user keeps control: they can re-open it via the floating handle, and the
   choice is NOT persisted to localStorage so leaving the route restores their
   regular preference. */
const FOCUS_ROUTES: RegExp[] = [
  /^\/admin\/joueurs\/nouveau$/,
  /^\/admin\/joueurs\/[^/]+\/edit$/,
  /^\/admin\/articles\/nouveau$/,
  /^\/admin\/articles\/[^/]+\/edit$/,
  // Scouting cockpit has its own internal sidebar — collapse the outer one.
  /^\/admin\/scouting$/,
]

function isFocusRoute(pathname: string): boolean {
  return FOCUS_ROUTES.some((rx) => rx.test(pathname))
}

function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState<boolean>(() => readInitialDesktopOpen())
  const location = useLocation()

  // Persist user-driven open/close (but skip when we're on a focus route — the
  // collapse there is route-driven, not user-driven, and shouldn't overwrite
  // their default preference).
  useEffect(() => {
    if (isFocusRoute(location.pathname)) return
    try {
      window.localStorage.setItem(SIDEBAR_STATE_KEY, desktopOpen ? 'open' : 'closed')
    } catch { /* ignore */ }
  }, [desktopOpen, location.pathname])

  // Auto-collapse the sidebar when we enter an editor route; restore the saved
  // preference when we leave it. Reads each time the path changes.
  useEffect(() => {
    if (isFocusRoute(location.pathname)) {
      setDesktopOpen(false)
    } else {
      setDesktopOpen(readInitialDesktopOpen())
    }
  }, [location.pathname])

  return (
    <div className="flex min-h-[100dvh] bg-stone-100 dark:bg-zinc-950">
      {/* Desktop sidebar — collapsible, persisted state. */}
      <AnimatePresence initial={false}>
        {desktopOpen && (
          <motion.div
            key="admin-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            className="hidden lg:block sticky top-0 h-[100dvh] overflow-hidden shrink-0"
          >
            <Sidebar onCollapseDesktop={() => setDesktopOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!desktopOpen && <ReopenHandle key="admin-reopen" onClick={() => setDesktopOpen(true)} />}
      </AnimatePresence>

      {/* Mobile drawer (independent of the desktop collapse state). */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/60"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="relative h-full"
            >
              <Sidebar onCloseMobile={() => setMobileOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden flex items-center justify-between bg-white text-zinc-900 border-stone-200 dark:bg-zinc-950 dark:text-stone-100 dark:border-stone-50/8 h-14 px-4 border-b">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="text-zinc-700 hover:text-zinc-900 dark:text-stone-200 dark:hover:text-stone-50 transition"
            aria-label="Ouvrir le menu"
          >
            <ListIcon size={22} weight="regular" />
          </button>
          <div className="font-display font-semibold text-sm">
            Rene <span className="text-turf-700 dark:text-turf-300">Football</span>
          </div>
          <ThemeToggle variant="header" className="!w-8 !h-8" />
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
