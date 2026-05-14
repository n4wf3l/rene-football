import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell, CheckCircle, ChartLineUp, ClipboardText, Crosshair,
  ExclamationMark, FilmSlate, ListChecks, NotePencil, SoccerBall, Target, Users,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { ScoutingDashboardSnapshot } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import { CompletenessBar, NextActionBadge, ScoreBadge, StatusBadge, ReportStatusBadge } from '../badges'

const KPI_DEFS: Array<{ key: keyof ScoutingDashboardSnapshot['kpi']; label: string; icon: PhosphorIcon }> = [
  { key: 'players_followed',       label: 'Joueurs suivis',        icon: Users },
  { key: 'players_priority',       label: 'Joueurs prioritaires',  icon: Crosshair },
  { key: 'reports_to_validate',    label: 'Rapports à valider',    icon: ClipboardText },
  { key: 'reports_incomplete',     label: 'Rapports incomplets',   icon: NotePencil },
  { key: 'missions_today',         label: 'Missions aujourd\'hui', icon: ListChecks },
  { key: 'players_no_next_action', label: 'Sans prochaine action', icon: ExclamationMark },
  { key: 'files_incomplete',       label: 'Fiches incomplètes',    icon: SoccerBall },
  { key: 'shortlists_active',      label: 'Shortlists actives',    icon: ChartLineUp },
  { key: 'needs_open',             label: 'Besoins ouverts',       icon: Target },
  { key: 'clips_to_process',       label: 'Clips à traiter',       icon: FilmSlate },
]

