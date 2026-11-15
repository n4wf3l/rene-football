import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Player } from '../types/player'

interface PlayersResponse { data: Player[] }

/**
 * Shared public roster for every widget (HomePage, Header mega menu,
 * MercatoTicker…), fetched once per page session.
 *
 * Stale-while-revalidate across visits: the last list received is kept in
 * localStorage (STORAGE_KEY, read by index.html before the app boots). A
 * returning visitor sees the players at once from that copy, then the
 * fresh list from the server replaces it as soon as it arrives. The copy
 * only holds public data and is ignored after 7 days.
 */
const STORAGE_KEY = 'rf_players_cache'

/** List answered by the server during this page session. */
let fresh: Player[] | null = null
let inflight: Promise<Player[]> | null = null
const listeners = new Set<(list: Player[]) => void>()

declare global {
  interface Window {
    /** Started by index.html before the app boots (null on failure). */
    __rfPlayers?: Promise<PlayersResponse | null>
    /** Set by index.html once that request has answered. */
    __rfPlayersData?: Player[]
    /** Copy kept from a previous visit, read by index.html. */
    __rfPlayersCached?: Player[]
  }
}

function persist(list: Player[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), data: list })) }
  catch { /* storage full or disabled: the cache is only a speed-up */ }
}

function adoptFresh(list: Player[]): Player[] {
  fresh = list
  persist(list)
  listeners.forEach((fn) => fn(list))
  return list
}

/**
 * The roster when it is already known: fresh from this session (possibly
 * delivered to index.html before the app booted), otherwise the copy kept
 * from a previous visit. Lets the very first render show the players.
 */
function known(): Player[] | null {
  if (typeof window === 'undefined') return fresh
  if (!fresh && window.__rfPlayersData) {
    // Called during render: adopt without notifying the other widgets,
    // they pick it up from revalidate() in their effect.
    window.__rfPlayers = undefined
    fresh = window.__rfPlayersData
    persist(fresh)
  }
  return fresh ?? window.__rfPlayersCached ?? null
}

/** Uses the request index.html already started, once; otherwise fetches. */
function request(): Promise<PlayersResponse> {
  const early = typeof window !== 'undefined' ? window.__rfPlayers : undefined
  if (early) {
    window.__rfPlayers = undefined
    return early.then((res) => res ?? api.get<PlayersResponse>('/players'))
  }
  return api.get<PlayersResponse>('/players')
}

/** Resolves with the server's list, fetching it at most once per session. */
function revalidate(): Promise<Player[]> {
  known()
  if (fresh) return Promise.resolve(fresh)
  if (inflight) return inflight
  inflight = request()
    .then((res) => adoptFresh(res.data ?? []))
    // Offline or server error: keep the stored copy if there is one.
    .catch(() => known() ?? [])
    .finally(() => { inflight = null })
  return inflight
}

/** Returns the public (`is_published = true`) roster, sorted by name on the backend. */
export function usePublicPlayers(): { players: Player[]; loading: boolean } {
  const [players, setPlayers] = useState<Player[]>(() => known() ?? [])
  const [loading, setLoading] = useState(() => known() == null)

  useEffect(() => {
    let cancelled = false
    const update = (list: Player[]) => { if (!cancelled) setPlayers(list) }
    listeners.add(update)
    revalidate().then((list) => {
      if (cancelled) return
      setPlayers(list)
      setLoading(false)
    })
    return () => {
      cancelled = true
      listeners.delete(update)
    }
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
