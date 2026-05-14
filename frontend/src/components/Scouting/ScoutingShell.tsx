import { lazy, Suspense, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import {
  Binoculars,
  ChartLineUp,
  ChartPie,
  Clipboard,
  House,
  ListChecks,
  Newspaper,
  SoccerBall,
  Stack,
  Target,
  VideoCamera,
} from '@phosphor-icons/react'
import Skeleton from '../Skeleton'
import { SCOUTING_VIEWS, type ScoutingView } from '../../types/scouting'

/* Each view is lazily imported so the initial /admin/scouting payload stays small. */
const Dashboard       = lazy(() => import('./views/Dashboard'))
const PlayersView     = lazy(() => import('./views/PlayersView'))
const MatchesView     = lazy(() => import('./views/MatchesView'))
const ReportsView     = lazy(() => import('./views/ReportsView'))
const MissionsView    = lazy(() => import('./views/MissionsView'))
const ShortlistsView  = lazy(() => import('./views/ShortlistsView'))
const NeedsView       = lazy(() => import('./views/NeedsView'))
const VideosView      = lazy(() => import('./views/VideosView'))
const IntelligenceView= lazy(() => import('./views/IntelligenceView'))

/* Lazy drawers — only loaded when the matching query param is present. */
const PlayerDrawer    = lazy(() => import('./drawers/PlayerDrawer'))
const ReportDrawer    = lazy(() => import('./drawers/ReportDrawer'))
const MissionDrawer   = lazy(() => import('./drawers/MissionDrawer'))
const NeedDrawer      = lazy(() => import('./drawers/NeedDrawer'))

interface SidebarItem {
  view: ScoutingView
  label: string
  icon: PhosphorIcon
}

const SIDEBAR: SidebarItem[] = [
  { view: 'dashboard',    label: 'Tableau de bord',     icon: House },
  { view: 'players',      label: 'Joueurs',             icon: SoccerBall },
  { view: 'matches',      label: 'Matchs',              icon: Stack },
  { view: 'reports',      label: 'Rapports',            icon: Clipboard },
  { view: 'missions',     label: 'Missions',            icon: ListChecks },
  { view: 'shortlists',   label: 'Shortlists',          icon: ChartPie },
  { view: 'needs',        label: 'Besoins',             icon: Target },
  { view: 'videos',       label: 'Vidéos',              icon: VideoCamera },
  { view: 'intelligence', label: 'Intelligence',        icon: ChartLineUp },
]

const VIEW_LABELS: Record<ScoutingView, { title: string; subtitle: string }> = {
  dashboard:    { title: 'Tableau de bord scouting',   subtitle: 'Vue d\'ensemble des priorités, joueurs prioritaires et alertes.' },
  players:      { title: 'Joueurs suivis',             subtitle: 'Base interne — statuts, scores, complétude des dossiers.' },
  matches:      { title: 'Matchs',                     subtitle: 'Calendrier des rencontres observées.' },
  reports:      { title: 'Rapports scouts',            subtitle: 'Production, soumission, validation.' },
  missions:     { title: 'Missions scout',             subtitle: 'Attributions terrain et validations.' },
  shortlists:   { title: 'Shortlists',                 subtitle: 'Évolution des cibles, du watchlist à la validation.' },
  needs:        { title: 'Besoins de recrutement',     subtitle: 'Postes ouverts, budgets et couverture des profils.' },
  videos:       { title: 'Vidéos & clips',             subtitle: 'Annotations et preuves vidéo des joueurs.' },
  intelligence: { title: 'Intelligence',               subtitle: 'Alertes proactives : dossiers à risque, opportunités, retards.' },
}

function isValidView(v: string | null | undefined): v is ScoutingView {
  return !!v && (SCOUTING_VIEWS as readonly string[]).includes(v)
}

function ScoutingShell() {
  const [params, setParams] = useSearchParams()
  const view = isValidView(params.get('view')) ? (params.get('view') as ScoutingView) : 'dashboard'
  const playerSlug = params.get('player')
  const reportId = params.get('report')
  const missionId = params.get('mission')
  const needSlug = params.get('need')

  const goTo = (next: ScoutingView) => {
    const sp = new URLSearchParams(params)
    sp.set('view', next)
    // Closing any open drawer when switching views avoids surprise re-opens.
    sp.delete('player'); sp.delete('report'); sp.delete('mission'); sp.delete('need')
    setParams(sp, { replace: false })
  }

  const closeDrawer = () => {
    const sp = new URLSearchParams(params)
    sp.delete('player'); sp.delete('report'); sp.delete('mission'); sp.delete('need')
    setParams(sp, { replace: true })
  }

  const labels = VIEW_LABELS[view]

  const viewContent = useMemo(() => {
    switch (view) {
      case 'dashboard':    return <Dashboard />
      case 'players':      return <PlayersView />
      case 'matches':      return <MatchesView />
      case 'reports':      return <ReportsView />
      case 'missions':     return <MissionsView />
      case 'shortlists':   return <ShortlistsView />
      case 'needs':        return <NeedsView />
      case 'videos':       return <VideosView />
      case 'intelligence': return <IntelligenceView />
    }
  }, [view])

  return (
    <div className="flex min-h-[100dvh] bg-stone-50 dark:bg-zinc-950">
      {/* Internal scouting sidebar — distinct from the outer admin sidebar (which auto-collapses on this route). */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-0 h-[100dvh] border-r border-stone-200 dark:border-stone-50/8 bg-white dark:bg-zinc-900/40">
        <div className="px-5 h-16 flex items-center gap-2.5 border-b border-stone-200 dark:border-stone-50/8">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950">
            <Binoculars size={18} weight="duotone" />
          </span>
          <div className="leading-tight">
            <div className="font-display font-semibold text-sm text-zinc-950 dark:text-stone-50">Scouting</div>
            <div className="text-[0.6rem] font-mono uppercase tracking-wider text-turf-700 dark:text-turf-300">Cockpit</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-3 mb-2 text-[0.6rem] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:text-stone-500">
            Vues
          </div>
          {SIDEBAR.map((item) => {
            const active = view === item.view
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => goTo(item.view)}
                className={`group relative flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors duration-200 ${
                  active
                    ? 'bg-stone-200/70 text-zinc-950 dark:bg-stone-50/8 dark:text-stone-50'
                    : 'text-zinc-600 hover:bg-stone-200/40 hover:text-zinc-950 dark:text-stone-400 dark:hover:bg-stone-50/5 dark:hover:text-stone-100'
                }`}
              >
                {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-turf-700 dark:bg-turf-300" />}
                <item.icon size={16} weight={active ? 'duotone' : 'regular'} className={active ? 'text-turf-700 dark:text-turf-300' : ''} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile horizontal nav — quick access without the desktop rail. */}
        <div className="lg:hidden border-b border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 overflow-x-auto">
          <div className="flex gap-1 px-3 py-2 min-w-max">
            {SIDEBAR.map((item) => {
              const active = view === item.view
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => goTo(item.view)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    active
                      ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-300 dark:hover:text-stone-100'
                  }`}
                >
                  <item.icon size={14} weight={active ? 'duotone' : 'regular'} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <header className="px-6 lg:px-10 pt-8 pb-5 border-b border-stone-200 dark:border-stone-50/8 bg-white/70 dark:bg-zinc-950">
          <span className="eyebrow">Scouting</span>
          <h1 className="mt-1 font-display font-semibold text-2xl lg:text-3xl tracking-tight text-zinc-950 dark:text-stone-50">
            {labels.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-stone-400 max-w-2xl">{labels.subtitle}</p>
        </header>

        <section className="flex-1 px-6 lg:px-10 py-8">
          <Suspense fallback={<div className="space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full" /></div>}>
            {viewContent}
          </Suspense>
        </section>
      </main>

      {/* Right-side drawers (controlled by URL params). One mount at a time. */}
      <Suspense fallback={null}>
        {playerSlug && <PlayerDrawer slug={playerSlug} onClose={closeDrawer} />}
        {reportId && <ReportDrawer id={Number(reportId)} onClose={closeDrawer} />}
        {missionId && <MissionDrawer id={Number(missionId)} onClose={closeDrawer} />}
        {needSlug && <NeedDrawer slug={needSlug} onClose={closeDrawer} />}
      </Suspense>
    </div>
  )
}

export default ScoutingShell
