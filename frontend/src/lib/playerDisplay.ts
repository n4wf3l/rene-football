import type { Player } from '../types/player'

/**
 * Display rules shared by every public view of a player, so a profile never
 * looks careless or out of date.
 */

/** A match count older than this is hidden rather than shown stale. */
export const STATS_FRESH_DAYS = 31

/**
 * True when the match count is worth showing: at least one match AND stats
 * updated within the last month. A zero usually means "never updated", and
 * an old number discredits an otherwise good profile — both are hidden.
 * Players whose stats were never dated (no `stats_updated_at`) are treated
 * as not fresh.
 */
export function hasFreshMatchCount(
  player: Pick<Player, 'matches_played' | 'stats_updated_at'>,
  now: number = Date.now(),
): boolean {
  if (!player.matches_played || player.matches_played <= 0 || !player.stats_updated_at) return false
  const updated = new Date(player.stats_updated_at).getTime()
  if (Number.isNaN(updated)) return false
  return now - updated <= STATS_FRESH_DAYS * 24 * 60 * 60 * 1000
}

const normalise = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

/**
 * Non-empty labels with duplicates removed, ignoring case and accents
 * ("Attaquant" / "attaquant", "Defenseur" / "Défenseur"). First wins.
 */
export function uniqueLabels(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    if (!v || !v.trim()) continue
    const key = normalise(v)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v.trim())
  }
  return out
}

/** True when two labels say the same thing (case / accent insensitive). */
export function sameLabel(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && normalise(a) === normalise(b)
}
