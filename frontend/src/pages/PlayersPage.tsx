import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  MagnifyingGlass,
  X as XIcon,
} from '@phosphor-icons/react'
import { api } from '../api/client'
import MeshGradient from '../components/MeshGradient'
import AnimatedNumber from '../components/AnimatedNumber'
import Skeleton from '../components/Skeleton'
import { playerImage } from '../lib/playerImage'
import type { Player, PositionFilter, AgeFilter } from '../types/player'

const POSITION_FILTERS: PositionFilter[] = ['Tous', 'Gardien', 'Defenseur', 'Milieu', 'Attaquant']
const AGE_FILTERS: { key: AgeFilter; label: string }[] = [
  { key: 'Tous',    label: 'Tous âges' },
  { key: 'U21',     label: 'Moins de 21' },
  { key: '21-26',   label: '21-26 ans' },
  { key: '27+',     label: '27 ans et plus' },
]

function matchesAge(player: Player, key: AgeFilter): boolean {
  if (key === 'Tous') return true
  if (key === 'U21')   return player.age < 21
  if (key === '21-26') return player.age >= 21 && player.age <= 26
  if (key === '27+')   return player.age >= 27
  return true
}

/* Variants used by each card. The parent <motion.ul> drives the stagger
   (see GRID_VARIANTS below) - cards don't define their own initial/animate
   so the cascade order is consistent. */
const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  show:   {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 24, mass: 0.6 },
  },
  exit:   { opacity: 0, scale: 0.96, transition: { duration: 0.18 } },
}

/* Parent orchestrator : cards appear one after the other with a 70ms gap,
   after a tiny initial delay so the page chrome settles first. */
const GRID_VARIANTS = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.08,
    },
  },
}

interface PlayerCardProps {
  player: Player
}

function PlayerCard({ player }: PlayerCardProps) {
  const isKeeper = player.category === 'Gardien'
  return (
    <motion.li
      layout
      layoutId={`player-${player.slug}`}
      variants={CARD_VARIANTS}
      exit="exit"
      className="group relative overflow-hidden rounded-3xl bg-white border border-stone-200/80 hover:border-zinc-300 shadow-diffusion transition-colors duration-300 ease-premium dark:bg-zinc-900 dark:border-stone-50/10 dark:hover:border-stone-50/20"
    >
      <Link to={`/joueurs/${player.slug}`} className="absolute inset-0 z-10" aria-label={`Voir ${player.name}`} />

      <div className="relative aspect-[3/4] overflow-hidden bg-stone-200">
        <img
          src={playerImage(player)}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-zinc-950/80 via-zinc-950/30 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-stone-50/95 bg-zinc-950/45 backdrop-blur px-2 py-1 rounded-full border border-stone-50/15">
            {player.age} ans
          </span>
          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-turf-200 bg-turf-800/40 backdrop-blur px-2 py-1 rounded-full border border-turf-300/30">
            {player.category}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-stone-50">
          <div className="font-display font-semibold text-xl leading-tight">
            {player.name}
          </div>
          <div className="text-xs text-stone-300 mt-0.5">{player.position}</div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-700 dark:text-stone-300">{player.club}</span>
          <span className="font-mono text-[0.7rem] text-zinc-500 dark:text-stone-500">
            depuis {player.since}
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-3 border-t border-stone-200 dark:border-stone-50/10 pt-4">
          <div>
            <dt className="font-mono uppercase tracking-wider text-[0.6rem] text-zinc-500 dark:text-stone-400">Matchs</dt>
            <dd className="font-mono text-lg text-zinc-950 dark:text-stone-50 tabular-nums mt-0.5">{player.matches_played}</dd>
          </div>
          <div>
            <dt className="font-mono uppercase tracking-wider text-[0.6rem] text-zinc-500 dark:text-stone-400">
              {isKeeper ? 'Clean sh.' : 'Buts'}
            </dt>
            <dd className="font-mono text-lg text-zinc-950 dark:text-stone-50 tabular-nums mt-0.5">
              {isKeeper ? player.clean_sheets : player.goals}
            </dd>
          </div>
          <div>
            <dt className="font-mono uppercase tracking-wider text-[0.6rem] text-zinc-500 dark:text-stone-400">
              {isKeeper ? 'Arrêts' : 'P. déc.'}
            </dt>
            <dd className="font-mono text-lg text-zinc-950 dark:text-stone-50 tabular-nums mt-0.5">
              {isKeeper ? player.saves : player.assists}
            </dd>
          </div>
        </dl>
      </div>
      <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-premium pointer-events-none">
        <span className="grid place-items-center w-9 h-9 rounded-full bg-stone-50/95 text-zinc-950 backdrop-blur shadow-diffusion">
          <ArrowUpRight size={16} weight="bold" />
        </span>
      </div>
    </motion.li>
  )
}

interface EmptyStateProps {
  onReset: () => void
}

