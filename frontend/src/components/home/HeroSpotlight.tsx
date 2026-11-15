import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import ScrambleText from './ScrambleText'
import { useArrowKeys } from './hero/HeroParts'
import { playerImage } from '../../lib/playerImage'
import type { Player } from '../../types/player'

const ROTATE_MS = 6500
/** Chamfered top-right corner - the card reads as a cut-out match ticket. */
// Warm off-white card, like a studio backdrop behind the player cut-outs.
const CARD_BG_TOP = '#f7f3ec'
const CARD_BG = '#ece4d6'
const CARD_CLIP ='polygon(0 0, calc(100% - 44px) 0, 100% 44px, 100% 100%, 0 100%)'

interface HeroSpotlightProps {
  players: Player[]
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Hero player card. Cycles through the represented players that have a real
 * photo: the portrait wipes in from the bottom, the name settles like a
 * transfer board. Pauses on hover / focus; manual prev / next always works.
 */
function HeroSpotlight({ players }: HeroSpotlightProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  // Portraits that finished loading: the wipe only starts once the image is
  // there, so the card never reveals an empty frame.
  const [loaded, setLoaded] = useState<Record<string, true>>({})
  const count = players.length
  const current = count > 0 ? players[index % count] : null
  const ready = current ? loaded[current.slug] === true : false
  const autoplay = count > 1 && !paused && !reduce
  const markLoaded = (slug: string) => setLoaded((l) => (l[slug] ? l : { ...l, [slug]: true }))

  useEffect(() => {
    if (!autoplay) return
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearTimeout(id)
  }, [autoplay, index, count])

  // Warm the next portrait so the wipe never reveals a half-loaded image.
  useEffect(() => {
    if (count < 2) return
    const next = new Image()
    next.src = playerImage(players[(index + 1) % count])
  }, [index, count, players])

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)
  useArrowKeys(go, count > 1)

  return (
    <div
      className="relative w-full max-w-[460px] lg:ml-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden"
        style={{
          clipPath: CARD_CLIP,
          maxHeight: 'min(68dvh, 580px)',
          background: `linear-gradient(180deg, ${CARD_BG_TOP} 0%, ${CARD_BG} 100%)`,
        }}
      >
        {/* Jersey-style index behind the portrait */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-2 -top-6 font-display font-semibold leading-none text-[11rem] text-zinc-950 tabular-nums select-none"
        >
          {pad(current ? (index % count) + 1 : 1)}
        </div>

        {/* While the roster loads (or if it is empty) the card shows the agency
            monogram, never a hard-coded player photo. */}
        {(!current || (index === 0 && !ready)) && (
          <img
            src="/logo-black.png"
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 top-[42%] w-28 -translate-x-1/2 -translate-y-1/2 opacity-[0.15]"
          />
        )}
        <AnimatePresence initial={false}>
          {current && (
          <motion.img
            key={current.slug}
            src={playerImage(current)}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'auto'}
            onLoad={() => markLoaded(current.slug)}
            onError={() => markLoaded(current.slug)}
            className="absolute inset-0 h-full w-full object-cover object-[50%_18%]"
            initial={reduce ? { opacity: 0 } : { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08 }}
            animate={
              !ready
                ? (reduce ? { opacity: 0 } : { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08 })
                : (reduce ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)', scale: 1 })
            }
            exit={{ opacity: 0, transition: { duration: 0.35, delay: 0.55 } }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          />
          )}
        </AnimatePresence>

        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, transparent 52%, ${CARD_BG}d9 76%, ${CARD_BG} 100%)` }}
        />

        {current && (
          <Link
            to={`/joueurs/${current.slug}`}
            className="group absolute inset-x-0 bottom-0 p-6 lg:p-7 flex items-end justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-turf-700/60"
          >
            <span className="min-w-0">
              <span className="block font-mono text-[0.68rem] uppercase tracking-[0.24em] text-turf-800">
                {t('home.hero.identityLabel')}
              </span>
              <ScrambleText
                text={current.name.toUpperCase()}
                className="mt-2 block font-display font-semibold text-[1.9rem] lg:text-[2.35rem] leading-[0.95] tracking-tight text-zinc-950"
              />
              <span className="mt-2 block truncate text-sm text-zinc-600">
                {[current.position, current.club].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="grid h-11 w-11 shrink-0 place-items-center border border-zinc-950/25 text-zinc-950 transition-colors duration-300 ease-premium group-hover:border-zinc-950 group-hover:bg-zinc-950 group-hover:text-stone-50">
              <ArrowUpRight size={18} weight="bold" />
              <span className="sr-only">{t('home.hero.viewProfile')}</span>
            </span>
          </Link>
        )}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center gap-4">
          <span className="font-mono text-xs tabular-nums text-zinc-500 dark:text-stone-400">
            <span className="text-zinc-950 dark:text-stone-50">{pad((index % count) + 1)}</span> / {pad(count)}
          </span>
          <span className="relative h-px flex-1 overflow-hidden bg-zinc-950/15 dark:bg-stone-50/15" aria-hidden="true">
            <motion.span
              key={`${index}-${autoplay}`}
              className="absolute inset-0 origin-left bg-turf-700 dark:bg-turf-300"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: autoplay ? 1 : 0 }}
              transition={{ duration: autoplay ? ROTATE_MS / 1000 : 0, ease: 'linear' }}
            />
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t('home.hero.prevPlayer')}
              className="grid h-9 w-9 place-items-center border border-zinc-950/15 text-zinc-600 transition-colors hover:border-zinc-950/50 hover:text-zinc-950 active:scale-[0.96] dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/50 dark:hover:text-stone-50"
            >
              <ArrowLeft size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t('home.hero.nextPlayer')}
              className="grid h-9 w-9 place-items-center border border-zinc-950/15 text-zinc-600 transition-colors hover:border-zinc-950/50 hover:text-zinc-950 active:scale-[0.96] dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/50 dark:hover:text-stone-50"
            >
              <ArrowRight size={14} weight="bold" />
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

export default HeroSpotlight
