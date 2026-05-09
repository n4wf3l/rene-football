import { useMemo, useState } from 'react'
import { CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react'
import type { Player } from '../types/player'

export interface PlayerSingleSelectProps {
  players: Player[]
  selectedSlug: string | null
  onChange: (slug: string | null) => void
  placeholder?: string
}

/**
 * Lightweight combobox-style picker. Click to open a panel with a search box
 * and the full roster as photo+name+position rows. One slug at a time.
 */
export default function PlayerSingleSelect({
  players,
  selectedSlug,
  onChange,
  placeholder = 'Choisir un joueur…',
}: PlayerSingleSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = selectedSlug ? players.find((p) => p.slug === selectedSlug) : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return players
    return players.filter((p) =>
      `${p.name} ${p.position} ${p.club ?? ''}`.toLowerCase().includes(q),
    )
  }, [query, players])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between gap-3 rounded-xl border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-stone-100 hover:border-zinc-500 dark:hover:border-stone-50/30 transition"
      >
        <span className="flex items-center gap-2.5 min-w-0 flex-1">
          {selected ? (
            <>
              <img
                src={selected.photo_url || `https://picsum.photos/seed/${selected.slug}/56`}
                alt=""
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-medium truncate">{selected.name}</span>
                <span className="block text-[0.65rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
                  {selected.position} · {selected.club ?? '—'}
                </span>
              </span>
            </>
          ) : (
            <span className="text-zinc-500 dark:text-stone-500">{placeholder}</span>
          )}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {selected && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null) }}
              aria-label="Effacer la sélection"
              className="text-zinc-400 hover:text-rose-700 dark:hover:text-rose-400 transition"
            >
              <X size={12} weight="bold" />
            </button>
          )}
          <CaretDown size={12} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 shadow-diffusion overflow-hidden max-h-[420px] flex flex-col">
            <div className="relative p-3 border-b border-stone-200 dark:border-stone-50/10">
              <MagnifyingGlass
                size={13}
                weight="regular"
                className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer par nom, club ou poste"
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 bg-white text-sm dark:bg-zinc-950 dark:border-stone-50/10 dark:text-stone-50 focus:outline-none focus:border-zinc-900 dark:focus:border-stone-50/30"
              />
            </div>
            <ul className="overflow-y-auto flex-1 py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-xs text-zinc-500 dark:text-stone-500">
                  Aucun joueur ne correspond.
                </li>
              ) : (
                filtered.map((p) => {
                  const isActive = p.slug === selectedSlug
                  return (
                    <li key={p.slug}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(p.slug)
                          setOpen(false)
                          setQuery('')
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition ${
                          isActive
                            ? 'bg-stone-100 dark:bg-stone-50/8'
                            : 'hover:bg-stone-100/60 dark:hover:bg-stone-50/5'
                        }`}
                      >
                        <img
                          src={p.photo_url || `https://picsum.photos/seed/${p.slug}/56`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-zinc-950 dark:text-stone-50 truncate">
                            {p.name}
                          </span>
                          <span className="block text-[0.65rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
                            {p.position} · {p.club ?? '—'}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
