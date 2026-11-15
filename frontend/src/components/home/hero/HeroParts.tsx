import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import MagneticLink from '../../MagneticLink'
import AnimatedNumber from '../../AnimatedNumber'
import LuxClock from '../LuxClock'
import type { Player } from '../../../types/player'

/**
 * Pieces every home hero is made of (same words, same order of entrance),
 * so the agency can switch layouts in Réglages without the message changing.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const

export interface HeroStat { value: number; label: string }

export interface HeroData {
  /** Every published player, most active first. */
  players: Player[]
  /** The same, with a real photo only. */
  spotlight: Player[]
  stats: HeroStat[]
}

/** "Agence de football ── • Luxembourg 16:06" */
export function HeroEyebrow({ tone = 'auto', className = '' }: { tone?: 'auto' | 'light'; className?: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const light = tone === 'light'
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[0.68rem] uppercase tracking-[0.24em] ${
        light ? 'text-stone-300' : 'text-zinc-500 dark:text-stone-400'
      } ${className}`}
    >
      <span className={light ? 'text-turf-300' : 'text-turf-700 dark:text-turf-300'}>{t('home.hero.chip')}</span>
      <span className={`h-px w-8 ${light ? 'bg-stone-50/30' : 'bg-zinc-950/20 dark:bg-stone-50/20'}`} aria-hidden="true" />
      <span className="inline-flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${light ? 'bg-turf-300' : 'bg-turf-600 dark:bg-turf-300'}`} aria-hidden="true" />
        {t('home.hero.clock')} <LuxClock />
      </span>
    </motion.div>
  )
}

interface HeadlineProps {
  /** CSS font-size, e.g. clamp(2.6rem, 6vw, 5.4rem). */
  size?: string
  tone?: 'auto' | 'light'
  className?: string
  style?: CSSProperties
}

/** H1 revealed word by word from behind a mask - the hero's load sequence. */
export function Headline({ size = 'clamp(2.6rem, 6vw, 5.4rem)', tone = 'auto', className = '', style }: HeadlineProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const pre = t('home.hero.titlePre')
  const accent = t('home.hero.titleAccent')
  const post = t('home.hero.titlePost')
  const words = [
    ...pre.split(' ').map((w) => ({ w, accent: false })),
    ...accent.split(' ').map((w) => ({ w, accent: true })),
    ...post.split(' ').map((w) => ({ w, accent: false })),
  ].filter((x) => x.w)
  const light = tone === 'light'

  return (
    <h1
      className={`font-display font-semibold leading-[0.96] tracking-tightest ${light ? 'text-stone-50' : 'text-zinc-950 dark:text-stone-50'} ${className}`}
      style={{ fontSize: size, ...style }}
    >
      <span className="sr-only">{`${pre} ${accent} ${post}`}</span>
      <span aria-hidden="true">
        {words.map(({ w, accent: isAccent }, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span
              className={`inline-block ${isAccent ? (light ? 'text-turf-300 italic' : 'text-turf-700 italic dark:text-turf-300') : ''}`}
              initial={reduce ? false : { y: '108%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 + i * 0.05 }}
            >
              {w}
            </motion.span>
            {i < words.length - 1 && ' '}
          </span>
        ))}
      </span>
    </h1>
  )
}

export function HeroParagraph({ tone = 'auto', className = '' }: { tone?: 'auto' | 'light'; className?: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  return (
    <motion.p
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.7 }}
      className={`max-w-[54ch] text-base leading-relaxed lg:text-lg ${tone === 'light' ? 'text-stone-300' : 'text-zinc-600 dark:text-stone-400'} ${className}`}
    >
      {t('home.hero.paragraph')}
    </motion.p>
  )
}

export function HeroCtas({ tone = 'auto', className = '' }: { tone?: 'auto' | 'light'; className?: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const light = tone === 'light'
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.82 }}
      className={`flex flex-wrap items-center gap-3 ${className}`}
    >
      <MagneticLink
        to="/joueurs"
        className={`group inline-flex items-center gap-3 px-6 py-4 text-[0.95rem] font-medium transition-colors duration-300 ease-premium ${
          light
            ? 'bg-stone-50 text-zinc-950 hover:bg-turf-300'
            : 'bg-zinc-950 text-stone-50 hover:bg-turf-800 dark:bg-stone-50 dark:text-zinc-950 dark:hover:bg-turf-300'
        }`}
      >
        {t('home.hero.ctaPrimary')}
        <ArrowUpRight size={18} weight="bold" className="transition-transform duration-300 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </MagneticLink>
      <Link
        to="/contact"
        className={`inline-flex items-center gap-2 border px-6 py-4 text-[0.95rem] font-medium transition-colors duration-300 ease-premium active:-translate-y-px ${
          light
            ? 'border-stone-50/25 text-stone-50 hover:border-stone-50/70'
            : 'border-zinc-950/20 text-zinc-900 hover:border-zinc-950/60 dark:border-stone-50/20 dark:text-stone-100 dark:hover:border-stone-50/60'
        }`}
      >
        {t('home.hero.ctaSecondary')}
      </Link>
    </motion.div>
  )
}

export function HeroStats({ stats, tone = 'auto', className = '' }: { stats: HeroStat[]; tone?: 'auto' | 'light'; className?: string }) {
  const reduce = useReducedMotion()
  if (stats.length < 2) return null
  const light = tone === 'light'
  return (
    <motion.dl
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 1 }}
      className={`grid max-w-xl grid-cols-2 gap-y-6 border-t pt-6 sm:grid-cols-4 ${light ? 'border-stone-50/15' : 'border-zinc-950/10 dark:border-stone-50/10'} ${className}`}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col pr-4">
          <dt className={`order-2 mt-1 text-xs leading-snug ${light ? 'text-stone-400' : 'text-zinc-500 dark:text-stone-500'}`}>{s.label}</dt>
          <dd className={`font-mono text-3xl tabular-nums ${light ? 'text-stone-50' : 'text-zinc-950 dark:text-stone-50'}`}>
            <AnimatedNumber value={s.value} duration={1.6} />
          </dd>
        </div>
      ))}
    </motion.dl>
  )
}

/**
 * ← / → on the keyboard show the previous / next player in the hero.
 * Ignored while typing in a field, with a modifier key held, or once the
 * visitor has scrolled past the hero.
 */
export function useArrowKeys(step: (delta: 1 | -1) => void, enabled: boolean): void {
  const stepRef = useRef(step)
  stepRef.current = step
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (window.scrollY > window.innerHeight * 0.6) return
      e.preventDefault()
      stepRef.current(e.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}

/** "07" */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Studio backdrop used behind the player cut-outs (home spotlight card). */
export const STUDIO_BG = 'linear-gradient(180deg, #f7f3ec 0%, #ece4d6 100%)'
