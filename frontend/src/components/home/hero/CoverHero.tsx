import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { playerImage } from '../../../lib/playerImage'
import { EASE_OUT, Headline, HeroCtas, HeroEyebrow, HeroParagraph, STUDIO_BG, pad2, type HeroData } from './HeroParts'

const MAX_CARDS = 6

/**
 * "Une": a magazine cover. Masthead rule, the headline across the full
 * width, and the players in a numbered line-up strip underneath.
 */
export default function CoverHero({ spotlight }: HeroData) {
  const reduce = useReducedMotion()
  const cards = spotlight.slice(0, MAX_CARDS)
  const year = new Date().getFullYear()

  return (
    <section className="relative overflow-hidden bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-100"
        style={{ background: 'radial-gradient(ellipse 60% 45% at 85% 85%, rgba(30,64,175,0.30), transparent 70%)' }}
      />
      <div className="container-page relative flex min-h-[100dvh] flex-col pb-10 pt-24 lg:pb-12">
        {/* Masthead */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-between gap-3 border-y border-zinc-950/15 py-3 dark:border-stone-50/15"
        >
          <span className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-zinc-950 dark:text-stone-50">
            Rene Football <span className="ml-2 font-mono text-[0.65rem] font-normal tracking-[0.2em] text-zinc-500 dark:text-stone-400">{year}</span>
          </span>
          <HeroEyebrow />
        </motion.div>

        <div className="mt-8 lg:mt-12">
          <Headline size="clamp(3rem, 7.4vw, 7.8rem)" className="max-w-[14ch] lg:max-w-none" style={{ lineHeight: 0.9 }} />
        </div>

        <div className="mt-auto grid grid-cols-1 gap-10 pt-10 lg:grid-cols-12 lg:items-end lg:gap-10 lg:pt-12">
          <div className="min-w-0 lg:col-span-4">
            <HeroParagraph className="!text-base" />
            <HeroCtas className="mt-7" />
          </div>

          {cards.length > 0 && (
            <div className="min-w-0 lg:col-span-8">
              <ol className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
                {cards.map((p, i) => (
                  <motion.li
                    key={p.slug}
                    className="w-[38%] shrink-0 snap-start sm:w-[26%] lg:w-0 lg:min-w-0 lg:flex-1"
                    initial={reduce ? false : { opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.5 + i * 0.07 }}
                  >
                    <Link to={`/joueurs/${p.slug}`} className="group block focus:outline-none">
                      <span
                        className="relative block aspect-[3/4] overflow-hidden transition-transform duration-500 ease-premium group-hover:-translate-y-1.5 group-focus-visible:ring-2 group-focus-visible:ring-turf-500"
                        style={{ background: STUDIO_BG, clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
                      >
                        <img
                          src={playerImage(p)}
                          alt=""
                          loading={i < 4 ? 'eager' : 'lazy'}
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover object-[50%_15%]"
                        />
                        <span aria-hidden="true" className="absolute left-0 top-0 bg-zinc-950 px-1.5 py-0.5 font-display text-base font-semibold leading-none tabular-nums text-stone-50 lg:text-lg">
                          {pad2(i + 1)}
                        </span>
                      </span>
                      <span className="mt-2 block truncate text-sm font-medium text-zinc-950 dark:text-stone-50">{p.name}</span>
                      <span className="block truncate font-mono text-[0.6rem] uppercase tracking-wider text-zinc-500 dark:text-stone-400">{p.position}</span>
                    </Link>
                  </motion.li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
