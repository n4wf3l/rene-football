import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { playerImage } from '../../../lib/playerImage'
import type { Player } from '../../../types/player'
import { EASE_OUT, Headline, HeroCtas, HeroEyebrow, HeroParagraph, HeroStats, STUDIO_BG, type HeroData } from './HeroParts'

interface BandProps {
  players: Player[]
  variant: 'solid' | 'outline'
  reverse?: boolean
  duration: number
}

/** One endless band: portrait, NAME, separator… doubled so it loops. */
function Band({ players, variant, reverse = false, duration }: BandProps) {
  const solid = variant === 'solid'
  const items = players.length >= 4 ? players : [...players, ...players, ...players].slice(0, Math.max(4, players.length))
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((p, i) => (
        <Link
          key={`${p.slug}-${i}`}
          to={`/joueurs/${p.slug}`}
          tabIndex={hidden ? -1 : undefined}
          className="group flex shrink-0 items-center gap-4 px-5 lg:gap-6 lg:px-8"
        >
          <span className="relative block h-12 w-12 overflow-hidden rounded-full lg:h-20 lg:w-20" style={{ background: STUDIO_BG }}>
            <img src={playerImage(p)} alt="" loading="lazy" decoding="async" className="h-full w-full scale-[1.3] object-cover object-[50%_12%]" />
          </span>
          <span
            className={`whitespace-nowrap font-display text-5xl font-bold uppercase leading-none tracking-tightest transition-colors lg:text-[7.5rem] ${
              solid
                ? 'text-stone-50 group-hover:text-turf-300 dark:text-zinc-950 dark:group-hover:text-turf-800'
                : 'text-transparent [-webkit-text-stroke:1.5px_rgba(9,9,11,0.55)] group-hover:[-webkit-text-stroke:1.5px_#1d4ed8] dark:[-webkit-text-stroke:1.5px_rgba(250,250,249,0.55)] dark:group-hover:[-webkit-text-stroke:1.5px_#93c5fd]'
            }`}
          >
            {p.name}
          </span>
          <span aria-hidden="true" className={`ml-4 h-3 w-3 rotate-45 lg:ml-6 ${solid ? 'bg-turf-400 dark:bg-turf-700' : 'bg-turf-600 dark:bg-turf-300'}`} />
        </Link>
      ))}
    </div>
  )

  return (
    <div
      className={`rf-marquee-host overflow-hidden py-4 lg:py-6 ${solid ? 'bg-zinc-950 dark:bg-stone-50' : ''}`}
    >
      <div
        className={`rf-marquee flex w-max ${reverse ? 'rf-marquee-reverse' : ''}`}
        style={{ '--rf-marquee-duration': `${duration}s` } as CSSProperties}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}

/**
 * "Défilé": the headline on top, the players' names running in two giant
 * bands across the page, crossing like scarves in a stand.
 */
export default function MarqueeHero({ spotlight, players, stats }: HeroData) {
  const reduce = useReducedMotion()
  const list = spotlight.length ? spotlight : players
  const half = Math.ceil(list.length / 2)
  const first = list.length > 3 ? list.slice(0, half) : list
  const second = list.length > 3 ? list.slice(half) : list

  return (
    <section className="relative overflow-hidden bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-100"
        style={{ background: 'radial-gradient(ellipse 50% 50% at 15% 25%, rgba(30,64,175,0.28), transparent 70%)' }}
      />
      <div className="relative flex min-h-[100dvh] flex-col">
        <div className="container-page grid gap-10 pt-28 lg:grid-cols-12 lg:items-end lg:gap-10 lg:pt-32">
          <div className="lg:col-span-7">
            <HeroEyebrow />
            <div className="mt-7"><Headline size="clamp(2.6rem, 5.6vw, 5.2rem)" /></div>
          </div>
          <div className="lg:col-span-5 lg:pb-2">
            <HeroParagraph />
            <HeroCtas className="mt-8" />
          </div>
        </div>

        {list.length > 0 && (
          <motion.div
            className="relative mt-14 flex flex-1 flex-col justify-center gap-0 pb-6 lg:mt-10"
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.6 }}
          >
            <div className="-mx-[5vw] -rotate-[3deg]">
              <Band players={first} variant="solid" duration={Math.max(28, first.length * 7)} />
            </div>
            <div className="relative z-10 -mx-[5vw] -mt-2 rotate-[2deg]">
              <Band players={second} variant="outline" reverse duration={Math.max(32, second.length * 8)} />
            </div>
          </motion.div>
        )}

        <div className="container-page pb-12">
          <HeroStats stats={stats} />
        </div>
      </div>
    </section>
  )
}
