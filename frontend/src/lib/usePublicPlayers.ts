import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Player } from '../types/player'

interface PlayersResponse { data: Player[] }

/**
 * Module-level cache so all the homepage widgets (HomePage roster, Header mega
 * menu, MercatoTicker) share a single GET /api/players call. The cache is
 * volatile : it lives only for the page session, which is what we want - the
 * Vite dev server + browser HTTP cache handle the rest.
 */
let cache: Player[] | null = null
let inflight: Promise<Player[]> | null = null

function fetchOnce(): Promise<Player[]> {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = api.get<PlayersResponse>('/players')
    .then((res) => {
      cache = res.data ?? []
      return cache
    })
    .catch(() => {
      cache = []
      return cache
    })
    .finally(() => { inflight = null })
  return inflight
}

/** Returns the public (`is_published = true`) roster, sorted by name on the backend. */
export function usePublicPlayers(): { players: Player[]; loading: boolean } {
  const [players, setPlayers] = useState<Player[]>(cache ?? [])
  const [loading, setLoading] = useState(cache == null)

  useEffect(() => {
    let cancelled = false
    fetchOnce().then((list) => {
      if (cancelled) return
      setPlayers(list)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return { players, loading }
}

/** Pick N "showcase" players for marketing widgets : top by minutes_played (active
 *  starters first), tied-break by goals + assists. Stable across renders given a
 *  stable input array. */
export function pickShowcase(players: Player[], n: number): Player[] {
  return [...players]
    .sort((a, b) => {
      const m = (b.minutes_played ?? 0) - (a.minutes_played ?? 0)
      if (m !== 0) return m
      return ((b.goals ?? 0) + (b.assists ?? 0)) - ((a.goals ?? 0) + (a.assists ?? 0))
    })
    .slice(0, n)
}
