import { useMemo, useState } from 'react'
import { Check, MagnifyingGlass, X } from '@phosphor-icons/react'
import type { Player } from '../types/player'
import { RADAR_PLAYER_COLORS } from './PlayerRadar'
import { playerImage } from '../lib/playerImage'

export interface PlayerMultiSelectProps {
  players: Player[]
  selectedSlugs: string[]
  onChange: (slugs: string[]) => void
  /** Maximum simultaneous selection (default 4). */
  max?: number
}

/**
 * Toggleable chip grid + live filter. Selected players keep a stable order
 * (first selected = index 0 = turf, second = rose, etc.) so the colors stay
 * locked in the radar and table.
 */
export default function PlayerMultiSelect({
  players,
  selectedSlugs,
  onChange,
  max = 4,
}: PlayerMultiSelectProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return players
    return players.filter((p) =>
      `${p.name} ${p.position} ${p.club ?? ''}`.toLowerCase().includes(q),
    )
  }, [query, players])

  const toggle = (slug: string) => {
    if (selectedSlugs.includes(slug)) {
      onChange(selectedSlugs.filter((s) => s !== slug))
    } else if (selectedSlugs.length < max) {
      onChange([...selectedSlugs, slug])
    }
  }

  const indexOf = (slug: string) => selectedSlugs.indexOf(slug)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass
            size={14}
            weight="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer par nom, club ou poste"
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-stone-300 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:border-stone-50/10 dark:text-stone-50 dark:placeholder:text-stone-500 focus:outline-none focus:border-zinc-900 dark:focus:border-stone-50/30 transition"
          />
          {query && (
            <button
              type="button"
              aria-label="Effacer le filtre"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-stone-200"
            >
              <X size={12} weight="bold" />
            </button>
          )}
        </div>
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 whitespace-nowrap">
          <span className="text-zinc-900 dark:text-stone-100 tabular-nums">{selectedSlugs.length}</span>
          <span className="mx-1.5">/</span>
          <span className="tabular-nums">{max}</span>
          <span className="ml-1.5">sélectionnés</span>
        </span>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {filtered.map((p) => {
          const idx = indexOf(p.slug)
          const isSelected = idx >= 0
          const isDisabled = !isSelected && selectedSlugs.length >= max
          return (
            <li key={p.slug}>
              <button
                type="button"
                onClick={() => toggle(p.slug)}
                disabled={isDisabled}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-zinc-950 text-stone-50 border-zinc-950 dark:bg-stone-50 dark:text-zinc-950 dark:border-stone-50'
                    : isDisabled
                    ? 'opacity-40 cursor-not-allowed border-stone-200 dark:border-stone-50/10'
                    : 'bg-white text-zinc-900 border-stone-200 hover:border-zinc-500 dark:bg-zinc-900 dark:text-stone-100 dark:border-stone-50/10 dark:hover:border-stone-50/30'
                }`}
              >
                <div className="relative shrink-0 w-7 h-7 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-50/10">
                  <img
                    src={playerImage(p)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {isSelected && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 grid place-items-center w-4 h-4 rounded-full text-stone-50 ${RADAR_PLAYER_COLORS[idx].legend}`}
                      aria-hidden="true"
                    >
                      <Check size={9} weight="bold" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <div className={`text-[0.65rem] font-mono uppercase tracking-wider truncate ${
                    isSelected ? 'text-stone-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-stone-500'
                  }`}>
                    {p.position}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 && (
        <div className="text-xs text-center py-6 text-zinc-500 dark:text-stone-500">
          Aucun joueur ne correspond.
        </div>
      )}
    </div>
  )
}
