import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { playerImage } from '../../../lib/playerImage'
import { EASE_OUT, Headline, HeroCtas, HeroEyebrow, HeroParagraph, HeroStats, STUDIO_BG, pad2, type HeroData } from './HeroParts'

const MAX_TILES = 8
const SPOT_MS = 2400
/** Desktop column offsets: the wall reads as hung by hand, not a spreadsheet. */
const OFFSETS = ['0rem', '3rem', '1rem', '4rem']

/**
 * "Mosaïque": every portrait on a studio-backdrop wall, a spotlight moving
 * from player to player. The agency's dressing room.
 */
export default function MosaicHero({ spotlight, stats }: HeroData) {
  const reduce = useReducedMotion()
  const tiles = spotlight.slice(0, MAX_TILES)
  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    if (reduce || tiles.length < 2 || hovered !== null) return
    const id = setInterval(() => setActive((a) => (a + 1) % tiles.length), SPOT_MS)
    return () => clearInterval(id)
  }, [reduce, tiles.length, hovered])

  const lit = hovered ?? active

  return (
    <section className="relative overflow-hidden bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-100"
        style={{ background: 'radial-gradient(ellipse 50% 60% at 75% 45%, rgba(30,64,175,0.30), transparent 70%)' }}
      />
      <div className="container-page relative grid min-h-[100dvh] items-center gap-12 pb-14 pt-28 lg:grid-cols-12 lg:gap-10 lg:pb-16 lg:pt-24">
        <div className="lg:col-span-5">
          <HeroEyebrow />
          <div className="mt-7"><Headline size="clamp(2.5rem, 4.6vw, 4.5rem)" /></div>
          <HeroParagraph className="mt-7" />
          <HeroCtas className="mt-9" />
          <HeroStats stats={stats} className="mt-12" />
        </div>

        <div className="lg:col-span-7">
          <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:pb-16">
            {tiles.map((p, i) => {
              const isLit = lit === i
              return (
                <motion.div
                  key={p.slug}
                  className={i >= 6 ? 'hidden sm:block' : ''}
                  style={{ '--o': OFFSETS[i % 4] } as CSSProperties}
                  initial={reduce ? false : { opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.25 + i * 0.07 }}
                >
                  <Link
                    to={`/joueurs/${p.slug}`}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    aria-label={p.name}
                    className="group relative block aspect-[3/4] overflow-hidden lg:mt-[var(--o)] focus:outline-none focus-visible:ring-2 focus-visible:ring-turf-500"
                    style={{ background: STUDIO_BG }}
                  >
                    <img
                      src={playerImage(p)}
                      alt=""
                      loading={i < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover object-[50%_15%] transition-transform duration-700 ease-premium group-hover:scale-[1.05]"
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 bg-stone-50 transition-opacity duration-700 dark:bg-zinc-950 ${isLit ? 'opacity-0' : 'opacity-50'}`}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 bg-zinc-950 px-1.5 py-0.5 font-display text-sm font-semibold leading-none tabular-nums text-stone-50 sm:text-base lg:px-2 lg:py-1 lg:text-lg"
                    >
                      {pad2(i + 1)}
                    </span>
                    <span
                      className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/85 to-transparent px-2.5 pb-2 pt-8 transition-opacity duration-500 ${isLit ? 'opacity-100' : 'opacity-0'}`}
                    >
                      <span className="block truncate font-display text-xs font-semibold uppercase text-stone-50 sm:text-sm">{p.name}</span>
                      <span className="block truncate font-mono text-[0.58rem] uppercase tracking-wider text-stone-300">{p.position}</span>
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
