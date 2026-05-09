import { memo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'

/* Each item links to the player's profile when their slug exists in the roster.
   Slugs match the backend seeder (no accents). Display labels keep accents. */
const ITEMS = [
  { slug: 'karim-toure',     player: 'Karim Touré',     move: 'Borussia Dortmund', note: 'transfert définitif' },
  { slug: 'yanis-lefevre',   player: 'Yanis Lefèvre',   move: 'KRC Genk',          note: 'signature pro' },
  { slug: 'adil-berkane',    player: 'Adil Berkane',    move: 'Standard Liège',    note: 'prolongation 2 ans' },
  { slug: 'mehdi-boukar',    player: 'Mehdi Boukar',    move: 'FC Metz',           note: 'prêt 1 an' },
  { slug: 'theo-vasseur',    player: 'Théo Vasseur',    move: 'OGC Nice',          note: 'prolongation 3 ans' },
  { slug: 'ousmane-camara',  player: 'Ousmane Camara',  move: 'Royal Antwerp',     note: 'prêt avec option' },
  { slug: 'lucas-marini',    player: 'Lucas Marini',    move: 'AS Monaco',         note: 'prolongation 2 ans' },
  { slug: 'idriss-ndiaye',   player: 'Idriss N’Diaye',  move: 'FC Twente',         note: 'transfert définitif' },
]

interface MercatoItem {
  slug: string
  player: string
  move: string
  note: string
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
        <Row items={ITEMS} />
        <Row items={ITEMS} ariaHidden />
      </motion.div>
    </div>
  )
}

const MercatoTicker = memo(MercatoTickerBase)
export default MercatoTicker
