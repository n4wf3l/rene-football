import { motion } from 'framer-motion'

export interface PercentileBarsProps {
  /** Map metric_key → 0..100 percentile (already inverted for "lower is better" metrics). */
  percentiles: Record<string, number> | null | undefined
  /** Which metrics to show, in display order. */
  metrics: { key: string; label: string }[]
  /** Population size from which the percentile is computed (rendered as caption). */
  populationSize?: number
  className?: string
}

function tone(value: number) {
  if (value >= 80) return 'bg-turf-700'
  if (value >= 60) return 'bg-turf-500'
  if (value >= 40) return 'bg-amber-500'
  if (value >= 20) return 'bg-amber-700'
  return 'bg-rose-700'
}

function label(value: number) {
  if (value >= 90) return 'Élite'
  if (value >= 75) return 'Top'
  if (value >= 50) return 'Au-dessus'
  if (value >= 25) return 'Sous'
  return 'Bas'
}

/**
 * Horizontal percentile bars — one row per metric. Colors shift from rose
 * (bottom 20%) through amber to turf (top 20%) so a single glance tells
 * the scout where the player is strong / weak vs his positional pool.
 */
export default function PercentileBars({
  percentiles,
  metrics,
  populationSize,
  className = '',
}: PercentileBarsProps) {
  if (!percentiles) {
    return (
      <div className="text-xs text-zinc-500 dark:text-stone-500 italic">
        Percentiles indisponibles.
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {populationSize !== undefined && (
        <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-500">
          Référence : {populationSize} joueur{populationSize > 1 ? 's' : ''} du même poste
        </div>
      )}
      <ul className="space-y-2.5">
        {metrics.map((m) => {
          const v = percentiles[m.key]
          if (typeof v !== 'number') return null
          return (
            <li key={m.key} className="grid grid-cols-[140px_1fr_64px] gap-3 items-center">
              <span className="text-xs text-zinc-700 dark:text-stone-300 truncate">
                {m.label}
              </span>
              <div className="relative h-1.5 rounded-full bg-stone-200 dark:bg-stone-50/8 overflow-hidden">
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: v / 100 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ type: 'spring', stiffness: 90, damping: 22 }}
                  className={`block h-full ${tone(v)}`}
                  style={{ transformOrigin: 'left' }}
                />
              </div>
              <span className="font-mono tabular-nums text-xs text-right text-zinc-900 dark:text-stone-100">
                {v.toFixed(0)}
                <span className="text-zinc-500 dark:text-stone-500 text-[0.65rem] ml-0.5">%</span>
                <div className="text-[0.6rem] uppercase tracking-wider text-zinc-500 dark:text-stone-500">
                  {label(v)}
                </div>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
