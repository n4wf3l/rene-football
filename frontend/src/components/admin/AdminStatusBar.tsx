import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Binoculars, EnvelopeSimple, Sparkle } from '@phosphor-icons/react'

/**
 * Horizontal status strip rendered just above the admin content on desktop.
 * Surfaces two signals in one glance :
 *
 *  - the title of the current back-office section (wayfinding)
 *  - clickable chips for anything pending the operator should act on
 *    (unread contact submissions, scouting reports to validate…)
 *
 * Hidden on mobile — the mobile layout already has its own compact header
 * — and hidden on focus routes (editors) by the parent AdminLayout so the
 * work area stays maximal.
 */

export interface AdminStatusBarBadges {
  /** Scouting reports pending validation + personal reports flagged for rework. */
  scouting: number
  /** Contact submissions still at status=new (never opened by anyone). */
  contact: number
}

interface AdminStatusBarProps {
  badges: AdminStatusBarBadges
}

/** Human-facing title for the current admin section. First matching route
 *  wins ; sub-routes we don't label explicitly simply fall back to a dash. */
const SECTION_LABELS: Array<{ test: (p: string) => boolean; label: string }> = [
  { test: (p) => p === '/admin',                        label: 'Tableau de bord' },
  { test: (p) => p.startsWith('/admin/joueurs'),        label: 'Joueurs' },
  { test: (p) => p.startsWith('/admin/analyse'),        label: 'Data analyse' },
  { test: (p) => p.startsWith('/admin/articles'),       label: 'Actualités' },
  { test: (p) => p.startsWith('/admin/scouting'),       label: 'Scouting cockpit' },
  { test: (p) => p.startsWith('/admin/recherche'),      label: 'Centre de recherche' },
  { test: (p) => p.startsWith('/admin/equipe'),         label: 'Équipe' },
  { test: (p) => p.startsWith('/admin/partenaires'),    label: 'Partenaires' },
  { test: (p) => p.startsWith('/admin/presentations'),  label: 'Présentations' },
  { test: (p) => p.startsWith('/admin/contact'),        label: 'Boîte contact' },
  { test: (p) => p.startsWith('/admin/reglages'),       label: 'Réglages' },
]

function sectionLabel(pathname: string): string {
  const hit = SECTION_LABELS.find((s) => s.test(pathname))
  return hit?.label ?? 'Back-office'
}

export default function AdminStatusBar({ badges }: AdminStatusBarProps) {
  const location = useLocation()
  const label = sectionLabel(location.pathname)
  const total = badges.contact + badges.scouting
  const everythingHandled = total === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="hidden lg:flex items-center justify-between gap-4 h-11 px-6 border-b border-stone-200 bg-white/80 backdrop-blur dark:bg-zinc-950/80 dark:border-stone-50/10 sticky top-0 z-20"
    >
      {/* Current section — wayfinding on the left */}
      <div className="min-w-0 flex items-center gap-3">
        <span className="text-[0.62rem] font-mono uppercase tracking-[0.22em] text-zinc-400 dark:text-stone-500">
          Section
        </span>
        <span className="font-display font-semibold text-sm text-zinc-950 dark:text-stone-50 truncate">
          {label}
        </span>
      </div>

      {/* Pending work — chips linking to the relevant inbox */}
      <div className="flex items-center gap-2 shrink-0">
        {everythingHandled ? (
          <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500">
            <Sparkle size={11} weight="fill" className="text-turf-700 dark:text-turf-300" />
            Rien en attente
          </span>
        ) : (
          <>
            {badges.contact > 0 && (
              <StatusChip
                to="/admin/contact"
                icon={<EnvelopeSimple size={12} weight="bold" />}
                count={badges.contact}
                label={badges.contact === 1 ? 'contact non lu' : 'contacts non lus'}
                tone="rose"
              />
            )}
            {badges.scouting > 0 && (
              <StatusChip
                to="/admin/scouting"
                icon={<Binoculars size={12} weight="bold" />}
                count={badges.scouting}
                label={badges.scouting === 1 ? 'rapport à traiter' : 'rapports à traiter'}
                tone="turf"
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

interface StatusChipProps {
  to: string
  icon: React.ReactNode
  count: number
  label: string
  tone: 'rose' | 'turf'
}

function StatusChip({ to, icon, count, label, tone }: StatusChipProps) {
  const toneClass =
    tone === 'rose'
      ? 'bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/30 dark:hover:bg-rose-500/15'
      : 'bg-turf-50 text-turf-800 border-turf-200/80 hover:bg-turf-100 dark:bg-turf-800/20 dark:text-turf-200 dark:border-turf-400/30 dark:hover:bg-turf-800/30'

  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${toneClass}`}
    >
      {icon}
      <span className="font-mono tabular-nums">{count > 99 ? '99+' : count}</span>
      <span className="hidden xl:inline text-[0.68rem]">{label}</span>
    </Link>
  )
}
