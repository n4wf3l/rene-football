import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Warning } from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { RecruitmentNeed } from '../../../types/scouting'
import { PRIORITY_LABEL } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import { PriorityBadge, ScoreBadge } from '../badges'

type NeedStats = { players_count: number; shortlist_a: number; best_score: number | null }

function NeedsView() {
  const [needs, setNeeds] = useState<RecruitmentNeed[]>([])
  const [stats, setStats] = useState<Record<number, NeedStats>>({})
  const [loading, setLoading] = useState(true)
  const [, setParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false
    scoutingApi.listNeeds()
      .then((res) => {
        if (cancelled) return
        setNeeds(res.data)
        setStats(res.stats || {})
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const open = (slug: string) => {
    const sp = new URLSearchParams(window.location.search)
    sp.set('need', slug)
    setParams(sp)
  }

  if (loading) return <Skeleton className="h-72 rounded-2xl" />
  if (needs.length === 0) return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 p-12 text-center">
      <p className="text-sm text-zinc-600 dark:text-stone-400">Aucun besoin de recrutement actif.</p>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 dark:bg-zinc-950 text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
          <tr>
            <th className="text-left px-4 py-3">Besoin</th>
            <th className="text-left px-4 py-3">Poste · Catégorie</th>
            <th className="text-left px-4 py-3">Budget</th>
            <th className="text-left px-4 py-3">Âge cible</th>
            <th className="text-right px-4 py-3">Profils</th>
            <th className="text-right px-4 py-3">Shortlist A</th>
            <th className="text-right px-4 py-3">Meilleur score</th>
            <th className="text-left px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {needs.map((n) => {
            const s = stats[n.id] ?? { players_count: 0, shortlist_a: 0, best_score: null }
            const lowCoverage = (s.players_count < 3) && n.status === 'actif'
            return (
              <tr
                key={n.id}
                onClick={() => open(n.slug)}
                className="border-t border-stone-200 dark:border-stone-50/8 hover:bg-stone-50 dark:hover:bg-stone-50/5 cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {lowCoverage && <Warning size={14} className="text-amber-600 dark:text-amber-400" />}
                    <div>
                      <div className="font-medium text-zinc-950 dark:text-stone-50">{n.title}</div>
                      <div className="text-[0.65rem] text-zinc-500 dark:text-stone-400">Saison {n.season ?? '-'}</div>
                    </div>
                    <span className="ml-2"><PriorityBadge priority={n.priority} /></span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-stone-300">{n.position} · {n.category}</td>
                <td className="px-4 py-3 text-xs text-zinc-700 dark:text-stone-300">{n.budget_min && n.budget_max ? `${(n.budget_min/1000).toFixed(0)}k - ${(n.budget_max/1000).toFixed(0)}k €` : '-'}</td>
                <td className="px-4 py-3 text-xs text-zinc-700 dark:text-stone-300">{n.age_min && n.age_max ? `${n.age_min} - ${n.age_max} ans` : '-'}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{s.players_count}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{s.shortlist_a}</td>
                <td className="px-4 py-3 text-right"><ScoreBadge score={s.best_score} /></td>
                <td className="px-4 py-3 text-xs text-zinc-700 dark:text-stone-300 capitalize">{n.status.replace('_', ' ')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default NeedsView
