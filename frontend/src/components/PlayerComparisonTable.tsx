import type { Player } from '../types/player'
import { RADAR_PLAYER_COLORS } from './PlayerRadar'

export interface ComparisonRow {
  /** Field on Player to read. */
  key: keyof Player
  label: string
  /** Display formatter - defaults to integer with FR thousands separator. */
  format?: (value: number) => string
  /** When true, the LOW value is "best" (e.g. cards). */
  lowerIsBetter?: boolean
}

const FR = (n: number) => n.toLocaleString('fr-FR')
const ONE = (n: number) => n.toFixed(1).replace('.', ',')
const TWO = (n: number) => n.toFixed(2).replace('.', ',')
const PCT = (n: number) => `${n.toFixed(1).replace('.', ',')}%`

const ROWS: ComparisonRow[] = [
  { key: 'matches_played',     label: 'Matchs joués',     format: FR },
  { key: 'minutes_played',     label: 'Minutes',          format: FR },
  { key: 'goals',              label: 'Buts',             format: FR },
  { key: 'assists',            label: 'Passes décisives', format: FR },
  { key: 'xg',                 label: 'xG',               format: TWO },
  { key: 'xa',                 label: 'xA',               format: TWO },
  { key: 'shots',              label: 'Tirs',             format: FR },
  { key: 'shots_on_target',    label: 'Tirs cadrés',      format: FR },
  { key: 'key_passes',         label: 'Passes clés',      format: FR },
  { key: 'pass_accuracy',      label: 'Précision passes', format: PCT },
  { key: 'dribbles_completed', label: 'Dribbles réussis', format: FR },
  { key: 'tackles',            label: 'Tacles',           format: FR },
  { key: 'interceptions',      label: 'Interceptions',    format: FR },
  { key: 'duels_won',          label: 'Duels gagnés',     format: FR },
  { key: 'clean_sheets',       label: 'Clean sheets',     format: FR },
  { key: 'saves',              label: 'Arrêts',           format: FR },
  { key: 'yellow_cards',       label: 'Cartons jaunes',   format: FR, lowerIsBetter: true },
  { key: 'red_cards',          label: 'Cartons rouges',   format: FR, lowerIsBetter: true },
  { key: 'potential_rating',   label: 'Potentiel',        format: ONE },
]

const IDENTITY: ComparisonRow[] = [
  { key: 'age',                label: 'Âge',              format: FR },
  { key: 'since',              label: 'Suivi depuis',     format: FR },
]

export interface PlayerComparisonTableProps {
  players: Player[]
}

function readNumeric(p: Player, key: keyof Player): number | null {
  const v = p[key]
  if (typeof v === 'number') return v
  return null
}

export default function PlayerComparisonTable({ players }: PlayerComparisonTableProps) {
  if (players.length < 2) return null

  // Pre-compute best (max or min) per row so we can highlight winners.
  const winners = new Map<keyof Player, number>()
  ROWS.forEach((row) => {
    const values = players.map((p) => readNumeric(p, row.key) ?? 0)
    const best = row.lowerIsBetter ? Math.min(...values) : Math.max(...values)
    winners.set(row.key, best)
  })

  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-50/8 bg-white dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 dark:bg-zinc-950/40 border-b border-stone-200 dark:border-stone-50/8">
          <tr>
            <th className="text-left px-4 py-3 font-mono uppercase tracking-[0.16em] text-[0.65rem] text-zinc-500 dark:text-stone-400">
              Métrique
            </th>
            {players.map((p, i) => (
              <th
                key={p.slug}
                className="text-right px-4 py-3 font-medium text-zinc-950 dark:text-stone-50 whitespace-nowrap"
              >
                <div className="inline-flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${RADAR_PLAYER_COLORS[i].legend}`}
                    aria-hidden="true"
                  />
                  {p.name}
                </div>
                <div className="font-mono text-[0.65rem] uppercase tracking-wider text-zinc-500 dark:text-stone-500">
                  {p.position} · {p.club ?? '-'}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Identity quick-row */}
          {IDENTITY.map((row) => (
            <tr key={String(row.key)} className="border-b border-stone-100 dark:border-stone-50/5">
              <td className="px-4 py-2.5 text-zinc-600 dark:text-stone-400 text-xs uppercase tracking-wider font-mono">
                {row.label}
              </td>
              {players.map((p) => {
                const v = readNumeric(p, row.key)
                return (
                  <td key={p.slug} className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-700 dark:text-stone-200">
                    {v === null ? '-' : (row.format ?? FR)(v)}
                  </td>
                )
              })}
            </tr>
          ))}

          {/* Stats rows with winner highlight */}
          {ROWS.map((row) => {
            const allZero = players.every((p) => (readNumeric(p, row.key) ?? 0) === 0)
            if (allZero) return null
            const best = winners.get(row.key) ?? 0
            return (
              <tr key={String(row.key)} className="border-b border-stone-100 dark:border-stone-50/5">
                <td className="px-4 py-2.5 text-zinc-600 dark:text-stone-400 text-xs uppercase tracking-wider font-mono">
                  {row.label}
                </td>
                {players.map((p) => {
                  const raw = readNumeric(p, row.key) ?? 0
                  const isBest = raw === best && players.length > 1
                  return (
                    <td
                      key={p.slug}
                      className={`px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap ${
                        isBest
                          ? 'text-turf-700 dark:text-turf-300 font-semibold'
                          : 'text-zinc-900 dark:text-stone-100'
                      }`}
                    >
                      {(row.format ?? FR)(raw)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
