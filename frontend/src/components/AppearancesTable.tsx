import { motion } from 'framer-motion'
import { House, ArrowSquareOut } from '@phosphor-icons/react'
import type { Appearance } from '../types/appearance'

export interface AppearancesTableProps {
  appearances: Appearance[]
  /** Show the rating sparkline header above the table. */
  withSparkline?: boolean
}

const FR_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function ratingClass(value: number | null): string {
  if (value === null) return 'text-zinc-500 dark:text-stone-500'
  if (value >= 8.5) return 'text-turf-700 dark:text-turf-300 font-semibold'
  if (value >= 7) return 'text-turf-700 dark:text-turf-300'
  if (value >= 6) return 'text-zinc-700 dark:text-stone-300'
  return 'text-rose-700 dark:text-rose-400'
}

/* SVG sparkline of the recent ratings, oldest → most recent (left → right). */
function RatingSparkline({ appearances }: { appearances: Appearance[] }) {
  const values = appearances
    .slice()
    .reverse()
    .map((a) => a.rating ?? 0)
  if (values.length < 2) return null

  const W = 240
  const H = 56
  const padX = 4
  const padY = 8
  const min = Math.min(...values, 4)
  const max = Math.max(...values, 9)
  const range = max - min || 1

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * (W - 2 * padX)
    const y = H - padY - ((v - min) / range) * (H - 2 * padY)
    return [x, y] as const
  })
  const d = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <motion.path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-turf-700 dark:text-turf-300"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={3}
        className="fill-turf-700 dark:fill-turf-300"
      />
    </svg>
  )
}

export default function AppearancesTable({
  appearances,
  withSparkline = true,
}: AppearancesTableProps) {
  if (!appearances.length) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/10 bg-white/40 dark:bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-600 dark:text-stone-400">
        Aucun match enregistré pour ce joueur.
      </div>
    )
  }

  const ratings = appearances.filter((a) => a.rating !== null)
  const avg = ratings.length
    ? ratings.reduce((sum, a) => sum + (a.rating ?? 0), 0) / ratings.length
    : null

  return (
    <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 overflow-hidden">
      {withSparkline && ratings.length >= 2 && (
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-50/10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1">
              Tendance des notes - {appearances.length} matchs
            </div>
            <div className="font-mono text-2xl tabular-nums text-zinc-950 dark:text-stone-50">
              {avg?.toFixed(1).replace('.', ',')}
              <span className="text-stone-400 dark:text-stone-500 text-base ml-1">moy.</span>
            </div>
          </div>
          <RatingSparkline appearances={appearances} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-zinc-950/40 border-b border-stone-200 dark:border-stone-50/10">
            <tr className="text-left text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Compétition</th>
              <th className="px-4 py-2.5">Adversaire</th>
              <th className="px-3 py-2.5 text-right">Score</th>
              <th className="px-3 py-2.5 text-right">Min</th>
              <th className="px-3 py-2.5 text-right">B</th>
              <th className="px-3 py-2.5 text-right">PD</th>
              <th className="px-3 py-2.5 text-right">Tirs</th>
              <th className="px-4 py-2.5 text-right">Note</th>
            </tr>
          </thead>
          <tbody>
            {appearances.map((a) => (
              <tr
                key={a.id}
                className="border-b border-stone-100 dark:border-stone-50/5 last:border-0"
              >
                <td className="px-4 py-3 text-zinc-700 dark:text-stone-300 whitespace-nowrap">
                  <span className="font-mono text-xs">
                    {FR_DATE.format(new Date(a.match_date))}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-stone-400 text-xs">
                  {a.competition}
                </td>
                <td className="px-4 py-3 text-zinc-900 dark:text-stone-100">
                  <span className="inline-flex items-center gap-1.5">
                    {a.home ? (
                      <House size={11} weight="bold" className="text-turf-700 dark:text-turf-300" />
                    ) : (
                      <ArrowSquareOut size={11} weight="bold" className="text-zinc-500 dark:text-stone-400" />
                    )}
                    {a.opponent}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-xs text-zinc-700 dark:text-stone-300 whitespace-nowrap">
                  {a.score_team}-{a.score_opponent}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-xs text-zinc-700 dark:text-stone-300">
                  {a.minutes_played}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-zinc-950 dark:text-stone-50">
                  {a.goals || ''}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-zinc-700 dark:text-stone-300">
                  {a.assists || ''}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-xs text-zinc-700 dark:text-stone-300">
                  {a.shots > 0 ? `${a.shots_on_target}/${a.shots}` : ''}
                </td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums ${ratingClass(a.rating)}`}>
                  {a.rating !== null ? a.rating.toFixed(1).replace('.', ',') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
