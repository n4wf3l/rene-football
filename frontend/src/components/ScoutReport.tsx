import { memo, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  ArrowsLeftRight,
  Brain,
  Crosshair,
  Eye,
  Hand,
  Lightning,
  PaperPlaneTilt,
  PersonSimpleRun,
  Question,
  ShieldCheck,
  SoccerBall,
  Sparkle,
  Target,
  Timer,
  Wind,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import type { PlayerComparison, PlayerStrength } from '../types/player'
import AnimatedNumber from './AnimatedNumber'

export interface ScoutReportProps {
  comparisons?: PlayerComparison[] | null
  strengths?: PlayerStrength[] | null
  potentialRating?: number | null
  potentialLabel?: string | null
  scoutQuote?: string | null
}

/* Maps a strength key to a Phosphor icon. Unknown keys fall back to Sparkle. */
const STRENGTH_ICONS: Record<string, PhosphorIcon> = {
  '1v1':            Eye,
  'explosive':      Lightning,
  'dribble':        SoccerBall,
  'unpredictable':  Question,
  'finishing':      Target,
  'positioning':    Crosshair,
  'power':          Lightning,
  'aerial':         ArrowsLeftRight,
  'tackle':         ShieldCheck,
  'reading':        Brain,
  'composure':      Brain,
  'recovery':       PersonSimpleRun,
  'long-pass':      PaperPlaneTilt,
  'stamina':        Timer,
  'vision':         Eye,
  'key-pass':       PaperPlaneTilt,
  'press-resist':   ShieldCheck,
  'crossing':       PaperPlaneTilt,
  'speed':          Wind,
  'overlap':        PersonSimpleRun,
  'reflex':         Hand,
  'distribution':   PaperPlaneTilt,
  'command':        ShieldCheck,
}

/* ---- Potential gauge: half-circle SVG arc that fills from 0 → rating/10 ---- */
interface PotentialGaugeProps {
  rating: number
  label: string
}

function PotentialGauge({ rating, label }: PotentialGaugeProps) {
  const target = Math.max(0, Math.min(10, rating))
  const motionRating = useMotionValue(0)

  // Arc length: half-circle radius 70 → length = π × 70 ≈ 219.91
  const ARC_LENGTH = Math.PI * 70
  const dashoffset = useTransform(motionRating, (v) => ARC_LENGTH - (ARC_LENGTH * v) / 10)

  useEffect(() => {
    const ctrl = animate(motionRating, target, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => ctrl.stop()
  }, [motionRating, target])

  return (
    <div className="relative flex flex-col items-center justify-center text-center">
      <svg width="180" height="110" viewBox="0 0 180 110" aria-hidden="true">
        {/* Track */}
        <path
          d="M 20 100 A 70 70 0 0 1 160 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-stone-200 dark:text-stone-50/10"
        />
        {/* Filled arc */}
        <motion.path
          d="M 20 100 A 70 70 0 0 1 160 100"
          fill="none"
          stroke="url(#potential-gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          style={{ strokeDashoffset: dashoffset }}
        />
        <defs>
          <linearGradient id="potential-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#84b896" />
            <stop offset="60%"  stopColor="#2d7d4f" />
            <stop offset="100%" stopColor="#0f5132" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-0 top-7 flex items-baseline justify-center">
        <span className="font-mono font-semibold text-5xl tabular-nums text-zinc-950 dark:text-stone-50">
          <AnimatedNumber value={target} duration={1.6} decimals={1} />
        </span>
        <span className="font-mono text-base text-zinc-500 dark:text-stone-400 ml-1">/10</span>
      </div>
      <div className="mt-2 font-mono uppercase tracking-[0.18em] text-[0.7rem] text-turf-700 dark:text-turf-300">
        {label}
      </div>
    </div>
  )
}

const ComparisonsRow = memo(function ComparisonsRow({ items }: { items: PlayerComparison[] }) {
  return (
    <ul className="flex flex-col sm:flex-row gap-3">
      {items.map((c) => (
        <li
          key={c.name}
          className="flex-1 flex items-center gap-3 rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 px-4 py-3 transition-colors hover:border-turf-700/40 dark:hover:border-turf-300/40"
        >
          <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-50/5">
            {c.photo_url && (
              <img
                src={c.photo_url}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition"
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display font-medium text-sm text-zinc-950 dark:text-stone-50 leading-tight truncate">
              {c.name}
            </div>
            {c.club && (
              <div className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate">
                {c.club}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
})

const StrengthsRow = memo(function StrengthsRow({ items }: { items: PlayerStrength[] }) {
  return (
    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((s) => {
        const Icon = STRENGTH_ICONS[s.key] ?? Sparkle
        return (
          <li
            key={s.key}
            className="flex items-center gap-3 rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 px-4 py-3"
          >
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-turf-50 text-turf-800 border border-turf-100 dark:bg-turf-800/30 dark:text-turf-200 dark:border-turf-300/20 shrink-0">
              <Icon size={16} weight="regular" />
            </span>
            <span className="font-medium text-sm text-zinc-950 dark:text-stone-50 leading-tight">
              {s.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
})

/* ---- Composite scout report - quote + comparisons + strengths + potential gauge ---- */
function ScoutReport({
  comparisons,
  strengths,
  potentialRating,
  potentialLabel,
  scoutQuote,
}: ScoutReportProps) {
  const hasAny =
    (comparisons && comparisons.length > 0) ||
    (strengths && strengths.length > 0) ||
    typeof potentialRating === 'number' ||
    Boolean(scoutQuote)

  if (!hasAny) return null

  return (
    <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
      {/* Quote block + comparisons + strengths (left, 8 cols) */}
      <div className="lg:col-span-8 space-y-6 lg:space-y-8">
        {scoutQuote && (
          <blockquote className="relative rounded-3xl bg-zinc-950 text-stone-100 p-6 lg:p-8 overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -right-12 w-72 h-72 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(15,81,50,0.45), transparent 70%)' }}
            />
            <span className="absolute top-5 left-5 font-display text-5xl text-turf-300/40 leading-none select-none">
              “
            </span>
            <p className="relative pl-10 pr-4 text-base lg:text-lg leading-relaxed text-stone-200 font-display italic">
              {scoutQuote}
            </p>
            <div className="relative mt-4 pl-10 font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
              Note de scout · Rene Football
            </div>
          </blockquote>
        )}

        {comparisons && comparisons.length > 0 && (
          <div>
            <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-3">
              Profils de référence
            </div>
            <ComparisonsRow items={comparisons} />
          </div>
        )}

        {strengths && strengths.length > 0 && (
          <div>
            <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-3">
              Points forts identifiés
            </div>
            <StrengthsRow items={strengths} />
          </div>
        )}
      </div>

      {/* Potential gauge (right, 4 cols) */}
      {typeof potentialRating === 'number' && (
        <div className="lg:col-span-4 rounded-3xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-6 lg:p-8 flex flex-col items-center justify-center">
          <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-3">
            Potentiel
          </div>
          <PotentialGauge
            rating={potentialRating}
            label={potentialLabel ?? 'Évaluation interne'}
          />
        </div>
      )}
    </div>
  )
}

export default ScoutReport
