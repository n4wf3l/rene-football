import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Cake, ChartBar, ListBullets, Person, SoccerBall, Sparkle, Table as TableIcon, Trophy } from '@phosphor-icons/react'
import type { Player } from '../types/player'
import { useLocalStorageState } from '../hooks/useLocalStorageState'

/**
 * At-a-glance analytics for the whole roster.
 *
 * Two bands, both computed client-side from the players array — no extra
 * API calls, no imports required:
 *
 *   1. Leaderboards — top 5 per headline metric (goals, xG per 90, assists,
 *      pass accuracy). Each card scrolls if the roster grows.
 *   2. Distributions — histogram of ages, xG per 90 and potential ratings.
 *
 * Meant as the "landing" section of the Data Analyse > Graphiques tab: the
 * DS gets a global read of the squad before diving into the custom chart
 * builder below.
 */

interface Props {
  players: Player[]
}

interface LeaderboardEntry {
  slug: string
  name: string
  club: string | null
  photo_url: string | null
  value: number
}

interface HistogramBin {
  label: string
  count: number
}

/** Sample size cutoff for per-90 metrics — below that they're noisy. */
const MIN_MINUTES_FOR_PER90 = 270

function per90(player: Player, field: keyof Player): number {
  const raw = Number(player[field] ?? 0)
  const mins = Number(player.minutes_played ?? 0)
  if (mins < MIN_MINUTES_FOR_PER90) return 0
  return (raw / mins) * 90
}

function toEntry(p: Player, value: number): LeaderboardEntry {
  return { slug: p.slug, name: p.name, club: p.club ?? null, photo_url: p.photo_url ?? null, value }
}

