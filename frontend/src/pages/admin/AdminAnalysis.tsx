import { useEffect, useMemo, useState } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChartBar,
  ChartLine,
  ChartScatter,
  CheckCircle,
  DownloadSimple,
  Eye,
  PencilSimpleLine,
  SoccerBall as PitchIcon,
  X as XIcon,
} from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import type { Player } from '../../types/player'
import type { AnalysisMetrics } from '../../types/analysis'
import Pitch from '../../components/Pitch'
import { type HeatmapGrid, heatmapFromPosition, isValidGrid } from '../../lib/heatmap'

type ChartTypeKey = 'scatter' | 'bar' | 'line'
type AxisAccept = 'numeric' | 'categorical' | 'both'
type AggregationKind = 'sum' | 'mean' | 'per_match'

const CATEGORY_PALETTE: Record<string, string> = {
  Gardien: '#a16207',
  Defenseur: '#1d4ed8',
  Milieu: '#0f5132',
  Attaquant: '#b91c1c',
  Autre: '#52525b',
}

interface ChartTypeDef {
  key: ChartTypeKey
  label: string
  icon: PhosphorIcon
  accept: [AxisAccept, AxisAccept]
  hint: string
}

const CHART_TYPES: ChartTypeDef[] = [
  { key: 'scatter', label: 'Nuage', icon: ChartScatter, accept: ['numeric', 'numeric'], hint: 'X numérique × Y numérique' },
  { key: 'bar',     label: 'Barres', icon: ChartBar,     accept: ['both', 'numeric'],    hint: 'X catégoriel ou par joueur × Y numérique' },
  { key: 'line',    label: 'Ligne',  icon: ChartLine,    accept: ['numeric', 'numeric'], hint: 'X numérique trié × Y numérique' },
]

type CsvRow = Record<string, unknown>

