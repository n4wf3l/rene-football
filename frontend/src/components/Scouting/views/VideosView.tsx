import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { ScoutingPlayer } from '../../../types/scouting'
import Skeleton from '../../Skeleton'

/**
 * V1: liste les joueurs avec leurs clips. Pour gérer/annoter, on renvoie vers
 * la page `/admin/joueurs/:slug/edit` qui contient déjà ClipsGalleryAdmin.
 * V2 fera un agrégateur dédié.
 */
function VideosView() {
  const [players, setPlayers] = useState<ScoutingPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [, setParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false
    scoutingApi.listPlayers()
      .then((res) => { if (!cancelled) setPlayers(res.data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const openPlayer = (slug: string) => {
    const sp = new URLSearchParams(window.location.search)
    sp.set('player', slug)
    setParams(sp)
  }

  if (loading) return <Skeleton className="h-72 rounded-2xl" />

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-400/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
        Module vidéos - version légère. La création / annotation de clips se fait depuis
        <a href="/admin/joueurs" className="underline ml-1">/admin/joueurs → édition d'un joueur</a>.
        Vue agrégée prévue en V2.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => openPlayer(p.slug)}
            className="text-left rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 p-4 hover:border-turf-400 dark:hover:border-turf-300/30 transition"
          >
            <div className="flex items-center gap-3">
              <img src={p.photo_url || ''} alt="" className="w-10 h-10 rounded-full object-cover bg-stone-200 dark:bg-stone-800" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-950 dark:text-stone-50 truncate">{p.name}</div>
                <div className="text-xs text-zinc-500 dark:text-stone-400 truncate">{p.position}</div>
              </div>
              <span className="text-xs font-mono text-zinc-400 dark:text-stone-500">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default VideosView
