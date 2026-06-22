import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Bell, ClockCountdown, ListChecks, NotePencil, Target, TrendDown, Warning,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { ScoutingAlerts } from '../../../types/scouting'
import Skeleton from '../../Skeleton'

function IntelligenceView() {
  const [alerts, setAlerts] = useState<ScoutingAlerts | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false
    scoutingApi.intelligence()
      .then((res) => { if (!cancelled) setAlerts(res.alerts) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const openPlayer = (slug: string) => {
    const sp = new URLSearchParams(window.location.search)
    sp.set('player', slug); sp.set('view', 'players')
    setParams(sp)
  }
  const openReport = (id: number) => {
    const sp = new URLSearchParams(window.location.search)
    sp.set('report', String(id)); sp.set('view', 'reports')
    setParams(sp)
  }
  const openNeed = (slug: string) => {
    const sp = new URLSearchParams(window.location.search)
    sp.set('need', slug); sp.set('view', 'needs')
    setParams(sp)
  }

  if (loading || !alerts) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <AlertCard
        icon={TrendDown}
        tone="amber"
        title="Score élevé / confiance faible"
        items={alerts.high_score_low_confidence.map((p) => ({
          key: String(p.id),
          label: p.name,
          sub: `${p.position} · global ${Math.round(p.score_global ?? 0)} / conf ${Math.round(p.score_confidence ?? 0)}`,
          onClick: () => openPlayer(p.slug),
        }))}
        empty="Aucun signal sur ce critère."
      />
      <AlertCard
        icon={ListChecks}
        tone="rose"
        title="Dossiers incomplets"
        items={alerts.incomplete_files.map((p) => ({
          key: String(p.id),
          label: p.name,
          sub: `${p.scouting_status} · ${p.completeness_pct}%`,
          onClick: () => openPlayer(p.slug),
        }))}
        empty="Tous les dossiers priorisés sont à jour."
      />
      <AlertCard
        icon={Warning}
        tone="amber"
        title="Shortlist A sans validation"
        items={alerts.shortlist_a_needs_validation.map((e) => ({
          key: String(e.id),
          label: e.player?.name ?? 'Joueur',
          sub: e.player?.position ?? '',
          onClick: () => e.player && openPlayer(e.player.slug),
        }))}
        empty="Toutes les Shortlists A sont validées."
      />
      <AlertCard
        icon={Target}
        tone="rose"
        title="Besoins peu couverts"
        items={alerts.low_coverage_needs.map((n) => ({
          key: String(n.id),
          label: n.title,
          sub: `${n.position} · ${n.priority}`,
          onClick: () => openNeed(n.slug),
        }))}
        empty="Tous les besoins ont assez de profils."
      />
      <AlertCard
        icon={NotePencil}
        tone="amber"
        title="Sans prochaine action"
        items={alerts.missing_next_action.map((p) => ({
          key: String(p.id),
          label: p.name,
          sub: p.position,
          onClick: () => openPlayer(p.slug),
        }))}
        empty="Tous les joueurs suivis ont une prochaine action."
      />
      <AlertCard
        icon={ClockCountdown}
        tone="rose"
        title="Rapports en retard"
        items={alerts.stalled_reports.map((r) => ({
          key: String(r.id),
          label: r.player?.name ?? 'Rapport',
          sub: r.submitted_at ? `Soumis le ${new Date(r.submitted_at).toLocaleDateString('fr-FR')}` : '',
          onClick: () => openReport(r.id),
        }))}
        empty="Aucun rapport en retard."
      />
    </div>
  )
}

interface Item { key: string; label: string; sub?: string; onClick?: () => void }

function AlertCard({ icon: Icon, tone, title, items, empty }: { icon: PhosphorIcon; tone: 'amber' | 'rose'; title: string; items: Item[]; empty: string }) {
  const palette = tone === 'amber'
    ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-400/30 dark:text-amber-200'
    : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-900/20 dark:border-rose-400/30 dark:text-rose-200'
  return (
    <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 overflow-hidden">
      <header className={`px-4 py-3 border-b border-stone-200 dark:border-stone-50/10 flex items-center gap-2 ${palette}`}>
        <Icon size={14} weight="duotone" />
        <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem]">{title}</h3>
        <span className="ml-auto text-[0.65rem] font-mono tabular-nums">{items.length}</span>
      </header>
      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-stone-400">{empty}</div>
      ) : (
        <ul className="divide-y divide-stone-200 dark:divide-stone-50/10">
          {items.map((it) => (
            <li key={it.key}>
              <button
                onClick={it.onClick}
                className="w-full text-left px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-50/5 transition"
              >
                <div className="font-medium text-sm text-zinc-950 dark:text-stone-50 truncate">{it.label}</div>
                {it.sub && <div className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate">{it.sub}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default IntelligenceView
