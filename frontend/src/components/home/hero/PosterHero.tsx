import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import ScrambleText from '../ScrambleText'
import { playerImage } from '../../../lib/playerImage'
import { EASE_OUT, Headline, HeroCtas, HeroEyebrow, HeroParagraph, HeroStats, pad2, type HeroData } from './HeroParts'

const ROTATE_MS = 6000
const MAX_STORIES = 10

// Soft edges so a photo that is not a cut-out still sits in the poster.
const PHOTO_MASK = {
  WebkitMaskImage: 'linear-gradient(to top, transparent 0%, #000 22%), linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%)',
  WebkitMaskComposite: 'source-in',
  maskImage: 'linear-gradient(to top, transparent 0%, #000 22%), linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%)',
  maskComposite: 'intersect',
} as const

/**
 * "Affiche": one player at poster size, his name set giant behind him, story
 * bars counting down to the next one. Like a matchday poster.
 */
export default function PosterHero({ spotlight, stats }: HeroData) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const players = spotlight.slice(0, MAX_STORIES)
  const count = players.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [loaded, setLoaded] = useState<Record<string, true>>({})
  const current = count ? players[index % count] : null
  const ready = current ? loaded[current.slug] === true : false
  const autoplay = count > 1 && !paused && !reduce && ready

  useEffect(() => {
    if (!autoplay) return
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearTimeout(id)
  }, [autoplay, index, count])

  useEffect(() => {
    if (count < 2) return
    const next = new Image()
    next.src = playerImage(players[(index + 1) % count])
  }, [index, count, players])

  const surname = current ? current.name.trim().split(/\s+/).slice(-1)[0].toLocaleUpperCase() : ''
  const giantSize = `min(26vw, ${Math.round(150 / Math.max(surname.length, 4))}vw)`

  return (
    <section className="relative overflow-hidden bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-100"
        style={{ background: 'radial-gradient(ellipse 55% 70% at 72% 55%, rgba(30,64,175,0.34), transparent 70%)' }}
      />

      <div className="relative lg:min-h-[100dvh]">
        {/* Stage: giant surname + the player. Full right half on desktop, top block on mobile. */}
        <div
          className="relative h-[64vh] min-h-[420px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[60%]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {current && (
              <motion.div
                key={`name-${current.slug}`}
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-[16%] select-none whitespace-nowrap text-center font-display font-extrabold uppercase leading-[0.8] tracking-tightest"
                style={{ fontSize: giantSize, color: 'transparent', WebkitTextStroke: '2px currentColor' }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.8, ease: EASE_OUT }}
              >
                <span className="text-zinc-950/15 dark:text-stone-50/25">{surname}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {current && (
              <motion.img
                key={current.slug}
                src={playerImage(current)}
                alt=""
                loading="eager"
                decoding="async"
                fetchPriority={index === 0 ? 'high' : 'auto'}
                onLoad={() => setLoaded((l) => (l[current.slug] ? l : { ...l, [current.slug]: true }))}
                onError={() => setLoaded((l) => ({ ...l, [current.slug]: true }))}
                className="absolute bottom-0 left-1/2 h-[84%] w-auto max-w-none -translate-x-1/2 object-contain object-bottom lg:h-[88%]"
                style={PHOTO_MASK}
                initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' }}
                animate={ready ? { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' } : {}}
                exit={{ opacity: 0, transition: { duration: 0.4 } }}
                transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
              />
            )}
          </AnimatePresence>

          {/* Story bars - one per player, the current one fills up. */}
          {count > 1 && (
            <div className="absolute left-4 right-4 top-24 z-10 flex gap-1.5 lg:left-auto lg:right-8 lg:top-28 lg:w-72">
              {players.map((p, i) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={p.name}
                  className="relative h-1 flex-1 overflow-hidden rounded-full bg-zinc-950/15 dark:bg-stone-50/20"
                >
                  {i < index && <span className="absolute inset-0 bg-zinc-950/70 dark:bg-stone-50/80" />}
                  {i === index && (
                    <motion.span
                      key={`${p.slug}-${index}-${paused}`}
                      className="absolute inset-y-0 left-0 bg-zinc-950 dark:bg-stone-50"
                      initial={{ width: '0%' }}
                      animate={{ width: autoplay ? '100%' : '0%' }}
                      transition={{ duration: autoplay ? ROTATE_MS / 1000 : 0, ease: 'linear' }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Caption ticket */}
          {current && (
            <Link
              to={`/joueurs/${current.slug}`}
              className="group absolute bottom-6 right-4 z-10 flex max-w-[78%] items-end gap-4 border border-zinc-950/10 bg-stone-50/85 px-4 py-3 backdrop-blur dark:border-stone-50/10 dark:bg-zinc-950/70 lg:bottom-10 lg:right-8"
            >
              <span className="min-w-0">
                <span className="block font-mono text-[0.62rem] uppercase tracking-[0.24em] text-turf-700 dark:text-turf-300">
                  {t('home.hero.identityLabel')} · {pad2((index % count) + 1)}/{pad2(count)}
                </span>
                <ScrambleText
                  text={current.name.toUpperCase()}
                  className="mt-1 block truncate font-display text-lg font-semibold leading-tight text-zinc-950 dark:text-stone-50"
                />
                <span className="block truncate text-xs text-zinc-500 dark:text-stone-400">
                  {[current.position, current.club].filter(Boolean).join(' · ')}
                </span>
              </span>
              <ArrowUpRight size={18} weight="bold" className="mb-1 shrink-0 text-zinc-950 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-stone-50" />
              <span className="sr-only">{t('home.hero.viewProfile')}</span>
            </Link>
          )}
        </div>

        {/* Copy */}
        <div className="container-page relative flex flex-col justify-center pb-14 pt-10 lg:min-h-[100dvh] lg:pb-16 lg:pt-28">
          <div className="lg:max-w-[46%]">
            <HeroEyebrow />
            <div className="mt-7"><Headline size="clamp(2.5rem, 5.2vw, 4.9rem)" /></div>
            <HeroParagraph className="mt-7" />
            <HeroCtas className="mt-9" />
            <HeroStats stats={stats} className="mt-12" />
          </div>
        </div>
      </div>
    </section>
  )
}
