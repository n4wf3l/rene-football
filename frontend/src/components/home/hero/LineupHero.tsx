import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { playerImage } from '../../../lib/playerImage'
import type { Player } from '../../../types/player'
import { EASE_OUT, Headline, HeroCtas, HeroEyebrow, HeroParagraph, HeroStats, STUDIO_BG, type HeroData } from './HeroParts'

/** Rows from attack (top) to goal (bottom), as y % of the pitch. */
const ROWS: { category: string; y: number }[] = [
  { category: 'Attaquant', y: 17 },
  { category: 'Milieu', y: 41 },
  { category: 'Defenseur', y: 65 },
  { category: 'Gardien', y: 87 },
]
const MAX_PER_ROW = 5

const LINE = { stroke: 'rgba(255,255,255,0.55)', strokeWidth: 0.35, fill: 'none' } as const

interface Placed { player: Player; x: number; y: number; order: number }

function place(players: Player[]): Placed[] {
  const out: Placed[] = []
  let order = 0
  for (const row of ROWS) {
    const inRow = players.filter((p) => p.category === row.category).slice(0, MAX_PER_ROW * 2)
    // More than five on a line: two staggered lines.
    const lines = inRow.length > MAX_PER_ROW ? [inRow.slice(0, Math.ceil(inRow.length / 2)), inRow.slice(Math.ceil(inRow.length / 2))] : [inRow]
    lines.forEach((line, li) => {
      const y = row.y + (lines.length > 1 ? (li === 0 ? -5 : 5) : 0)
      line.forEach((player, i) => out.push({ player, x: ((i + 1) / (line.length + 1)) * 100, y, order: order++ }))
    })
  }
  return out
}

/**
 * "Composition": the represented players set out on a tactical pitch by
 * line (attack to goal). The pitch lines draw themselves, then the players
 * step in.
 */
export default function LineupHero({ players, stats }: HeroData) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const placed = place(players)
  const draw = (delay: number) => (reduce
    ? {}
    : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 1.2, ease: EASE_OUT, delay } })

  return (
    <section className="relative overflow-hidden bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-100"
        style={{ background: 'radial-gradient(ellipse 45% 60% at 76% 50%, rgba(30,64,175,0.34), transparent 70%)' }}
      />
      <div className="container-page relative grid min-h-[100dvh] items-center gap-12 pb-14 pt-28 lg:grid-cols-12 lg:gap-10 lg:pb-16 lg:pt-24">
        <div className="lg:col-span-6">
          <HeroEyebrow />
          <div className="mt-7"><Headline size="clamp(2.5rem, 5vw, 4.8rem)" /></div>
          <HeroParagraph className="mt-7" />
          <HeroCtas className="mt-9" />
          <HeroStats stats={stats} className="mt-12" />
        </div>

        <motion.div
          className="lg:col-span-6"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }}
        >
          <div className="mb-3 flex items-baseline justify-between font-mono text-[0.65rem] uppercase tracking-[0.22em] text-zinc-500 dark:text-stone-400">
            <span>{t('home.heroVariants.lineupCaption')}</span>
            <span className="tabular-nums">{String(placed.length).padStart(2, '0')}</span>
          </div>
          <div
            className="relative mx-auto aspect-[68/92] w-full max-w-[min(100%,calc(78dvh*68/92))] overflow-hidden rounded-[28px] border border-white/10 shadow-[0_40px_80px_-40px_rgba(15,31,69,0.6)]"
            style={{
              background:
                'repeating-linear-gradient(180deg, rgba(255,255,255,0.035) 0 9%, transparent 9% 18%),' +
                'linear-gradient(160deg, #13285a 0%, #0b1733 60%, #091127 100%)',
            }}
          >
            {/* Pitch lines */}
            <svg viewBox="0 0 68 92" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <motion.rect x="3" y="3" width="62" height="86" rx="0.5" {...LINE} {...draw(0.1)} />
              <motion.line x1="3" y1="46" x2="65" y2="46" {...LINE} {...draw(0.35)} />
              <motion.circle cx="34" cy="46" r="8" {...LINE} {...draw(0.45)} />
              <motion.rect x="15" y="3" width="38" height="14" {...LINE} {...draw(0.55)} />
              <motion.rect x="25" y="3" width="18" height="5" {...LINE} {...draw(0.65)} />
              <motion.rect x="15" y="75" width="38" height="14" {...LINE} {...draw(0.55)} />
              <motion.rect x="25" y="84" width="18" height="5" {...LINE} {...draw(0.65)} />
              <motion.path d="M 27 17 A 8 8 0 0 0 41 17" {...LINE} {...draw(0.75)} />
              <motion.path d="M 27 75 A 8 8 0 0 1 41 75" {...LINE} {...draw(0.75)} />
              <circle cx="34" cy="46" r="0.6" fill="rgba(255,255,255,0.6)" />
            </svg>

            {/* Line labels */}
            {ROWS.filter((r) => placed.some((p) => p.player.category === r.category)).map((r) => (
              <span
                key={r.category}
                className="absolute left-3 -translate-y-1/2 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/35 [writing-mode:vertical-rl] rotate-180 hidden sm:block"
                style={{ top: `${r.y}%` }}
              >
                {t(`players.filters.positions.${r.category}`, { defaultValue: r.category })}
              </span>
            ))}

            {/* Players */}
            {placed.map(({ player, x, y, order }) => (
              <motion.div
                key={player.slug}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
                initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.9 + order * 0.07 }}
              >
                <Link
                  to={`/joueurs/${player.slug}`}
                  className="group flex flex-col items-center gap-1.5 focus:outline-none"
                  aria-label={`${player.name} · ${player.position}`}
                >
                  <span
                    className="relative block h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/80 transition-transform duration-300 ease-premium group-hover:scale-110 group-focus-visible:ring-turf-300 sm:h-16 sm:w-16"
                    style={{ background: STUDIO_BG }}
                  >
                    <img src={playerImage(player)} alt="" loading="lazy" decoding="async" className="h-full w-full scale-[1.35] object-cover object-[50%_12%]" />
                  </span>
                  <span className="max-w-[7.5rem] truncate rounded-full bg-zinc-950/70 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-white backdrop-blur sm:text-[0.62rem]">
                    {player.name.trim().split(/\s+/).slice(-1)[0]}
                  </span>
                  <span className="pointer-events-none absolute top-full mt-1 hidden whitespace-nowrap rounded-md bg-white px-2 py-1 text-[0.65rem] font-medium text-zinc-950 shadow-lg group-hover:block">
                    {player.name} · {player.position}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
