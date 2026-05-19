import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'
import { usePublicPlayers } from '../lib/usePublicPlayers'
import type { Player } from '../types/player'

/* Stable "note" pool used to dress each ticker entry. We rotate them by index
   so the ticker stays visually varied even though the underlying data comes
   straight from /api/players. */
const NOTE_POOL = [
  'transfert définitif',
  'prolongation contrat',
  'prêt avec option',
  'signature pro',
  'mandat agence',
  'observation scout',
]

interface MercatoItem {
  slug: string
  player: string
  move: string
  note: string
}

function buildItems(players: Player[]): MercatoItem[] {
  return players
    .filter((p) => p.club)
    .map((p, i) => ({
      slug: p.slug,
      player: p.name,
      move: p.club ?? '—',
      note: NOTE_POOL[i % NOTE_POOL.length],
    }))
}

interface RowProps {
  items: MercatoItem[]
  ariaHidden?: boolean
}

function Row({ items, ariaHidden = false }: RowProps) {
  return (
    <ul
      className="flex shrink-0 items-center gap-2 pr-2"
      aria-hidden={ariaHidden ? 'true' : undefined}
    >
      {items.map((it, i) => (
        <li key={`${it.slug}-${i}`} className="shrink-0">
          <Link
            to={`/joueurs/${it.slug}`}
            tabIndex={ariaHidden ? -1 : 0}
            className="group flex items-center gap-3 px-4 py-1 rounded-full text-sm text-stone-300 whitespace-nowrap transition-colors duration-200 ease-premium hover:bg-stone-50/[0.06] hover:text-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-turf-300/50"
          >
            <span className="font-mono uppercase tracking-wider text-[0.7rem] text-turf-300">
              Mercato
            </span>
            <span className="font-medium text-stone-100 group-hover:text-stone-50">
              {it.player}
            </span>
            <ArrowRight
              size={14}
              weight="bold"
              className="text-stone-500 group-hover:text-turf-300 group-hover:translate-x-0.5 transition-transform duration-200 ease-premium"
            />
            <span className="text-stone-200">{it.move}</span>
            <span className="text-stone-500">·</span>
            <span className="text-stone-400 group-hover:text-stone-300">{it.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function MercatoTickerBase() {
  const { players } = usePublicPlayers()
  const items = useMemo(() => buildItems(players), [players])
  // Don't render the band at all when we have nothing to show — avoids an
  // empty strip on first paint before the API resolves.
  if (items.length === 0) return null
  return (
    <div className="relative overflow-hidden border-y border-stone-50/10 bg-zinc-950/60 py-4 group/ticker">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-zinc-950 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-zinc-950 to-transparent"
        aria-hidden="true"
      />
      <motion.div
        className="flex"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 38, ease: 'linear', repeat: Infinity }}
        whileHover={{ animationPlayState: 'paused' }}
        style={{ willChange: 'transform' }}
      >
        <Row items={items} />
        <Row items={items} ariaHidden />
      </motion.div>
    </div>
  )
}

const MercatoTicker = memo(MercatoTickerBase)
export default MercatoTicker
