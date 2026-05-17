import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { scoutingApi } from '../../../lib/scoutingApi'
import { useAuth } from '../../../auth/AuthContext'
import type { ReportStatus, ScoutingReport } from '../../../types/scouting'
import { REPORT_STATUS_LABEL } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import { ReportStatusBadge } from '../badges'

type TabKey = ReportStatus | 'all' | 'incomplete' | 'for_me'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'for_me',        label: 'Pour moi' },
  { key: 'all',           label: 'Tous' },
  { key: 'submitted',     label: 'À valider' },
  { key: 'incomplete',    label: 'Incomplets' },
  { key: 'draft',         label: 'Brouillons' },
  { key: 'validated',     label: 'Validés' },
]

function ReportsView() {
  const { user } = useAuth()
  const myId = user?.id ?? null
  const [reports, setReports] = useState<ScoutingReport[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('for_me')
  const [, setParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false
    scoutingApi.listReports()
      .then((res) => { if (!cancelled) setReports(res.data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  /** Match the backend's `for_me` filter: a report is "for me" if I am the recipient
   *  (submitted_to) OR the original scout. `submitted_to` may be an integer FK or
   *  the eager-loaded `{ id, name }` object — handle both. */
  const isForMe = (r: ScoutingReport): boolean => {
    if (!myId) return false
    const v = r.submitted_to
    const submittedToId = v == null
      ? null
      : typeof v === 'number'
        ? v
        : v.id
    return submittedToId === myId || r.scout?.id === myId
  }

  const visible = useMemo(() => {
    if (tab === 'all') return reports
    if (tab === 'incomplete') return reports.filter((r) => r.status === 'draft' || r.status === 'needs_changes')
    if (tab === 'for_me') return reports.filter(isForMe)
    return reports.filter((r) => r.status === tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, tab, myId])

  /** Count surfaced next to the "Pour moi" tab — pulls eyes on it. */
  const forMeCount = useMemo(() => reports.filter(isForMe).length, [reports, myId]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = (id: number) => {
    const sp = new URLSearchParams(window.location.search)
    sp.set('report', String(id))
    setParams(sp)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const active = tab === t.key
          const count = t.key === 'for_me' ? forMeCount : null
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                active
                  ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                  : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
              }`}
            >
              {t.label}
              {count != null && count > 0 && (
                <span className={`inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full text-[0.6rem] tabular-nums ${
                  active
                    ? 'bg-stone-50/15 text-stone-50 dark:bg-zinc-950/10 dark:text-zinc-950'
                    : 'bg-turf-50 text-turf-700 dark:bg-turf-900/40 dark:text-turf-200'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
        <span className="ml-auto text-xs font-mono tabular-nums text-zinc-500 dark:text-stone-400">
          {visible.length} / {reports.length} rapports
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-zinc-950 text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
            <tr>
              <th className="text-left px-4 py-3">Joueur</th>
              <th className="text-left px-4 py-3">Match</th>
              <th className="text-left px-4 py-3">Scout</th>
              <th className="text-right px-4 py-3">Note</th>
              <th className="text-left px-4 py-3">Recommandation</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Prochaine action</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-stone-200 dark:border-stone-50/8">
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-full" /></td>
                ))}
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-stone-400 text-sm">Aucun rapport dans cette catégorie.</td></tr>
            )}
            {!loading && visible.map((r) => (
              <tr
                key={r.id}
                onClick={() => open(r.id)}
                className="border-t border-stone-200 dark:border-stone-50/8 hover:bg-stone-50 dark:hover:bg-stone-50/5 cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={r.player?.photo_url || ''} alt="" className="w-8 h-8 rounded-full object-cover bg-stone-200 dark:bg-stone-800" />
                    <div>
                      <div className="font-medium text-zinc-950 dark:text-stone-50">{r.player?.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-stone-400">{r.player?.position}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-stone-300 text-xs">
                  {r.match ? `${r.match.home_team} – ${r.match.away_team}` : 'Hors match'}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-stone-300 text-xs">{r.scout?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-stone-50">{r.global_rating != null ? Number(r.global_rating).toFixed(1) : '—'}</td>
                <td className="px-4 py-3 text-xs text-zinc-700 dark:text-stone-300 capitalize">{r.recommendation?.replace(/_/g, ' ') ?? '—'}</td>
                <td className="px-4 py-3"><ReportStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-zinc-600 dark:text-stone-400 truncate max-w-[24ch]">{r.next_action ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ReportsView
