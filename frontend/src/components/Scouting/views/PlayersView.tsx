import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { ScoutingPlayer, ScoutingStatus } from '../../../types/scouting'
import { STATUS_LABEL } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import { CompletenessBar, NextActionBadge, ScoreBadge, StatusBadge } from '../badges'

const STATUSES: Array<ScoutingStatus | 'Tous'> = ['Tous', 'shortlist_a', 'shortlist_b', 'watchlist', 'valide', 'decouvert', 'rejete', 'archive']

function PlayersView() {
  const [players, setPlayers] = useState<ScoutingPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ScoutingStatus | 'Tous'>('Tous')
  const [, setParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false
    scoutingApi.listPlayers()
      .then((res) => { if (!cancelled) setPlayers(res.data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return players.filter((p) => {
      if (status !== 'Tous' && p.scouting_status !== status) return false
      if (q && !`${p.name} ${p.club ?? ''} ${p.position ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [players, query, status])

  const open = (slug: string) => {
    const sp = new URLSearchParams(window.location.search)
    sp.set('player', slug)
    setParams(sp)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <MagnifyingGlass size={14} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un joueur, un club, un poste…"
            className="pl-9 pr-3 py-2 rounded-full border border-stone-300 bg-white text-sm w-72 focus:outline-none focus:border-zinc-900 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = status === s
            const label = s === 'Tous' ? 'Tous' : STATUS_LABEL[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  active
                    ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                    : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <span className="ml-auto text-xs font-mono tabular-nums text-zinc-500 dark:text-stone-400">
          {filtered.length} / {players.length} joueurs
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-zinc-950 text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
            <tr>
              <th className="text-left px-4 py-3">Joueur</th>
              <th className="text-left px-4 py-3">Poste · Club</th>
              <th className="text-right px-4 py-3">Score global</th>
              <th className="text-right px-4 py-3">Confiance</th>
              <th className="text-left px-4 py-3">Complétude</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Prochaine action</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-t border-stone-200 dark:border-stone-50/10">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="w-9 h-9" rounded="full" /><Skeleton className="h-3 w-32" /></div></td>
                <td className="px-4 py-3"><Skeleton className="h-3 w-40" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-10 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-10 ml-auto" /></td>
                <td className="px-4 py-3"><Skeleton className="h-2 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-3 w-32" /></td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-stone-400 text-sm">Aucun joueur ne correspond à ces critères.</td></tr>
            )}
            {!loading && filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => open(p.slug)}
                className="border-t border-stone-200 dark:border-stone-50/10 hover:bg-stone-50 dark:hover:bg-stone-50/5 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.photo_url || ''} alt="" className="w-9 h-9 rounded-full object-cover bg-stone-200 dark:bg-stone-800" />
                    <div>
                      <div className="font-medium text-zinc-950 dark:text-stone-50">{p.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-stone-400">{p.age ?? '-'} ans</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-stone-300">
                  <div>{p.position}</div>
                  <div className="text-xs text-zinc-500 dark:text-stone-400">{p.club ?? '-'}</div>
                </td>
                <td className="px-4 py-3 text-right"><ScoreBadge score={p.score_global} /></td>
                <td className="px-4 py-3 text-right"><ScoreBadge score={p.score_confidence} /></td>
                <td className="px-4 py-3"><CompletenessBar percent={p.completeness_pct} /></td>
                <td className="px-4 py-3"><StatusBadge status={p.scouting_status} /></td>
                <td className="px-4 py-3"><NextActionBadge action={p.next_action} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PlayersView