function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full mx-auto max-w-md text-center py-20"
    >
      <div className="grid place-items-center w-14 h-14 mx-auto rounded-2xl bg-stone-100 border border-stone-200 text-zinc-400 dark:bg-stone-50/5 dark:border-stone-50/10 dark:text-stone-500">
        <MagnifyingGlass size={22} weight="regular" />
      </div>
      <h3 className="mt-5 font-display font-semibold text-xl text-zinc-950 dark:text-stone-50">
        Aucun joueur ne correspond.
      </h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
        Essayez d'élargir vos critères ou réinitialisez les filtres.
      </p>
      <button type="button" onClick={onReset} className="btn btn-outline mt-6 text-sm">
        Réinitialiser les filtres
      </button>
    </motion.div>
  )
}

interface PlayersResponse {
  data: Player[]
}

function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState<PositionFilter>('Tous')
  const [age, setAge] = useState<AgeFilter>('Tous')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    api.get<PlayersResponse>('/players')
      .then((res) => { if (!cancelled) setPlayers(res.data) })
      .catch(() => { if (!cancelled) setPlayers([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return players.filter((p) => {
      if (position !== 'Tous' && p.category !== position) return false
      if (!matchesAge(p, age)) return false
      if (q && !`${p.name} ${p.club || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [players, position, age, query])

  const reset = () => { setPosition('Tous'); setAge('Tous'); setQuery('') }
  const clubsCount = useMemo(() => new Set(players.map((p) => p.club).filter(Boolean)).size, [players])

  return (
    <>
      <section className="text-stone-100 pt-16 pb-12 lg:pt-24 lg:pb-16 relative overflow-hidden">
        <MeshGradient intensity="subtle" />
        <div className="container-page grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <span className="eyebrow text-turf-300">Notre roster</span>
            <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest leading-[1.05] text-stone-50 max-w-[20ch]">
              Les joueurs que nous accompagnons cette saison.
            </h1>
            <p className="mt-6 max-w-[58ch] text-base lg:text-lg text-stone-400 leading-relaxed">
              Une sélection volontairement resserrée. Pour chaque joueur,
              une équipe dédiée - agent, conseiller juridique, préparateur
              mental - qui le suit toute la saison.
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <div className="flex gap-8 lg:gap-10 border-t lg:border-t-0 border-stone-50/10 pt-6 lg:pt-0">
              <div>
                <div className="font-mono text-3xl text-stone-50 tabular-nums">
                  <AnimatedNumber value={players.length} duration={1.2} />
                </div>
                <div className="text-xs text-stone-400 mt-1">Joueurs actifs</div>
              </div>
              <div>
                <div className="font-mono text-3xl text-stone-50 tabular-nums">
                  <AnimatedNumber value={clubsCount} duration={1.2} />
                </div>
                <div className="text-xs text-stone-400 mt-1">Clubs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky nav-sticky z-30 bg-stone-50/90 dark:bg-zinc-950/85 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-50/10">
        <div className="container-page py-4 lg:py-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          <div className="flex flex-wrap items-center gap-2">
            {POSITION_FILTERS.map((p) => {
              const active = position === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosition(p)}
                  className={`relative px-4 py-1.5 rounded-full text-sm transition-colors duration-200 ease-premium ${
                    active
                      ? 'text-stone-50 dark:text-zinc-950'
                      : 'text-zinc-700 hover:text-zinc-950 dark:text-stone-300 dark:hover:text-stone-50'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="position-pill"
                      className="absolute inset-0 rounded-full bg-zinc-950 dark:bg-stone-50"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{p}</span>
                </button>
              )
            })}
          </div>

          <div className="hidden lg:block w-px h-6 bg-stone-300 dark:bg-stone-50/15" />

          <div className="flex flex-wrap items-center gap-2">
            {AGE_FILTERS.map(({ key, label }) => {
              const active = age === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAge(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ease-premium ${
                    active
                      ? 'bg-turf-800 border-turf-800 text-stone-50'
                      : 'bg-transparent border-stone-300 text-zinc-700 hover:border-zinc-500 hover:text-zinc-950 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40 dark:hover:text-stone-50'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="lg:ml-auto relative">
            <MagnifyingGlass
              size={16}
              weight="regular"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un joueur ou un club"
              className="w-full lg:w-72 pl-10 pr-9 py-2 rounded-full border border-stone-300 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300"
            />
            {query && (
              <button
                type="button"
                aria-label="Effacer"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <XIcon size={14} weight="bold" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-stone-50 dark:bg-zinc-950 pt-10 pb-24 lg:pb-32">
        <div className="container-page">
          <div className="flex items-center justify-between mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400">
              <span className="text-zinc-900 dark:text-stone-50 tabular-nums">{filtered.length}</span>
              <span className="mx-2">/</span>
              <span className="tabular-nums">{players.length}</span>
              <span className="ml-2">joueurs affichés</span>
            </p>
          </div>

          {loading ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <li
                  key={i}
                  className="rounded-3xl bg-white border border-stone-200/80 dark:bg-zinc-900 dark:border-stone-50/10 overflow-hidden"
                >
                  <Skeleton className="aspect-[3/4] w-full" rounded="sm" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="grid grid-cols-3 gap-3 border-t border-stone-200 dark:border-stone-50/10 pt-4">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <motion.ul
              layout
              initial="hidden"
              animate="show"
              variants={GRID_VARIANTS}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <EmptyState onReset={reset} />
                ) : (
                  filtered.map((p) => <PlayerCard key={p.slug} player={p} />)
                )}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </section>
    </>
  )
}

export default PlayersPage
