import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Binoculars,
  ChartLineUp,
  ClipboardText,
  Crosshair,
  Flag,
  ListChecks,
  MagnifyingGlass,
  Target,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { scoutingApi } from '../../lib/scoutingApi'
import type { ScoutingDashboardSnapshot, ScoutingStatus } from '../../types/scouting'
import Skeleton from '../../components/Skeleton'
import { usePermissions, type Permission } from '../../auth/permissions'

const STATUS_LABEL: Record<ScoutingStatus, string> = {
  decouvert: 'Découvert',
  watchlist: 'Watchlist',
  shortlist_b: 'Shortlist B',
  shortlist_a: 'Shortlist A',
  valide: 'Validé',
  rejete: 'Écarté',
  archive: 'Archivé',
}

const scoutingView = (view: string, extra?: Record<string, string>) =>
  `/admin/scouting?${new URLSearchParams({ view, ...extra }).toString()}`

interface KpiDef { key: keyof ScoutingDashboardSnapshot['kpi']; label: string; Icon: PhosphorIcon; to: string; alert?: boolean }

const KPIS: KpiDef[] = [
  { key: 'players_followed', label: 'Joueurs suivis', Icon: UsersThree, to: scoutingView('players') },
  { key: 'players_priority', label: 'Shortlist A', Icon: Target, to: scoutingView('shortlists') },
  { key: 'reports_to_validate', label: 'Rapports à valider', Icon: ListChecks, to: scoutingView('reports'), alert: true },
  { key: 'reports_incomplete', label: 'Rapports en cours', Icon: ClipboardText, to: scoutingView('reports') },
  { key: 'missions_today', label: 'Missions du jour', Icon: Crosshair, to: scoutingView('missions'), alert: true },
  { key: 'needs_open', label: 'Besoins ouverts', Icon: Flag, to: scoutingView('needs') },
]

interface ToolDef {
  title: string
  body: string
  Icon: PhosphorIcon
  to: string
  links: Array<{ label: string; to: string }>
  note?: string
  /** Tool shown only to roles with this permission. */
  need?: Permission
}

const TOOLS: ToolDef[] = [
  {
    title: 'Data analyse',
    body: 'Statistiques des joueurs de l’agence, heatmaps, comparaisons par poste et âge, forme match par match.',
    Icon: ChartLineUp,
    to: '/admin/analyse',
    links: [{ label: 'Tableau', to: '/admin/analyse' }],
    need: 'analysis',
  },
  {
    title: 'Scouting',
    body: 'Rapports de match, missions des scouts, shortlists et besoins de recrutement des clubs.',
    Icon: Binoculars,
    to: '/admin/scouting',
    links: [
      { label: 'Rapports', to: scoutingView('reports') },
      { label: 'Missions', to: scoutingView('missions') },
      { label: 'Shortlists', to: scoutingView('shortlists') },
    ],
    need: 'scouting',
  },
  {
    title: 'Centre de recherche',
    body: 'Veille du marché et recherche de profils dans les championnats suivis.',
    Icon: MagnifyingGlass,
    to: '/admin/recherche',
    links: [{ label: 'Découvrir', to: '/admin/recherche' }],
    note: 'Fonction Pro, pas encore activée',
  },
]

/** A link into the scouting cockpit; plain text for roles that can't open it. */
function ScoutLink({ allowed, to, className, children }: { allowed: boolean; to: string; className: string; children: ReactNode }) {
  return allowed ? <Link to={to} className={className}>{children}</Link> : <div className={className}>{children}</div>
}

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/**
 * Home of the "Sportif" space: where the sporting work stands (scouting
 * pipeline at a glance), the three tools, and what needs a decision.
 */
