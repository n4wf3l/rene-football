import { useEffect, useState } from 'react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { FootballMatch } from '../../../types/scouting'
import Skeleton from '../../Skeleton'

function MatchesView() {
  const [matches, setMatches] = useState<FootballMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    scoutingApi.listMatches()
      .then((res) => { if (!cancelled) setMatches(res.data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <Skeleton className="h-72 rounded-2xl" />
  if (matches.length === 0) return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 p-12 text-center">
      <p className="text-sm text-zinc-600 dark:text-stone-400">Aucun match enregistré.</p>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 dark:bg-zinc-950 text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
          <tr>
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-left px-4 py-3">Match</th>
            <th className="text-left px-4 py-3">Compétition</th>
            <th className="text-left px-4 py-3">Catégorie</th>
            <th className="text-right px-4 py-3">Score</th>
            <th className="text-left px-4 py-3">Statut</th>
            <th className="text-left px-4 py-3">Lieu</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id} className="border-t border-stone-200 dark:border-stone-50/8">
              <td className="px-4 py-3 text-xs font-mono tabular-nums text-zinc-700 dark:text-stone-300">{new Date(m.kickoff_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
              <td className="px-4 py-3 font-medium text-zinc-950 dark:text-stone-50">{m.home_team} <span className="text-zinc-400 dark:text-stone-500">–</span> {m.away_team}</td>
              <td className="px-4 py-3 text-xs text-zinc-700 dark:text-stone-300">{m.competition}</td>
              <td className="px-4 py-3 text-xs text-zinc-700 dark:text-stone-300">{m.category}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-stone-50">
                {m.score_home != null && m.score_away != null ? `${m.score_home} – ${m.score_away}` : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-zinc-700 dark:text-stone-300 capitalize">{m.status}</td>
              <td className="px-4 py-3 text-xs text-zinc-500 dark:text-stone-400 truncate max-w-[24ch]">{m.venue ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MatchesView