function Dashboard() {
  const [snapshot, setSnapshot] = useState<ScoutingDashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false
    scoutingApi.dashboard()
      .then((s) => { if (!cancelled) setSnapshot(s) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const open = (params: Record<string, string>) => {
    const sp = new URLSearchParams(window.location.search)
    Object.entries(params).forEach(([k, v]) => sp.set(k, v))
    setParams(sp)
  }

  const alertCount = useMemo(() => {
    if (!snapshot) return 0
    const a = snapshot.alerts
    return a.high_score_low_confidence.length + a.incomplete_files.length
         + a.shortlist_a_needs_validation.length + a.low_coverage_needs.length
         + a.missing_next_action.length + a.stalled_reports.length
  }, [snapshot])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {KPI_DEFS.map((d) => <Skeleton key={d.key} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }
  if (!snapshot) return null

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {KPI_DEFS.map((d) => {
          const value = snapshot.kpi[d.key] ?? 0
          return (
            <motion.div
              key={d.key}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
              className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 p-4"
            >
              <div className="flex items-start justify-between">
                <span className="text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">{d.label}</span>
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-turf-50 text-turf-700 dark:bg-turf-800/30 dark:text-turf-300">
                  <d.icon size={14} weight="duotone" />
                </span>
              </div>
              <div className="mt-3 font-display font-semibold text-3xl tracking-tight text-zinc-950 dark:text-stone-50 tabular-nums">
                {value}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Mes priorités */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Block title="Rapports à valider" hint={`${snapshot.priorities.reports_to_validate.length} ouverts`} accent="amber">
          {snapshot.priorities.reports_to_validate.length === 0 ? (
            <Empty message="Pas de rapport en attente. " />
          ) : (
            <ul className="space-y-2">
              {snapshot.priorities.reports_to_validate.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => open({ view: 'reports', report: String(r.id) })}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
                  >
                    <img src={r.player?.photo_url || ''} alt="" className="w-8 h-8 rounded-full object-cover bg-stone-200 dark:bg-stone-800" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-stone-100 truncate">{r.player?.name}</div>
                      <div className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate">
                        {r.match ? `${r.match.home_team} – ${r.match.away_team}` : 'Vidéo'}
                      </div>
                    </div>
                    <ReportStatusBadge status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Missions du jour" hint={`${snapshot.priorities.missions_today.length} actives`} accent="blue">
          {snapshot.priorities.missions_today.length === 0 ? (
            <Empty message="Aucune mission programmée aujourd'hui." cta={{ label: 'Voir le kanban', onClick: () => open({ view: 'missions' }) }} />
          ) : (
            <ul className="space-y-2">
              {snapshot.priorities.missions_today.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => open({ view: 'missions', mission: String(m.id) })}
                    className="w-full text-left flex flex-col gap-1 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
                  >
                    <span className="text-sm font-medium text-zinc-900 dark:text-stone-100 truncate">{m.title}</span>
                    {m.match && (
                      <span className="text-[0.7rem] text-zinc-500 dark:text-stone-400">{m.match.home_team} – {m.match.away_team}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Fiches incomplètes" hint={`${snapshot.priorities.incomplete_files.length} à finir`} accent="rose">
          {snapshot.priorities.incomplete_files.length === 0 ? (
            <Empty message="Tous les dossiers prioritaires sont à jour." />
          ) : (
            <ul className="space-y-2">
              {snapshot.priorities.incomplete_files.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => open({ view: 'players', player: p.slug })}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
                  >
                    <img src={p.photo_url || ''} alt="" className="w-8 h-8 rounded-full object-cover bg-stone-200 dark:bg-stone-800" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-stone-100 truncate">{p.name}</div>
                      <div className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate">{p.position}</div>
                    </div>
                    <CompletenessBar percent={p.completeness_pct} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </section>

      {/* Joueurs prioritaires */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 overflow-hidden">
        <header className="px-5 py-3 flex items-center justify-between border-b border-stone-200 dark:border-stone-50/8">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Joueurs prioritaires</h3>
          <button onClick={() => open({ view: 'players' })} className="text-xs text-turf-700 dark:text-turf-300 hover:underline">Tout voir</button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-zinc-950 text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
              <tr>
                <th className="text-left px-4 py-2">Joueur</th>
                <th className="text-left px-4 py-2">Poste · Club</th>
                <th className="text-right px-4 py-2">Score global</th>
                <th className="text-right px-4 py-2">Confiance</th>
                <th className="text-left px-4 py-2">Statut</th>
                <th className="text-left px-4 py-2">Prochaine action</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.top_players.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => open({ view: 'players', player: p.slug })}
                  className="border-t border-stone-200 dark:border-stone-50/8 hover:bg-stone-50 dark:hover:bg-stone-50/5 cursor-pointer"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <img src={p.photo_url || ''} alt="" className="w-8 h-8 rounded-full object-cover bg-stone-200 dark:bg-stone-800" />
                      <span className="font-medium text-zinc-950 dark:text-stone-50">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-700 dark:text-stone-300">{p.position} · <span className="text-zinc-500 dark:text-stone-400">{p.club ?? '—'}</span></td>
                  <td className="px-4 py-2.5 text-right"><ScoreBadge score={p.score_global} /></td>
                  <td className="px-4 py-2.5 text-right"><ScoreBadge score={p.score_confidence} /></td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.scouting_status} /></td>
                  <td className="px-4 py-2.5"><NextActionBadge action={p.next_action} /></td>
                </tr>
              ))}
              {snapshot.top_players.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500 dark:text-stone-400 text-sm">Aucun joueur sous mandat actif.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rapports récents */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 overflow-hidden">
        <header className="px-5 py-3 flex items-center justify-between border-b border-stone-200 dark:border-stone-50/8">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Rapports récents</h3>
          <button onClick={() => open({ view: 'reports' })} className="text-xs text-turf-700 dark:text-turf-300 hover:underline">Tout voir</button>
        </header>
        <ul className="divide-y divide-stone-200 dark:divide-stone-50/8">
          {snapshot.recent_reports.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => open({ view: 'reports', report: String(r.id) })}
                className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-50/5 transition"
              >
                <img src={r.player?.photo_url || ''} alt="" className="w-8 h-8 rounded-full object-cover bg-stone-200 dark:bg-stone-800" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900 dark:text-stone-100 truncate">{r.player?.name}</div>
                  <div className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate">
                    {r.match ? `${r.match.home_team} – ${r.match.away_team}` : 'Vidéo / hors match'} · {r.scout?.name ?? '—'}
                  </div>
                </div>
                <span className="font-mono text-xs tabular-nums text-zinc-700 dark:text-stone-300">{r.global_rating != null ? `${Number(r.global_rating).toFixed(1)}/10` : '—'}</span>
                <ReportStatusBadge status={r.status} />
              </button>
            </li>
          ))}
          {snapshot.recent_reports.length === 0 && (
            <li className="px-5 py-6 text-center text-zinc-500 dark:text-stone-400 text-sm">Aucun rapport produit pour l'instant.</li>
          )}
        </ul>
      </section>

      {/* Alertes intelligentes */}
      <section className="rounded-2xl bg-zinc-950 text-stone-100 dark:bg-zinc-900 dark:text-stone-100 p-5 lg:p-6 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(15,81,50,0.25), transparent 60%)' }}
        />
        <header className="relative flex items-center gap-2 mb-4">
          <Bell size={16} weight="duotone" className="text-turf-300" />
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-turf-300">Intelligence — {alertCount} signaux</h3>
          <button onClick={() => open({ view: 'intelligence' })} className="ml-auto text-xs text-stone-300 hover:text-stone-50">Tout voir →</button>
        </header>
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
          <AlertMini label="Score élevé / confiance faible" count={snapshot.alerts.high_score_low_confidence.length} />
          <AlertMini label="Fiches incomplètes" count={snapshot.alerts.incomplete_files.length} />
          <AlertMini label="Shortlist A à valider" count={snapshot.alerts.shortlist_a_needs_validation.length} />
          <AlertMini label="Besoins peu couverts" count={snapshot.alerts.low_coverage_needs.length} />
          <AlertMini label="Sans prochaine action" count={snapshot.alerts.missing_next_action.length} />
          <AlertMini label="Rapports en retard" count={snapshot.alerts.stalled_reports.length} />
        </div>
      </section>
    </div>
  )
}

function Block({ title, hint, accent, children }: { title: string; hint?: string; accent: 'turf' | 'amber' | 'blue' | 'rose'; children: React.ReactNode }) {
  const accents: Record<string, string> = {
    turf: 'border-l-turf-500',
    amber: 'border-l-amber-500',
    blue: 'border-l-blue-500',
    rose: 'border-l-rose-500',
  }
  return (
    <div className={`rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 border-l-4 ${accents[accent]}`}>
      <header className="px-5 py-3 flex items-baseline justify-between border-b border-stone-200 dark:border-stone-50/8">
        <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">{title}</h3>
        {hint && <span className="text-[0.65rem] font-mono text-zinc-400 dark:text-stone-500">{hint}</span>}
      </header>
      <div className="px-3 py-2">{children}</div>
    </div>
  )
}

function Empty({ message, cta }: { message: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="px-3 py-6 text-center">
      <CheckCircle size={18} weight="duotone" className="mx-auto text-turf-700 dark:text-turf-300 mb-2" />
      <p className="text-sm text-zinc-600 dark:text-stone-400">{message}</p>
      {cta && (
        <button onClick={cta.onClick} className="mt-3 text-xs text-turf-700 dark:text-turf-300 hover:underline">{cta.label}</button>
      )}
    </div>
  )
}

function AlertMini({ label, count }: { label: string; count: number }) {
  const tone = count === 0 ? 'text-stone-400' : count >= 3 ? 'text-rose-300' : 'text-amber-300'
  return (
    <div className="rounded-xl bg-stone-50/5 border border-stone-50/10 px-4 py-3">
      <div className="text-[0.6rem] font-mono uppercase tracking-[0.16em] text-stone-400 mb-1">{label}</div>
      <div className={`font-display font-semibold text-3xl tabular-nums ${tone}`}>{count}</div>
    </div>
  )
}

export default Dashboard
