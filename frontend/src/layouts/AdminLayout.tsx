import { useState } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChartLineUp,
  House,
  List as ListIcon,
  SignOut,
  SoccerBall,
  X as XIcon,
} from '@phosphor-icons/react'
import { useAuth } from '../auth/AuthContext'
import ThemeToggle from '../theme/ThemeToggle'

interface AdminNavItem {
  to: string
  label: string
  icon: PhosphorIcon
  end?: boolean
}

const NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin',          label: 'Tableau de bord', icon: House,         end: true },
  { to: '/admin/joueurs',  label: 'Joueurs',         icon: SoccerBall },
  { to: '/admin/analyse',  label: 'Data analyse',    icon: ChartLineUp },
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
        `group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors duration-200 ease-premium ${
          isActive
            ? 'bg-stone-200/70 text-zinc-950 dark:bg-stone-50/8 dark:text-stone-50'
            : 'text-zinc-600 hover:bg-stone-200/50 hover:text-zinc-950 dark:text-stone-400 dark:hover:bg-stone-50/5 dark:hover:text-stone-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="admin-nav-active"
              className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-turf-700 dark:bg-turf-300"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <Icon size={18} weight={isActive ? 'duotone' : 'regular'} className={isActive ? 'text-turf-700 dark:text-turf-300' : ''} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

interface SidebarProps {
  onClose?: () => void
}

function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <aside className="flex flex-col h-full w-64 bg-white text-zinc-900 border-r border-stone-200 dark:bg-zinc-950 dark:text-stone-100 dark:border-stone-50/8">
      <div className="flex items-center justify-between px-5 h-16 border-b border-stone-200 dark:border-stone-50/8">
        <div className="inline-flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-turf-800 text-stone-50 font-display font-bold text-sm">
            R
          </span>
          <div className="leading-tight">
            <div className="font-display font-semibold text-zinc-950 dark:text-stone-50 text-sm">Rene Football</div>
            <div className="text-[0.65rem] font-mono uppercase tracking-wider text-turf-700 dark:text-turf-300">Back-office</div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-zinc-500 hover:text-zinc-900 dark:text-stone-300 dark:hover:text-stone-50 transition"
            aria-label="Fermer le menu"
          >
            <XIcon size={18} weight="regular" />
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

function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-[100dvh] bg-stone-100 dark:bg-zinc-950">
      <div className="hidden lg:block sticky top-0 h-[100dvh]">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-zinc-950/60" onClick={() => setMobileOpen(false)} />
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="relative h-full"
          >
            <Sidebar onClose={() => setMobileOpen(false)} />
          </motion.div>
        </div>
      )}

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
