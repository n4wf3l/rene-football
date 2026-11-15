import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MagnifyingGlass, UserPlus } from '@phosphor-icons/react'
import type { Player } from '../../types/player'
import { playerImage } from '../../lib/playerImage'
import Skeleton from '../Skeleton'

interface FichePlayerPickerProps {
  players: Player[]
  loaded: boolean
  onPick: (slug: string) => void
}

/** Where "Créer le joueur" goes: the player form, which comes back here. */
function createUrl(name: string): string {
  const q = new URLSearchParams({ retour: 'fiche' })
  if (name) q.set('nom', name)
  return `/admin/joueurs/nouveau?${q.toString()}`
}

/**
 * Shown in place of the PDF preview while no player is chosen: the fiche is
 * built from a player, so the choice happens on the page itself. If the
 * player is not in the roster yet, it can be created from here.
 */
export default function FichePlayerPicker({ players, loaded, onPick }: FichePlayerPickerProps) {
  const [query, setQuery] = useState('')
  const typed = query.trim()

  const filtered = useMemo(() => {
    const q = typed.toLowerCase()
    const list = [...players].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    if (!q) return list
    return list.filter((p) => `${p.name} ${p.position} ${p.club ?? ''}`.toLowerCase().includes(q))
  }, [players, typed])

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden shadow-2xl border border-stone-300/70 dark:border-stone-50/15 bg-white dark:bg-zinc-900 flex flex-col"
      style={{ aspectRatio: '210 / 297' }}
    >
      <div className="px-6 sm:px-10 pt-8 sm:pt-12 pb-5">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">
          Étape 1 · Joueur
        </span>
        <h2 className="mt-2 font-display font-semibold text-2xl sm:text-3xl tracking-tight text-zinc-950 dark:text-stone-50">
          Pour quel joueur ?
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-stone-400 max-w-[46ch]">
          La fiche se remplit avec sa photo, son profil et ses statistiques.
        </p>

        <label className="mt-6 flex items-center gap-2.5 rounded-xl border border-stone-300 dark:border-stone-50/15 bg-stone-50 dark:bg-zinc-950/60 px-3.5 py-2.5 focus-within:border-zinc-500 dark:focus-within:border-stone-50/40 transition">
          <MagnifyingGlass size={16} className="text-zinc-400 dark:text-stone-500 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered.length === 1) onPick(filtered[0].slug)
              }
            }}
            placeholder="Nom, poste ou club"
            aria-label="Rechercher un joueur"
            autoFocus
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-stone-100 placeholder:text-zinc-400 dark:placeholder:text-stone-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-7 border-t border-stone-200 dark:border-stone-50/10">
        {!loaded ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length > 0 ? (
          <ul className="divide-y divide-stone-200/80 dark:divide-stone-50/10">
            {filtered.map((p) => (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => onPick(p.slug)}
                  className="group w-full flex items-center gap-3.5 px-3 py-3 text-left rounded-lg hover:bg-stone-100 dark:hover:bg-stone-50/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-turf-500/60 transition"
                >
                  <img
                    src={playerImage(p)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-11 h-11 rounded-full object-cover object-top bg-stone-200 dark:bg-zinc-800 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-sm text-zinc-950 dark:text-stone-50 truncate">{p.name}</span>
                    <span className="block text-[0.65rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
                      {[p.position, p.club].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    weight="bold"
                    className="text-zinc-300 dark:text-stone-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-900 dark:group-hover:text-stone-100 shrink-0"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-3 py-10 text-center">
            <p className="text-sm text-zinc-600 dark:text-stone-300">
              {typed ? <>Aucun joueur ne correspond à « {typed} ».</> : 'Le roster est encore vide.'}
            </p>
            <Link to={createUrl(typed)} className="btn btn-primary text-sm mt-4 inline-flex items-center gap-2">
              <UserPlus size={16} weight="bold" />
              {typed ? `Créer « ${typed} »` : 'Créer le premier joueur'}
            </Link>
          </div>
        )}
      </div>

      <div className="px-6 sm:px-10 py-4 border-t border-stone-200 dark:border-stone-50/10 flex flex-wrap items-center justify-between gap-3 bg-stone-50 dark:bg-zinc-950/40">
        <span className="text-xs text-zinc-500 dark:text-stone-400">Le joueur n’est pas dans la liste ?</span>
        <Link
          to={createUrl(typed)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-turf-700 dark:text-turf-300 hover:underline"
        >
          <UserPlus size={15} weight="bold" />
          Créer le joueur
        </Link>
      </div>
    </div>
  )
}