function topBy(players: Player[], compute: (p: Player) => number, limit = 5): LeaderboardEntry[] {
  return players
    .map((p) => toEntry(p, compute(p)))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/** Simple binning helper for numeric distributions. */
function bin(values: number[], edges: number[], labels: string[]): HistogramBin[] {
  return edges.slice(0, -1).map((min, i) => {
    const max = edges[i + 1]
    const count = values.filter((v) => v >= min && (i === edges.length - 2 ? true : v < max)).length
    return { label: labels[i], count }
  })
}

export default function RosterOverview({ players }: Props) {
  const active = useMemo(
    () => players.filter((p) => Number(p.matches_played ?? 0) > 0),
    [players],
  )

  const leaderboards = useMemo(() => ({
    goals:     topBy(active, (p) => Number(p.goals ?? 0)),
    xgP90:     topBy(active, (p) => per90(p, 'xg')),
    assists:   topBy(active, (p) => Number(p.assists ?? 0)),
    passAcc:   topBy(active, (p) => Number(p.pass_accuracy ?? 0)),
  }), [active])

  const histograms = useMemo(() => ({
    ages: bin(
      players.map((p) => Number(p.age ?? 0)).filter((v) => v > 0),
      [16, 19, 22, 26, 30, 100],
      ['16-18', '19-21', '22-25', '26-29', '30+'],
    ),
    xgP90: bin(
      active.map((p) => per90(p, 'xg')).filter((v) => v > 0),
      [0, 0.2, 0.4, 0.6, 0.8, 1.0, 999],
      ['0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0', '1.0+'],
    ),
    potential: bin(
      players.map((p) => Number(p.potential_rating ?? 0)).filter((v) => v > 0),
      [0, 6, 7, 8, 9, 11],
      ['<6', '6-7', '7-8', '8-9', '9+'],
    ),
  }), [active, players])

  return (
    <section className="space-y-6">
      {/* Leaderboards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} weight="duotone" className="text-turf-700 dark:text-turf-300" />
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-600 dark:text-stone-300">
            Classements
          </h3>
          <span className="text-[0.65rem] font-mono text-zinc-500 dark:text-stone-500">
            · top 5 par métrique
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <LeaderboardCard id="goals"    title="Top buteurs"       unit="buts"  icon={SoccerBall} data={leaderboards.goals} />
          <LeaderboardCard id="xgP90"    title="Top xG / 90"       unit="xG"    icon={Sparkle}    data={leaderboards.xgP90}   decimals={2} hint="270+ min. requis" />
          <LeaderboardCard id="assists"  title="Top passes déc."   unit="P.D."  icon={Person}     data={leaderboards.assists} />
          <LeaderboardCard id="passAcc"  title="Top précision passes" unit="%"  icon={Person}     data={leaderboards.passAcc} decimals={1} />
        </div>
      </div>

      {/* Distributions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Cake size={14} weight="duotone" className="text-turf-700 dark:text-turf-300" />
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-600 dark:text-stone-300">
            Distributions du roster
          </h3>
          <span className="text-[0.65rem] font-mono text-zinc-500 dark:text-stone-500">
            · combien de joueurs par tranche
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HistogramCard id="ages"      title="Répartition des âges" data={histograms.ages}      color="#52996d" />
          <HistogramCard id="xgP90"     title="xG / 90 (actifs)"     data={histograms.xgP90}     color="#e11d48" />
          <HistogramCard id="potential" title="Potentiel scout"      data={histograms.potential} color="#d97706" />
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Leaderboard card ─────────────────────────── */

type LeaderboardMode = 'list' | 'table'

interface LeaderboardCardProps {
  /** Stable identifier used as the localStorage key so the user's chosen
   *  view mode sticks across sessions per widget. */
  id: string
  title: string
  unit: string
  data: LeaderboardEntry[]
  decimals?: number
  icon?: React.ComponentType<{ size?: number; weight?: 'regular' | 'duotone' | 'bold'; className?: string }>
  hint?: string
}

function LeaderboardCard({ id, title, unit, data, decimals = 0, icon: Icon, hint }: LeaderboardCardProps) {
  const [mode, setMode] = useLocalStorageState<LeaderboardMode>(`rene_widget_leaderboard_${id}`, 'list')
  const max = Math.max(...data.map((d) => d.value), 0.0001)
  return (
    <article className="rounded-2xl border border-stone-200/70 dark:border-stone-50/[0.06] bg-white dark:bg-zinc-900/60 overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-200/60 dark:border-stone-50/[0.05]">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={13} weight="duotone" className="text-turf-700 dark:text-turf-300" />}
          <div className="font-mono uppercase tracking-[0.14em] text-[0.62rem] text-zinc-700 dark:text-stone-200 truncate">
            {title}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hint && (
            <span className="hidden md:inline text-[0.6rem] font-mono text-zinc-500 dark:text-stone-500">{hint}</span>
          )}
          <ViewSwitcher
            options={[
              { value: 'list' as const,  icon: ListBullets, label: 'Liste' },
              { value: 'table' as const, icon: TableIcon,   label: 'Table' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>
      </header>
      {data.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-stone-500">
          Pas encore de données.
        </div>
      ) : mode === 'list' ? (
        <ol className="divide-y divide-stone-200/70 dark:divide-stone-50/[0.05]">
          {data.map((e, i) => {
            const pct = (e.value / max) * 100
            return (
              <li key={e.slug} className="relative">
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-turf-500/[0.08] dark:bg-turf-500/[0.12] pointer-events-none"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center gap-3 px-3 py-2">
                  <span className="w-5 shrink-0 text-[0.7rem] font-mono tabular-nums text-zinc-500 dark:text-stone-500">
                    {i + 1}
                  </span>
                  {e.photo_url ? (
                    <img src={e.photo_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-50/[0.06] shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.8rem] font-medium text-zinc-950 dark:text-stone-50 truncate">
                      {e.name}
                    </div>
                    {e.club && (
                      <div className="text-[0.65rem] text-zinc-500 dark:text-stone-500 truncate">
                        {e.club}
                      </div>
                    )}
                  </div>
                  <div className="text-[0.85rem] font-mono tabular-nums text-zinc-900 dark:text-stone-50">
                    {e.value.toFixed(decimals)}
                    <span className="ml-1 text-[0.6rem] text-zinc-500 dark:text-stone-500">{unit}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        // Table mode - denser, copy-friendly (double-click to select a cell).
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr className="text-left text-[0.6rem] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-stone-500 bg-stone-50/60 dark:bg-stone-50/[0.02]">
              <th className="px-3 py-2 w-6">#</th>
              <th className="px-3 py-2">Joueur</th>
              <th className="px-3 py-2 text-right">{unit}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/70 dark:divide-stone-50/[0.05]">
            {data.map((e, i) => (
              <tr key={e.slug} className="hover:bg-stone-50 dark:hover:bg-stone-50/[0.02]">
                <td className="px-3 py-1.5 text-zinc-500 dark:text-stone-500 font-mono tabular-nums">{i + 1}</td>
                <td className="px-3 py-1.5 text-zinc-900 dark:text-stone-100 truncate">{e.name}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums text-zinc-900 dark:text-stone-50">
                  {e.value.toFixed(decimals)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  )
}

/* ─────────────────────────── Histogram card ─────────────────────────── */

type HistogramMode = 'bars' | 'table'

interface HistogramCardProps {
  id: string
  title: string
  data: HistogramBin[]
  color?: string
}

function HistogramCard({ id, title, data, color = '#52996d' }: HistogramCardProps) {
  const [mode, setMode] = useLocalStorageState<HistogramMode>(`rene_widget_histogram_${id}`, 'bars')
  const nonEmpty = data.some((b) => b.count > 0)
  const total = data.reduce((s, b) => s + b.count, 0)
  return (
    <article className="rounded-2xl border border-stone-200/70 dark:border-stone-50/[0.06] bg-white dark:bg-zinc-900/60 overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-200/60 dark:border-stone-50/[0.05]">
        <div className="font-mono uppercase tracking-[0.14em] text-[0.62rem] text-zinc-700 dark:text-stone-200 truncate">
          {title}
        </div>
        <ViewSwitcher
          options={[
            { value: 'bars' as const,  icon: ChartBar,  label: 'Barres' },
            { value: 'table' as const, icon: TableIcon, label: 'Table' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </header>
      {!nonEmpty ? (
        <div className="h-40 grid place-items-center">
          <EmptyChart>Pas encore de données</EmptyChart>
        </div>
      ) : mode === 'bars' ? (
        <div className="h-40 px-2 pt-4 pb-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor', fillOpacity: 0.55 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'currentColor', fillOpacity: 0.55 }} tickLine={false} axisLine={false} allowDecimals={false} width={22} />
              <Tooltip
                cursor={{ fill: 'currentColor', fillOpacity: 0.06 }}
                contentStyle={{ background: 'rgba(24, 24, 27, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
                itemStyle={{ color: '#fafafa' }}
                formatter={(v: number) => [`${v} joueur${v > 1 ? 's' : ''}`, '']}
              />
              <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr className="text-left text-[0.6rem] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-stone-500 bg-stone-50/60 dark:bg-stone-50/[0.02]">
              <th className="px-3 py-2">Tranche</th>
              <th className="px-3 py-2 text-right">Joueurs</th>
              <th className="px-3 py-2 text-right w-14">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/70 dark:divide-stone-50/[0.05]">
            {data.map((b) => {
              const pct = total > 0 ? Math.round((b.count / total) * 100) : 0
              return (
                <tr key={b.label} className="hover:bg-stone-50 dark:hover:bg-stone-50/[0.02]">
                  <td className="px-3 py-1.5 text-zinc-900 dark:text-stone-100">{b.label}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-zinc-900 dark:text-stone-50">{b.count}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-zinc-500 dark:text-stone-500">{pct}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </article>
  )
}

function EmptyChart({ children }: { children: ReactNode }) {
  return (
    <div className="w-full h-full grid place-items-center text-xs text-zinc-500 dark:text-stone-500">
      {children}
    </div>
  )
}

/* ─────────────────────────── ViewSwitcher ─────────────────────────── */

interface ViewSwitcherOption<T extends string> {
  value: T
  label: string
  icon: React.ComponentType<{ size?: number; weight?: 'regular' | 'duotone' | 'bold' }>
}

interface ViewSwitcherProps<T extends string> {
  options: ViewSwitcherOption<T>[]
  value: T
  onChange: (v: T) => void
}

/** Compact icon-only segmented control used inside widget headers to
 *  switch between alternate renderings (list / table, bars / table…).
 *  The label ships as a `title` tooltip so the button stays small. */
function ViewSwitcher<T extends string>({ options, value, onChange }: ViewSwitcherProps<T>) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-stone-300/70 dark:border-stone-50/[0.08] p-0.5">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.label}
            aria-pressed={active}
            className={`grid place-items-center w-6 h-6 rounded-full transition ${
              active
                ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-stone-500 dark:hover:text-stone-100'
            }`}
          >
            <o.icon size={11} weight={active ? 'bold' : 'regular'} />
          </button>
        )
      })}
    </div>
  )
}