export default function AdminSportHome() {
  const [data, setData] = useState<ScoutingDashboardSnapshot | null>(null)
  const [failed, setFailed] = useState(false)
  const perms = usePermissions()
  const canScout = perms.scouting

  useEffect(() => {
    let cancelled = false
    scoutingApi.dashboard()
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

  const toValidate = data?.priorities.reports_to_validate ?? []
  const top = data?.top_players ?? []
  const alertsCount = data
    ? Object.values(data.alerts).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0)
    : 0

  return (
    <div className="min-h-[100dvh] bg-stone-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-[1680px] space-y-8 px-6 py-8 lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Espace sportif</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-stone-50 lg:text-[1.9rem]">Cellule performance</h1>
            <p className="mt-1 max-w-[70ch] text-sm text-zinc-600 dark:text-stone-400">
              Analyse, scouting et recherche : le travail sportif, séparé de la gestion du site.
            </p>
          </div>
          {alertsCount > 0 && (
            <ScoutLink allowed={canScout} to={scoutingView('intelligence')} className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:border-amber-500 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              <WarningCircle size={14} weight="bold" /> {alertsCount} point{alertsCount > 1 ? 's' : ''} d’attention
              {canScout && <ArrowRight size={12} weight="bold" />}
            </ScoutLink>
          )}
        </header>

        {failed && (
          <div className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-800 dark:bg-rose-500/15 dark:text-rose-300">
            Les chiffres du scouting sont indisponibles pour le moment. Les outils restent accessibles ci-dessous.
          </div>
        )}

        {/* Pipeline at a glance */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {KPIS.map(({ key, label, Icon, to, alert }, i) => {
            const value = data?.kpi[key]
            const hot = !!alert && (value ?? 0) > 0
            return (
              <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <ScoutLink
                  allowed={canScout}
                  to={to}
                  className={`group block rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
                    hot
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-900/20'
                      : 'border-stone-200 bg-white hover:border-stone-400 dark:border-stone-50/10 dark:bg-zinc-900 dark:hover:border-stone-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={18} className={hot ? 'text-emerald-700 dark:text-emerald-300' : 'text-zinc-400 dark:text-stone-500'} />
                    {canScout && <ArrowRight size={13} className="text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:text-stone-600 dark:group-hover:text-stone-200" />}
                  </div>
                  <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                    {value === undefined ? (failed ? '–' : <Skeleton className="h-8 w-10" />) : value}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400">{label}</div>
                </ScoutLink>
              </motion.div>
            )
          })}
        </section>

        {/* The tools */}
        <section className="grid gap-4 lg:grid-cols-3">
          {TOOLS.filter((tool) => !tool.need || perms[tool.need]).map(({ title, body, Icon, to, links, note }) => (
            <div key={title} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-50/10 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                  <Icon size={22} weight="duotone" />
                </span>
                {note && <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">{note}</span>}
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold text-zinc-950 dark:text-stone-50">{title}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-stone-400">{body}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link to={to} className="btn btn-primary px-4 py-2 text-sm">
                  Ouvrir <ArrowRight size={14} weight="bold" />
                </Link>
                {links.filter((l) => l.to !== to).map((l) => (
                  <Link key={l.label} to={l.to} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-500 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* What needs a decision */}
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-50/10 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-50/10">
              <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-stone-50">Rapports à valider</h2>
              {canScout && <Link to={scoutingView('reports')} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300">Tous les rapports</Link>}
            </div>
            {!data && !failed ? (
              <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : toValidate.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-stone-400">Aucun rapport en attente de validation.</p>
            ) : (
              <ul className="divide-y divide-stone-200 dark:divide-stone-50/10">
                {toValidate.slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <ScoutLink allowed={canScout} to={scoutingView('reports', { report: String(r.id) })} className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-50/[0.03]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-950 dark:text-stone-50">{r.player?.name ?? 'Joueur'}</span>
                        <span className="block truncate text-xs text-zinc-500 dark:text-stone-400">{[r.observed_position, r.recommendation ? STATUS_LABEL[r.recommendation as ScoutingStatus] ?? r.recommendation : null].filter(Boolean).join(' · ')}</span>
                      </span>
                      {r.global_rating != null && <span className="font-mono text-sm tabular-nums text-zinc-950 dark:text-stone-50">{Number(r.global_rating).toFixed(1)}</span>}
                      <span className="w-14 text-right font-mono text-[0.65rem] text-zinc-400 dark:text-stone-500">{fmtDate(r.submitted_at)}</span>
                    </ScoutLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-50/10 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-50/10">
              <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-stone-50">Joueurs en tête du scouting</h2>
              {canScout && <Link to={scoutingView('players')} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300">Tous les joueurs suivis</Link>}
            </div>
            {!data && !failed ? (
              <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : top.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-stone-400">Aucun joueur suivi pour le moment.</p>
            ) : (
              <ul className="divide-y divide-stone-200 dark:divide-stone-50/10">
                {top.slice(0, 6).map((p) => (
                  <li key={p.slug}>
                    <ScoutLink allowed={canScout} to={scoutingView('players', { player: p.slug })} className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-50/[0.03]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-950 dark:text-stone-50">{p.name}</span>
                        <span className="block truncate text-xs text-zinc-500 dark:text-stone-400">{p.next_action || [p.position, p.club].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                        {STATUS_LABEL[p.scouting_status] ?? p.scouting_status}
                      </span>
                      {p.score_global != null && <span className="w-10 text-right font-mono text-sm tabular-nums text-zinc-950 dark:text-stone-50">{Math.round(p.score_global)}</span>}
                    </ScoutLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