function downloadCsv(filename: string, rows: CsvRow[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface TooltipPayloadEntry {
  payload: Record<string, unknown> & { __name?: string; name?: string; club?: string }
  dataKey?: string | number
  name?: string
  value?: number | string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg bg-zinc-950 text-stone-100 px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-stone-50">{String(p.__name || p.name || '')}</div>
      {payload.map((entry, i) => (
        <div key={entry.dataKey ?? i} className="text-stone-300">
          <span className="text-stone-500">{entry.name}: </span>
          <span className="font-mono tabular-nums text-stone-100">
            {typeof entry.value === 'number' ? entry.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : entry.value}
          </span>
        </div>
      ))}
      {p.club && <div className="text-stone-500 mt-1">{String(p.club)}</div>}
    </div>
  )
}

interface PlayersResponse {
  data: Player[]
}

interface ChartRow {
  __name: string
  slug?: string
  category?: string
  club?: string | null
  x: string | number
  y: number
  count?: number
  color: string
}

type ViewKind = 'chart' | 'pitch'

function AdminAnalysis() {
  const [players, setPlayers] = useState<Player[]>([])
  const [metrics, setMetrics] = useState<AnalysisMetrics>({ numeric: [], categorical: [] })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewKind>('chart')

  const [chartType, setChartType] = useState<ChartTypeKey>('scatter')
  const [xKey, setXKey] = useState<string>('age')
  const [yKey, setYKey] = useState<string>('goals')
  const [colorBy, setColorBy] = useState<string>('category')
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous')
  const [aggregation, setAggregation] = useState<AggregationKind>('sum')
  const [topN, setTopN] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get<PlayersResponse>('/admin/players', { auth: true }),
      api.get<AnalysisMetrics>('/admin/analysis/metrics', { auth: true }),
    ]).then(([p, m]) => {
      if (cancelled) return
      setPlayers(p.data)
      setMetrics(m)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const numeric = metrics.numeric
  const categorical = metrics.categorical
  const isNumeric = (key: string) => numeric.some((m) => m.key === key)
  const isCategorical = (key: string) => categorical.some((m) => m.key === key) || key === '__player'

  const filteredPlayers = useMemo(() => {
    if (categoryFilter === 'Tous') return players
    return players.filter((p) => p.category === categoryFilter)
  }, [players, categoryFilter])

  const xLabel = useMemo(() => {
    if (xKey === '__player') return 'Joueur'
    return [...numeric, ...categorical].find((m) => m.key === xKey)?.label || xKey
  }, [xKey, numeric, categorical])
  const yLabel = useMemo(() => numeric.find((m) => m.key === yKey)?.label || yKey, [yKey, numeric])

  // Build chart dataset based on chartType + axes
  const chartData = useMemo<ChartRow[]>(() => {
    if (!filteredPlayers.length) return []

    const getField = (p: Player, key: string): unknown => (p as unknown as Record<string, unknown>)[key]

    if (chartType === 'scatter' || (chartType === 'line' && isNumeric(xKey))) {
      // Per-player points
      const rows: ChartRow[] = filteredPlayers.map((p) => ({
        __name: p.name,
        slug: p.slug,
        club: p.club,
        category: p.category,
        x: Number(getField(p, xKey)) || 0,
        y: Number(getField(p, yKey)) || 0,
        color: CATEGORY_PALETTE[String(getField(p, colorBy) ?? '')] || CATEGORY_PALETTE.Autre,
      }))
      if (chartType === 'line') {
        rows.sort((a, b) => Number(a.x) - Number(b.x))
      }
      return rows
    }

    if (chartType === 'bar' && xKey === '__player') {
      let rows: ChartRow[] = filteredPlayers.map((p) => ({
        __name: p.name,
        slug: p.slug,
        category: p.category,
        club: p.club,
        x: p.name,
        y: Number(getField(p, yKey)) || 0,
        color: CATEGORY_PALETTE[String(getField(p, colorBy) ?? '')] || CATEGORY_PALETTE.Autre,
      }))
      rows.sort((a, b) => b.y - a.y)
      if (topN > 0) rows = rows.slice(0, topN)
      return rows
    }

    if (chartType === 'bar' && isCategorical(xKey)) {
      // Aggregate by category
      const groups = new Map<string, number[]>()
      filteredPlayers.forEach((p) => {
        const key = String(getField(p, xKey) ?? 'Inconnu')
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(Number(getField(p, yKey)) || 0)
      })
      const rows: ChartRow[] = Array.from(groups.entries()).map(([key, values]) => {
        const sum = values.reduce((a, b) => a + b, 0)
        let value = sum
        if (aggregation === 'mean') value = sum / values.length
        if (aggregation === 'per_match') {
          const totalMatches = filteredPlayers
            .filter((p) => String(getField(p, xKey) ?? 'Inconnu') === key)
            .reduce((a, b) => a + (b.matches_played || 0), 0)
          value = totalMatches > 0 ? sum / totalMatches : 0
        }
        return {
          __name: key,
          x: key,
          y: Number.isFinite(value) ? Number(value.toFixed(2)) : 0,
          count: values.length,
          color: CATEGORY_PALETTE[key] || CATEGORY_PALETTE.Autre,
        }
      })
      rows.sort((a, b) => b.y - a.y)
      return rows
    }

    return []
  }, [filteredPlayers, chartType, xKey, yKey, colorBy, aggregation, topN])

  const xAxisAccept = CHART_TYPES.find((t) => t.key === chartType)?.accept[0]

  const xAxisOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = []
    if (xAxisAccept === 'numeric' || xAxisAccept === 'both') {
      opts.push(...numeric)
    }
    if (xAxisAccept === 'categorical' || xAxisAccept === 'both') {
      opts.push({ key: '__player', label: 'Par joueur (top)' })
      opts.push(...categorical)
    }
    return opts
  }, [xAxisAccept, numeric, categorical])

  // Adjust xKey when chart type changes if current xKey isn't valid
  useEffect(() => {
    if (!xAxisOptions.some((m) => m.key === xKey)) {
      setXKey(xAxisOptions[0]?.key || 'age')
    }
  }, [xAxisOptions, xKey])

  const exportCsv = () => {
    if (chartType === 'scatter' || chartType === 'line') {
      const rows = chartData.map((r) => ({
        joueur: r.__name,
        club: r.club,
        category: r.category,
        [xKey]: r.x,
        [yKey]: r.y,
      }))
      downloadCsv(`analyse-${xKey}-vs-${yKey}.csv`, rows)
    } else {
      const rows = chartData.map((r) => ({
        [xKey === '__player' ? 'joueur' : xKey]: r.x,
        [yKey]: r.y,
        n: r.count,
      }))
      downloadCsv(`analyse-${xKey}-${yKey}.csv`, rows)
    }
  }

  const updatePlayerLocal = (next: Player) => {
    setPlayers((prev) => prev.map((p) => (p.slug === next.slug ? next : p)))
  }

  return (
    <div className="px-6 lg:px-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="eyebrow">Data analyse</span>
          <h1 className="mt-2 font-display font-semibold text-3xl lg:text-4xl tracking-tight text-zinc-950 dark:text-stone-50">
            {view === 'chart' ? 'Builder de graphiques' : 'Heatmap terrain'}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-stone-400 max-w-prose">
            {view === 'chart'
              ? "Croisez n'importe quelles métriques de votre roster. Choisissez le type de graphique, les axes et exportez les données."
              : 'Visualisez et comparez les zones d’activité des joueurs sur un terrain. Activez l’édition pour peindre la carte cellule par cellule, ou régénérez-la depuis le poste.'}
          </p>
        </div>
        {view === 'chart' && (
          <button
            type="button"
            onClick={exportCsv}
            disabled={!chartData.length}
            className="btn btn-outline text-sm disabled:opacity-50"
          >
            <DownloadSimple size={14} weight="bold" /> Exporter CSV
          </button>
        )}
      </div>

      {/* View switch — graphiques vs terrain. */}
      <div className="inline-flex items-center gap-1 mb-8 rounded-full border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 p-1 shadow-diffusion">
        {([
          { key: 'chart' as const, label: 'Graphiques', Icon: ChartBar },
          { key: 'pitch' as const, label: 'Terrain',    Icon: PitchIcon },
        ]).map(({ key, label, Icon }) => {
          const active = view === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ease-premium ${
                active
                  ? 'text-stone-50 dark:text-zinc-950'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="analyse-view-pill"
                  className="absolute inset-0 rounded-full bg-zinc-950 dark:bg-stone-50"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative inline-flex items-center gap-2">
                <Icon size={14} weight={active ? 'duotone' : 'regular'} />
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-zinc-500 dark:text-stone-400 text-sm">Chargement des données…</div>
      ) : view === 'pitch' ? (
        <HeatmapView players={players} onPlayerSaved={updatePlayerLocal} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
          <aside className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-5 space-y-5 self-start sticky top-6">
            <div>
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-2">Type</div>
              <div className="grid grid-cols-3 gap-1.5">
                {CHART_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setChartType(t.key)}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-[0.7rem] border transition-colors ${
                      chartType === t.key
                        ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                        : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                    }`}
                    title={t.hint}
                  >
                    <t.icon size={18} weight={chartType === t.key ? 'duotone' : 'regular'} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1.5">Axe X</div>
              <select
                value={xKey}
                onChange={(e) => setXKey(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:focus:border-turf-300"
              >
                {xAxisOptions.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1.5">Axe Y</div>
              <select
                value={yKey}
                onChange={(e) => setYKey(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:focus:border-turf-300"
              >
                {numeric.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            {chartType === 'bar' && isCategorical(xKey) && xKey !== '__player' && (
              <div>
                <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1.5">Agrégation</div>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    { k: 'sum', l: 'Somme' },
                    { k: 'mean', l: 'Moyenne' },
                    { k: 'per_match', l: 'Par match' },
                  ] as { k: AggregationKind; l: string }[]).map(({ k, l }) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setAggregation(k)}
                      className={`px-2 py-1.5 rounded-md text-[0.7rem] border ${
                        aggregation === k
                          ? 'bg-turf-800 border-turf-800 text-stone-50'
                          : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chartType === 'bar' && xKey === '__player' && (
              <div>
                <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1.5">Top</div>
                <div className="flex flex-wrap gap-1">
                  {[0, 5, 10, 15].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTopN(n)}
                      className={`px-2.5 py-1.5 rounded-full text-[0.7rem] border ${
                        topN === n
                          ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                          : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                      }`}
                    >
                      {n === 0 ? 'Tous' : `Top ${n}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(chartType === 'scatter' || chartType === 'line') && (
              <div>
                <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1.5">Couleur par</div>
                <select
                  value={colorBy}
                  onChange={(e) => setColorBy(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:focus:border-turf-300"
                >
                  {categorical.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1.5">Filtre catégorie</div>
              <div className="flex flex-wrap gap-1">
                {['Tous', 'Gardien', 'Defenseur', 'Milieu', 'Attaquant'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoryFilter(c)}
                    className={`px-2.5 py-1 rounded-full text-[0.7rem] border ${
                      categoryFilter === c
                        ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                        : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="text-[0.65rem] mt-2 text-zinc-500 font-mono tabular-nums">
                {filteredPlayers.length} joueurs · {chartData.length} points
              </div>
            </div>
          </aside>

          <motion.div
            key={`${chartType}-${xKey}-${yKey}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-5"
          >
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">
                {yLabel} <span className="text-zinc-400 dark:text-stone-500 font-normal">vs</span> {xLabel}
              </h3>
            </div>

            <div className="h-[480px]">
              {chartData.length === 0 ? (
                <div className="grid place-items-center h-full text-zinc-500 dark:text-stone-400 text-sm">
                  Aucune donnée à afficher avec ces critères.
                </div>
              ) : chartType === 'scatter' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 8 }}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                    <XAxis
                      type="number" dataKey="x" name={xLabel}
                      tick={{ fill: '#52525b', fontSize: 11 }}
                      label={{ value: xLabel, position: 'insideBottom', offset: -16, fill: '#52525b', fontSize: 11 }}
                    />
                    <YAxis
                      type="number" dataKey="y" name={yLabel}
                      tick={{ fill: '#52525b', fontSize: 11 }}
                      label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 11 }}
                    />
                    <ZAxis range={[80, 80]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#a8a29e', strokeDasharray: '3 3' }} />
                    <Scatter data={chartData} fill="#0f5132">
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : chartType === 'line' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 32, left: 8 }}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                    <XAxis dataKey="x" tick={{ fill: '#52525b', fontSize: 11 }} label={{ value: xLabel, position: 'insideBottom', offset: -16, fill: '#52525b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 11 }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="y" name={yLabel} stroke="#0f5132" strokeWidth={2} dot={{ r: 3, fill: '#0f5132' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 24, bottom: 60, left: 8 }}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="x"
                      tick={{ fill: '#52525b', fontSize: 11 }}
                      angle={xKey === '__player' ? -32 : 0}
                      textAnchor={xKey === '__player' ? 'end' : 'middle'}
                      interval={0}
                      height={70}
                    />
                    <YAxis tick={{ fill: '#52525b', fontSize: 11 }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,81,50,0.06)' }} />
                    <Bar dataKey="y" name={yLabel} radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color || '#0f5132'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {(chartType === 'scatter' || chartType === 'line') && (
              <div className="mt-4 flex flex-wrap gap-3 items-center text-[0.7rem] text-zinc-600 dark:text-stone-300">
                <span className="font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400">Légende</span>
                {Object.entries(CATEGORY_PALETTE).filter(([k]) => k !== 'Autre').map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: v }} />
                    {k}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Heatmap view — pick 1 or 2 players, view side-by-side, paint when editing */
/* -------------------------------------------------------------------------- */

interface HeatmapViewProps {
  players: Player[]
  onPlayerSaved: (next: Player) => void
}

interface HeatmapSlotProps {
  label: string
  side: 'a' | 'b'
  players: Player[]
  selectedSlug: string
  onSelectSlug: (slug: string) => void
  editing: boolean
  onToggleEdit: () => void
  pendingGrid: HeatmapGrid | null
  onPendingChange: (grid: HeatmapGrid) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  justSaved: boolean
  removable?: boolean
  onRemove?: () => void
}

function HeatmapSlot({
  label,
  side,
  players,
  selectedSlug,
  onSelectSlug,
  editing,
  onToggleEdit,
  pendingGrid,
  onPendingChange,
  onSave,
  onCancel,
  saving,
  justSaved,
  removable = false,
  onRemove,
}: HeatmapSlotProps) {
  const player = useMemo(() => players.find((p) => p.slug === selectedSlug) ?? null, [players, selectedSlug])
  const baseGrid: HeatmapGrid | null = useMemo(() => {
    if (!player) return null
    if (isValidGrid(player.heatmap_grid)) return player.heatmap_grid
    return heatmapFromPosition(player.position ?? '', player.slug)
  }, [player])
  const grid = pendingGrid ?? baseGrid

  return (
    <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 p-5 flex flex-col">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="font-mono uppercase tracking-[0.18em] text-[0.6rem] text-zinc-400 dark:text-stone-500">
            Joueur {label}
          </div>
          <select
            value={selectedSlug}
            onChange={(e) => onSelectSlug(e.target.value)}
            disabled={editing}
            className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-950 dark:text-stone-50 dark:focus:border-turf-300 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            <option value="">— Sélectionner —</option>
            {players.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} · {p.position}
              </option>
            ))}
          </select>
          {player && (
            <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400 truncate">
              {player.club ?? '—'} · {player.category}
            </div>
          )}
        </div>
        {removable && onRemove && !editing && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Retirer ${label}`}
            className="grid place-items-center w-7 h-7 rounded-full text-zinc-400 hover:text-red-600 dark:hover:text-red-300 transition shrink-0"
          >
            <XIcon size={14} weight="bold" />
          </button>
        )}
      </header>

      {!player ? (
        <div className="grid place-items-center aspect-[3/2] rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/15 text-zinc-400 dark:text-stone-500 text-sm">
          Choisissez un joueur pour voir son terrain.
        </div>
      ) : (
        <Pitch
          mode={editing ? 'paint' : 'view'}
          grid={grid}
          position={player.position}
          slug={player.slug}
          onChange={editing ? onPendingChange : undefined}
        />
      )}

      {player && (
        <footer className="mt-4 flex items-center gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={onToggleEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-950 text-stone-50 hover:bg-zinc-800 dark:bg-stone-50 dark:text-zinc-950 dark:hover:bg-stone-200 transition-colors"
            >
              <PencilSimpleLine size={13} weight="bold" /> Éditer
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-turf-800 text-stone-50 hover:bg-turf-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40 transition-colors"
              >
                Annuler
              </button>
            </>
          )}
          <span className="ml-auto text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-400 dark:text-stone-500">
            {editing ? 'Mode édition' : 'Lecture'}
          </span>
          <AnimatePresence>
            {justSaved && (
              <motion.span
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1 text-[0.7rem] text-turf-700 dark:text-turf-300"
              >
                <CheckCircle size={12} weight="bold" /> Enregistré
              </motion.span>
            )}
          </AnimatePresence>
        </footer>
      )}
    </section>
  )
}

function HeatmapView({ players, onPlayerSaved }: HeatmapViewProps) {
  const [aSlug, setASlug] = useState<string>(players[0]?.slug ?? '')
  const [bSlug, setBSlug] = useState<string>('')
  const [editing, setEditing] = useState<'a' | 'b' | null>(null)
  const [pending, setPending] = useState<Record<string, HeatmapGrid>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startEdit = (side: 'a' | 'b', slug: string) => {
    if (!slug) return
    const player = players.find((p) => p.slug === slug)
    if (!player) return
    if (!pending[slug]) {
      const initial = isValidGrid(player.heatmap_grid)
        ? player.heatmap_grid
        : heatmapFromPosition(player.position ?? '', slug)
      setPending((p) => ({ ...p, [slug]: initial }))
    }
    setEditing(side)
  }

  const cancelEdit = (slug: string) => {
    setPending((p) => {
      const { [slug]: _drop, ...rest } = p
      return rest
    })
    setEditing(null)
  }

  const save = async (slug: string) => {
    const player = players.find((p) => p.slug === slug)
    const next = pending[slug]
    if (!player || !next) return
    setSaving(slug)
    setError(null)
    try {
      // Resend the full record so the controller's required-field validation passes.
      const { id: _id, created_at: _c, updated_at: _u, ...payload } = player as Player & { id?: number; created_at?: string; updated_at?: string }
      const res = await api.put<{ data: Player }>(`/admin/players/${slug}`, {
        ...payload,
        heatmap_grid: next,
      }, { auth: true })
      onPlayerSaved(res.data)
      setPending((p) => {
        const { [slug]: _drop, ...rest } = p
        return rest
      })
      setEditing(null)
      setSavedSlug(slug)
      setTimeout(() => setSavedSlug((s) => (s === slug ? null : s)), 2500)
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Enregistrement impossible.'
      setError(message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <HeatmapSlot
          label="A"
          side="a"
          players={players}
          selectedSlug={aSlug}
          onSelectSlug={(slug) => { if (editing !== 'a') setASlug(slug) }}
          editing={editing === 'a'}
          onToggleEdit={() => startEdit('a', aSlug)}
          pendingGrid={pending[aSlug] ?? null}
          onPendingChange={(g) => setPending((p) => ({ ...p, [aSlug]: g }))}
          onSave={() => save(aSlug)}
          onCancel={() => cancelEdit(aSlug)}
          saving={saving === aSlug}
          justSaved={savedSlug === aSlug}
        />

        {bSlug ? (
          <HeatmapSlot
            label="B"
            side="b"
            players={players}
            selectedSlug={bSlug}
            onSelectSlug={(slug) => { if (editing !== 'b') setBSlug(slug) }}
            editing={editing === 'b'}
            onToggleEdit={() => startEdit('b', bSlug)}
            pendingGrid={pending[bSlug] ?? null}
            onPendingChange={(g) => setPending((p) => ({ ...p, [bSlug]: g }))}
            onSave={() => save(bSlug)}
            onCancel={() => cancelEdit(bSlug)}
            saving={saving === bSlug}
            justSaved={savedSlug === bSlug}
            removable
            onRemove={() => { if (editing !== 'b') setBSlug('') }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setBSlug(players.find((p) => p.slug !== aSlug)?.slug ?? '')}
            className="grid place-items-center min-h-[280px] rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-50/15 text-zinc-500 dark:text-stone-400 hover:border-turf-400 dark:hover:border-turf-300 hover:text-zinc-900 dark:hover:text-stone-50 transition-colors"
          >
            <span className="inline-flex flex-col items-center gap-2">
              <Eye size={20} weight="duotone" />
              <span className="text-sm">Comparer avec un autre joueur</span>
            </span>
          </button>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  )
}

export default AdminAnalysis
