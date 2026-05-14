import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
  FilmSlate,
  PencilSimpleLine,
  SoccerBall as PitchIcon,
  UsersThree,
  WarningCircle as WarningCircleIcon,
  X as XIcon,
} from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import type { Player } from '../../types/player'
import type { AnalysisMetrics } from '../../types/analysis'
import type { Appearance } from '../../types/appearance'
import Pitch from '../../components/Pitch'
import Skeleton from '../../components/Skeleton'
import PlayerRadar from '../../components/PlayerRadar'
import PlayerComparisonTable from '../../components/PlayerComparisonTable'
import PlayerMultiSelect from '../../components/PlayerMultiSelect'
import PlayerSingleSelect from '../../components/PlayerSingleSelect'
import ClipsGalleryAdmin from '../../components/ClipsGalleryAdmin'
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

/** Optgroup order rendered in the metric <select> — keeps scouting metrics
 *  together and visually distinct from raw stats. */
const METRIC_GROUPS: { key: string; label: string }[] = [
  { key: 'stats',     label: 'Statistiques' },
  { key: 'tracking',  label: 'Tracking physique' },
  { key: 'scouting',  label: 'Scouting' },
  { key: 'identite',  label: 'Identité' },
]

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
  payload: Record<string, unknown> & {
    __name?: string
    name?: string
    club?: string | null
    position?: string | null
    photo_url?: string | null
    category?: string | null
    color?: string
  }
  dataKey?: string | number
  name?: string
  value?: number | string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  xLabel?: string
  yLabel?: string
}

function initialsOf(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function CustomTooltip({ active, payload, xLabel, yLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const name = String(p.__name || p.name || '')
  const photo = p.photo_url ? String(p.photo_url) : null
  const accent = String(p.color || '#0f5132')
  const subtitle = [p.position, p.club].filter(Boolean).join(' · ')

  return (
    <div className="rounded-xl bg-zinc-950/95 backdrop-blur border border-stone-50/10 text-stone-100 px-3 py-2.5 text-xs shadow-xl min-w-[200px]">
      <div className="flex items-center gap-2.5">
        {photo ? (
          <img src={photo} alt="" className="w-9 h-9 rounded-full object-cover border border-stone-50/10" />
        ) : (
          <div
            className="grid place-items-center w-9 h-9 rounded-full text-[0.7rem] font-medium border border-stone-50/10"
            style={{ background: 'rgba(255,255,255,0.04)', color: accent }}
          >
            {initialsOf(name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-stone-50 truncate">{name}</div>
          {subtitle && <div className="text-[0.68rem] text-stone-400 truncate">{subtitle}</div>}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-stone-50/10 space-y-0.5">
        {payload
          .filter((entry) => entry.name !== 'z' && entry.dataKey !== 'z' && entry.value !== undefined)
          .map((entry, i) => {
            const label = entry.dataKey === 'x' ? xLabel : entry.dataKey === 'y' ? yLabel : entry.name
            return (
              <div key={entry.dataKey ?? i} className="flex items-baseline justify-between gap-3">
                <span className="text-stone-400">{label}</span>
                <span className="font-mono tabular-nums text-stone-50">
                  {typeof entry.value === 'number' ? entry.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : entry.value}
                </span>
              </div>
            )
          })}
      </div>
      {p.slug ? (
        <div className="mt-2 pt-2 border-t border-stone-50/10 text-[0.62rem] font-mono uppercase tracking-[0.1em] text-turf-300">
          Cliquez pour ouvrir la fiche →
        </div>
      ) : null}
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
  position?: string | null
  photo_url?: string | null
  x: string | number
  y: number
  count?: number
  color: string
  /** Marked true for the 2-3 points furthest from the centroid — used to draw inline labels. */
  outlier?: boolean
}

type ViewKind = 'chart' | 'pitch' | 'compare' | 'clips' | 'evolution'

/** Format a numeric value applying the per-90 transformation when applicable.
 *  Returns 0 (rather than NaN) for players without minutes — avoids ugly chart points. */
function readNumeric(p: Player, key: string, opts: { per90: boolean; per90able: boolean }): number {
  const raw = Number((p as unknown as Record<string, unknown>)[key]) || 0
  if (!opts.per90 || !opts.per90able) return raw
  const mins = Number((p as unknown as Record<string, unknown>).minutes_played) || 0
  if (mins <= 0) return 0
  return raw * 90 / mins
}

/** Detect when a metric should be treated as "non renseigné" rather than a true zero.
 *
 *  Rules :
 *  - Per-match football stats (goals, xg, tackles, …) → missing if `matches_played === 0`.
 *    A field player with 0 matches has 0 buts because nothing has been entered, NOT because
 *    they scored 0 — plotting them at the origin would lie about the roster.
 *  - Scouting scores (`score_*`, completeness_pct, …) → missing if value is null/undefined.
 *  - Identity / categorical fields → missing if null, undefined or empty string.
 *  - "matches_played" and "minutes_played" themselves are never considered missing
 *    (0 is a legitimate value — the player exists but hasn't played).
 */
function isMetricMissing(p: Player, key: string, perMatchKeys: Set<string>, scoutingKeys: Set<string>): boolean {
  const v = (p as unknown as Record<string, unknown>)[key]
  if (key === 'matches_played' || key === 'minutes_played' || key === 'age') return false
  if (scoutingKeys.has(key)) return v === null || v === undefined
  if (perMatchKeys.has(key)) return (Number(p.matches_played) || 0) === 0
  // Categorical / catch-all
  return v === null || v === undefined || v === ''
}

function AdminAnalysis() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [metrics, setMetrics] = useState<AnalysisMetrics>({ numeric: [], categorical: [] })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewKind>('chart')

  const [comparisonSlugs, setComparisonSlugs] = useState<string[]>([])
  const [clipsTargetSlug, setClipsTargetSlug] = useState<string | null>(null)
  const [evolutionSlug, setEvolutionSlug] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartTypeKey>('scatter')
  const [xKey, setXKey] = useState<string>('age')
  const [yKey, setYKey] = useState<string>('goals')
  const [colorBy, setColorBy] = useState<string>('category')
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous')
  const [aggregation, setAggregation] = useState<AggregationKind>('sum')
  const [topN, setTopN] = useState(0)
  const [per90, setPer90] = useState(false)
  const [excludeMissing, setExcludeMissing] = useState(true)

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

  /** Lookup helper — returns the per-90 status of a numeric metric (so the readNumeric
   *  call can decide to divide, and the axis label can append " / 90'"). */
  const per90able = (key: string) => Boolean(numeric.find((m) => m.key === key)?.per90)
  const decorate = (key: string, base: string) => (per90 && per90able(key)) ? `${base} / 90'` : base

  /** Pre-computed sets used by isMetricMissing — keep allocation outside the player loop. */
  const perMatchKeys = useMemo(() => new Set(numeric.filter((m) => m.per90).map((m) => m.key)), [numeric])
  const scoutingKeys = useMemo(() => new Set(numeric.filter((m) => m.group === 'scouting').map((m) => m.key)), [numeric])

  /** Count how many players are excluded by the current X/Y selection.
   *  Recomputes when filter inputs change so the banner updates live. */
  const missingCount = useMemo(() => {
    if (!filteredPlayers.length) return 0
    const yMissing = (p: Player) => isMetricMissing(p, yKey, perMatchKeys, scoutingKeys)
    const xMissing = (p: Player) => xKey === '__player' || !isNumeric(xKey)
      ? false
      : isMetricMissing(p, xKey, perMatchKeys, scoutingKeys)
    return filteredPlayers.filter((p) => xMissing(p) || yMissing(p)).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPlayers, xKey, yKey, chartType, perMatchKeys, scoutingKeys])

  const xLabel = useMemo(() => {
    if (xKey === '__player') return 'Joueur'
    const m = [...numeric, ...categorical].find((mm) => mm.key === xKey)
    return m ? decorate(xKey, m.label) : xKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xKey, numeric, categorical, per90])
  const yLabel = useMemo(() => {
    const m = numeric.find((mm) => mm.key === yKey)
    return m ? decorate(yKey, m.label) : yKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yKey, numeric, per90])

  // Build chart dataset based on chartType + axes
  const chartData = useMemo<ChartRow[]>(() => {
    if (!filteredPlayers.length) return []

    const getField = (p: Player, key: string): unknown => (p as unknown as Record<string, unknown>)[key]
    const numX = (p: Player) => readNumeric(p, xKey, { per90, per90able: per90able(xKey) })
    const numY = (p: Player) => readNumeric(p, yKey, { per90, per90able: per90able(yKey) })

    if (chartType === 'scatter' || (chartType === 'line' && isNumeric(xKey))) {
      // Filter out players where either axis is "non renseigné" — otherwise they'd
      // anchor at (0,0) and visually pollute the cloud. The banner above the chart
      // tells the user how many were dropped + a toggle re-includes them.
      const source = excludeMissing
        ? filteredPlayers.filter((p) =>
            !isMetricMissing(p, xKey, perMatchKeys, scoutingKeys) &&
            !isMetricMissing(p, yKey, perMatchKeys, scoutingKeys))
        : filteredPlayers
      // Per-player points — enriched with photo/position so the tooltip can identify each dot.
      const rows: ChartRow[] = source.map((p) => ({
        __name: p.name,
        slug: p.slug,
        club: p.club,
        category: p.category,
        position: p.position,
        photo_url: p.photo_url,
        x: Number(numX(p).toFixed(2)),
        y: Number(numY(p).toFixed(2)),
        color: CATEGORY_PALETTE[String(getField(p, colorBy) ?? '')] || CATEGORY_PALETTE.Autre,
      }))
      if (chartType === 'line') {
        rows.sort((a, b) => Number(a.x) - Number(b.x))
      }
      // Mark the 3 furthest points from the centroid as outliers — these get inline labels
      // so the user spots the "stories" of the chart without having to hover every dot.
      if (chartType === 'scatter' && rows.length >= 4) {
        const meanX = rows.reduce((acc, r) => acc + Number(r.x), 0) / rows.length
        const meanY = rows.reduce((acc, r) => acc + Number(r.y), 0) / rows.length
        const spanX = Math.max(1, Math.max(...rows.map((r) => Number(r.x))) - Math.min(...rows.map((r) => Number(r.x))))
        const spanY = Math.max(1, Math.max(...rows.map((r) => Number(r.y))) - Math.min(...rows.map((r) => Number(r.y))))
        const withDist = rows.map((r) => {
          const dx = (Number(r.x) - meanX) / spanX
          const dy = (Number(r.y) - meanY) / spanY
          return { row: r, dist: Math.hypot(dx, dy) }
        })
        withDist.sort((a, b) => b.dist - a.dist)
        const outlierSet = new Set(withDist.slice(0, 3).map((w) => w.row))
        rows.forEach((r) => { if (outlierSet.has(r)) r.outlier = true })
      }
      return rows
    }

    if (chartType === 'bar' && xKey === '__player') {
      // Same missing-metric exclusion for per-player bars — keeps the top-N honest.
      const source = excludeMissing
        ? filteredPlayers.filter((p) => !isMetricMissing(p, yKey, perMatchKeys, scoutingKeys))
        : filteredPlayers
      let rows: ChartRow[] = source.map((p) => ({
        __name: p.name,
        slug: p.slug,
        category: p.category,
        position: p.position,
        photo_url: p.photo_url,
        club: p.club,
        x: p.name,
        y: Number(numY(p).toFixed(2)),
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
        groups.get(key)!.push(numY(p))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPlayers, chartType, xKey, yKey, colorBy, aggregation, topN, per90, excludeMissing, perMatchKeys, scoutingKeys])

  const xAxisAccept = CHART_TYPES.find((t) => t.key === chartType)?.accept[0]

  const xAxisOptions = useMemo(() => {
    const opts: { key: string; label: string; group?: string }[] = []
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
            {view === 'chart' ? 'Builder de graphiques'
              : view === 'evolution' ? 'Évolution match par match'
              : view === 'pitch' ? 'Heatmap terrain'
              : view === 'compare' ? 'Comparaison de joueurs'
              : 'Moments clés annotés'}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-stone-400 max-w-prose">
            {view === 'chart'
              ? "Croisez n'importe quelles métriques de votre roster. Bascule par 90 minutes, métriques scouting et étiquetage automatique des outliers."
              : view === 'evolution'
              ? 'Visualisez la dynamique d’un joueur match par match : note, buts, xG, minutes — avec moyenne glissante 5 matchs.'
              : view === 'pitch'
              ? 'Visualisez et comparez les zones d’activité des joueurs sur un terrain. Activez l’édition pour peindre la carte cellule par cellule, ou régénérez-la depuis le poste.'
              : view === 'compare'
              ? 'Sélectionnez 2 à 4 joueurs pour superposer leurs profils sur un radar et comparer toutes leurs métriques côte à côte.'
              : 'Importez une vidéo locale, mettez-la en pause sur un instant clé, dessinez vos annotations et stockez uniquement la frame finale. Les vidéos sources ne sont jamais envoyées au serveur.'}
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
          { key: 'chart' as const,     label: 'Graphiques',   Icon: ChartBar },
          { key: 'evolution' as const, label: 'Évolution',    Icon: ChartLine },
          { key: 'pitch' as const,     label: 'Terrain',      Icon: PitchIcon },
          { key: 'compare' as const,   label: 'Comparaison',  Icon: UsersThree },
          { key: 'clips' as const,     label: 'Moments clés', Icon: FilmSlate },
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
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
          {/* Left filters skeleton */}
          <aside className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-5 space-y-5">
            <div>
              <Skeleton className="h-3 w-12 mb-3" />
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" rounded="lg" />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full" rounded="lg" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full" rounded="lg" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" rounded="lg" />
            </div>
          </aside>
          {/* Chart skeleton */}
          <div className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-[420px] w-full" rounded="xl" />
          </div>
        </div>
      ) : view === 'evolution' ? (
        <EvolutionView
          players={players}
          selectedSlug={evolutionSlug}
          onChangeSlug={setEvolutionSlug}
        />
      ) : view === 'pitch' ? (
        <HeatmapView players={players} onPlayerSaved={updatePlayerLocal} />
      ) : view === 'compare' ? (
        <ComparisonView
          players={players}
          selectedSlugs={comparisonSlugs}
          onChangeSlugs={setComparisonSlugs}
        />
      ) : view === 'clips' ? (
        <ClipsView
          players={players}
          selectedSlug={clipsTargetSlug}
          onChangeSlug={setClipsTargetSlug}
        />
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
                {/* Mix of categorical and numeric: render special entries first, then grouped numerics. */}
                {xAxisOptions.filter((m) => !m.group).map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
                {METRIC_GROUPS.map((g) => {
                  const items = xAxisOptions.filter((m) => m.group === g.key)
                  if (items.length === 0) return null
                  return (
                    <optgroup key={g.key} label={g.label}>
                      {items.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </optgroup>
                  )
                })}
              </select>
            </div>

            <div>
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1.5">Axe Y</div>
              <select
                value={yKey}
                onChange={(e) => setYKey(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:focus:border-turf-300"
              >
                {METRIC_GROUPS.map((g) => {
                  const items = numeric.filter((m) => (m.group || 'stats') === g.key)
                  if (items.length === 0) return null
                  return (
                    <optgroup key={g.key} label={g.label}>
                      {items.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </optgroup>
                  )
                })}
              </select>
            </div>

            {/* Per-90 toggle — only meaningful when at least one of X/Y supports it. */}
            {(per90able(xKey) || per90able(yKey)) && (
              <div>
                <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1.5">Normalisation</div>
                <div className="inline-flex items-center gap-0.5 rounded-full border border-stone-300 dark:border-stone-50/15 p-0.5 text-[0.72rem] w-full">
                  {([
                    { k: false, l: 'Brut' },
                    { k: true,  l: 'Par 90 min' },
                  ]).map(({ k, l }) => (
                    <button
                      key={String(k)}
                      type="button"
                      onClick={() => setPer90(k)}
                      className={`flex-1 px-2.5 py-1 rounded-full font-medium transition ${
                        per90 === k
                          ? 'bg-turf-700 text-stone-50'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100'
                      }`}
                      title={k
                        ? 'Divise par minutes_played / 90 — seul ce qui en bénéficie (buts, xG, tacles…) est transformé.'
                        : 'Affiche les totaux saison bruts.'}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 text-[0.65rem] text-zinc-500 dark:text-stone-400">
                  Seules les métriques compatibles sont transformées.
                </div>
              </div>
            )}

            {/* Missing-data control — only meaningful for per-player charts (scatter or bar-by-player). */}
            {(chartType === 'scatter' || (chartType === 'bar' && xKey === '__player')) && (
              <div>
                <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-1.5">Données manquantes</div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={excludeMissing}
                    onChange={(e) => setExcludeMissing(e.target.checked)}
                    className="w-4 h-4 accent-turf-700"
                  />
                  <span className="text-[0.78rem] text-zinc-700 dark:text-stone-200">
                    Exclure les profils sans donnée
                  </span>
                </label>
                <div className="mt-1.5 text-[0.65rem] text-zinc-500 dark:text-stone-400 leading-relaxed">
                  Évite que des joueurs sans match enregistré s'affichent à zéro et faussent la lecture.
                </div>
              </div>
            )}

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

            {/* Banner — surfaces players excluded due to missing data so the analyst knows
                the cloud reflects a subset, not the full roster. */}
            {(chartType === 'scatter' || (chartType === 'bar' && xKey === '__player')) && missingCount > 0 && (
              <div className="mb-4 rounded-xl border border-amber-200/70 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-500/[0.08] px-3 py-2 flex items-start gap-2.5">
                <WarningCircleIcon size={14} weight="duotone" className="text-amber-600 dark:text-amber-300 mt-[2px] shrink-0" />
                <div className="flex-1 min-w-0 text-[0.78rem] text-amber-900 dark:text-amber-100">
                  <span className="font-medium">
                    {missingCount} joueur{missingCount > 1 ? 's' : ''}
                  </span>{' '}
                  <span className="text-amber-800 dark:text-amber-200/80">
                    {excludeMissing ? 'exclu' : 'inclus'}{missingCount > 1 ? 's' : ''} — métrique non renseignée.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExcludeMissing((v) => !v)}
                  className="text-[0.7rem] font-mono uppercase tracking-[0.1em] text-amber-700 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-50 transition shrink-0"
                >
                  {excludeMissing ? 'Inclure' : 'Exclure'}
                </button>
              </div>
            )}

            <div className="h-[480px]">
              {chartData.length === 0 ? (
                <div className="grid place-items-center h-full text-zinc-500 dark:text-stone-400 text-sm">
                  Aucune donnée à afficher avec ces critères.
                </div>
              ) : chartType === 'scatter' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 24, right: 32, bottom: 36, left: 8 }}>
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
                    <Tooltip
                      content={<CustomTooltip xLabel={xLabel} yLabel={yLabel} />}
                      cursor={{ stroke: '#a8a29e', strokeDasharray: '3 3' }}
                    />
                    <Scatter
                      data={chartData}
                      fill="#0f5132"
                      style={{ cursor: 'pointer' }}
                      onClick={(point: { payload?: ChartRow } | ChartRow) => {
                        // Recharts may pass either the raw row or { payload: row }; handle both.
                        const slug = (point as { payload?: ChartRow })?.payload?.slug ?? (point as ChartRow)?.slug
                        if (slug) navigate(`/admin/joueurs/${slug}/edit`)
                      }}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="__name"
                        position="top"
                        content={(props: unknown) => {
                          const { x, y, value, index } = props as { x: number; y: number; value: string; index: number }
                          const row = chartData[index]
                          if (!row?.outlier || typeof x !== 'number' || typeof y !== 'number') return null
                          // Show only the last name to keep the chart readable.
                          const parts = String(value || '').trim().split(/\s+/)
                          const display = parts.length > 1 ? parts[parts.length - 1] : parts[0]
                          return (
                            <text
                              x={x}
                              y={y - 8}
                              textAnchor="middle"
                              className="fill-zinc-700 dark:fill-stone-200"
                              style={{ fontSize: 10.5, fontWeight: 500, pointerEvents: 'none' }}
                            >
                              {display}
                            </text>
                          )
                        }}
                      />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : chartType === 'line' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 32, left: 8 }}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                    <XAxis dataKey="x" tick={{ fill: '#52525b', fontSize: 11 }} label={{ value: xLabel, position: 'insideBottom', offset: -16, fill: '#52525b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 11 }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip xLabel={xLabel} yLabel={yLabel} />} />
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
                    <Tooltip content={<CustomTooltip xLabel={xLabel} yLabel={yLabel} />} cursor={{ fill: 'rgba(15,81,50,0.06)' }} />
                    <Bar
                      dataKey="y"
                      name={yLabel}
                      radius={[6, 6, 0, 0]}
                      style={xKey === '__player' ? { cursor: 'pointer' } : undefined}
                      onClick={(point: { payload?: ChartRow } | ChartRow) => {
                        if (xKey !== '__player') return
                        const slug = (point as { payload?: ChartRow })?.payload?.slug ?? (point as ChartRow)?.slug
                        if (slug) navigate(`/admin/joueurs/${slug}/edit`)
                      }}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color || '#0f5132'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {(chartType === 'scatter' || chartType === 'line' || (chartType === 'bar' && xKey === '__player')) && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 items-center text-[0.7rem] text-zinc-600 dark:text-stone-300">
                <span className="font-mono uppercase tracking-[0.12em] text-zinc-500 dark:text-stone-400">Légende</span>
                {Object.entries(CATEGORY_PALETTE).filter(([k]) => k !== 'Autre').map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: v }} />
                    {k}
                  </span>
                ))}
                <span className="ml-auto text-[0.65rem] font-mono uppercase tracking-[0.1em] text-turf-700 dark:text-turf-300">
                  Cliquez sur un point pour ouvrir la fiche →
                </span>
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

/* ─────────────────────────── ComparisonView ─────────────────────────── */

interface ComparisonViewProps {
  players: Player[]
  selectedSlugs: string[]
  onChangeSlugs: (slugs: string[]) => void
}

function ComparisonView({ players, selectedSlugs, onChangeSlugs }: ComparisonViewProps) {
  // Maintain selection order (= color order in radar/table). We resolve slugs → players
  // in the same order the user picked them.
  const selectedPlayers = useMemo(
    () =>
      selectedSlugs
        .map((s) => players.find((p) => p.slug === s))
        .filter((p): p is Player => Boolean(p)),
    [selectedSlugs, players],
  )

  /* Exports the selected players' headline metrics as CSV.
     Mirrors the columns shown in the comparison table so the file is a 1:1
     printable version of the on-screen view. */
  const exportComparisonCsv = () => {
    if (!selectedPlayers.length) return
    const cols = [
      'name', 'position', 'category', 'club', 'nationality', 'age', 'height',
      'matches_played', 'minutes_played',
      'goals', 'assists', 'xg', 'xa',
      'shots', 'shots_on_target', 'key_passes', 'pass_accuracy',
      'dribbles_completed', 'tackles', 'interceptions', 'duels_won',
      'clean_sheets', 'saves', 'yellow_cards', 'red_cards',
      'potential_rating', 'potential_label',
    ] as const
    const rows = selectedPlayers.map((p) => {
      const row: Record<string, unknown> = {}
      cols.forEach((c) => { row[c] = p[c as keyof Player] ?? '' })
      return row
    })
    downloadCsv(`rene-football-comparaison-${selectedPlayers.map((p) => p.slug).join('-')}.csv`, rows)
  }

  return (
    <div className="space-y-8">
      {/* Picker */}
      <section className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400">
            Sélection
          </div>
          {selectedPlayers.length >= 2 && (
            <button
              type="button"
              onClick={exportComparisonCsv}
              className="btn btn-outline text-xs py-1.5"
            >
              <DownloadSimple size={13} weight="bold" />
              Exporter CSV
            </button>
          )}
        </div>
        <PlayerMultiSelect
          players={players}
          selectedSlugs={selectedSlugs}
          onChange={onChangeSlugs}
          max={4}
        />
      </section>

      {/* Empty state when not enough players selected */}
      {selectedPlayers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/10 bg-white/40 dark:bg-zinc-900/30 px-6 py-16 text-center">
          <UsersThree size={28} weight="duotone" className="mx-auto text-zinc-400 dark:text-stone-500" />
          <p className="mt-4 text-sm text-zinc-600 dark:text-stone-400">
            Choisissez au moins deux joueurs ci-dessus pour démarrer la comparaison.
          </p>
        </div>
      )}

      {selectedPlayers.length === 1 && (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/10 bg-white/40 dark:bg-zinc-900/30 px-6 py-16 text-center">
          <p className="text-sm text-zinc-600 dark:text-stone-400">
            Encore <span className="font-medium text-zinc-900 dark:text-stone-100">un joueur</span> à sélectionner pour comparer.
          </p>
        </div>
      )}

      {selectedPlayers.length >= 2 && (
        <>
          {/* Radar + headline metrics side-by-side */}
          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-6">
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-2">
                Radar
              </div>
              <h3 className="font-display font-medium text-lg text-zinc-950 dark:text-stone-50 mb-4">
                Empreinte statistique
              </h3>
              <div className="flex justify-center">
                <PlayerRadar players={selectedPlayers} size={420} />
              </div>
              <p className="mt-4 text-[0.7rem] text-zinc-500 dark:text-stone-500 text-center">
                Axes choisis selon le poste de <span className="font-medium">{selectedPlayers[0].name}</span> ({selectedPlayers[0].category}).
              </p>
            </div>

            {/* Quick KPIs */}
            <div className="space-y-3 self-start">
              {selectedPlayers.map((p, i) => {
                const isKeeper = p.category === 'Gardien'
                return (
                  <article
                    key={p.slug}
                    className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${['bg-turf-500','bg-rose-600','bg-amber-600','bg-sky-600'][i]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-medium text-zinc-950 dark:text-stone-50 truncate">{p.name}</div>
                        <div className="text-[0.65rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
                          {p.position} · {p.club ?? '—'}
                        </div>
                      </div>
                    </div>
                    <dl className="grid grid-cols-3 gap-3 border-t border-stone-200 dark:border-stone-50/8 pt-3">
                      <div>
                        <dt className="text-[0.6rem] uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-500">Matchs</dt>
                        <dd className="font-mono text-base tabular-nums text-zinc-950 dark:text-stone-50">{p.matches_played}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-500">{isKeeper ? 'Cl. sh.' : 'Buts'}</dt>
                        <dd className="font-mono text-base tabular-nums text-zinc-950 dark:text-stone-50">{isKeeper ? p.clean_sheets : p.goals}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-500">{isKeeper ? 'Arrêts' : 'P. déc.'}</dt>
                        <dd className="font-mono text-base tabular-nums text-zinc-950 dark:text-stone-50">{isKeeper ? p.saves : p.assists}</dd>
                      </div>
                    </dl>
                  </article>
                )
              })}
            </div>
          </section>

          {/* Full comparison table */}
          <section>
            <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-3">
              Toutes les métriques
            </div>
            <PlayerComparisonTable players={selectedPlayers} />
            <p className="mt-3 text-[0.7rem] text-zinc-500 dark:text-stone-500">
              La meilleure valeur sur chaque ligne est mise en évidence en <span className="text-turf-700 dark:text-turf-300 font-medium">turf</span>.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────── ClipsView ─────────────────────────── */

interface ClipsViewProps {
  players: Player[]
  selectedSlug: string | null
  onChangeSlug: (slug: string | null) => void
}

function ClipsView({ players, selectedSlug, onChangeSlug }: ClipsViewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-5 lg:p-6">
        <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-3">
          Joueur cible
        </div>
        <PlayerSingleSelect
          players={players}
          selectedSlug={selectedSlug}
          onChange={onChangeSlug}
          placeholder="Choisir le joueur dont on annote les moments…"
        />
      </section>

      {!selectedSlug ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/10 bg-white/40 dark:bg-zinc-900/30 px-6 py-16 text-center">
          <FilmSlate size={28} weight="duotone" className="mx-auto text-zinc-400 dark:text-stone-500" />
          <p className="mt-4 text-sm text-zinc-600 dark:text-stone-400">
            Sélectionnez un joueur ci-dessus pour ouvrir sa galerie de moments
            et en ajouter de nouveaux.
          </p>
        </div>
      ) : (
        <section className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-5 lg:p-6">
          <ClipsGalleryAdmin playerSlug={selectedSlug} />
        </section>
      )}
    </div>
  )
}

/* ─────────────────────────── EvolutionView ───────────────────────────
   Per-match time series for one player, fed by /admin/players/{slug}/appearances.
   Adds a rolling 5-match average so the user reads "form" rather than noise.
-------------------------------------------------------------------------- */

interface EvolutionViewProps {
  players: Player[]
  selectedSlug: string | null
  onChangeSlug: (slug: string | null) => void
}

type EvolutionMetricKey = 'rating' | 'goals' | 'assists' | 'xg_proxy' | 'minutes_played' | 'shots_on_target'

interface EvolutionMetricDef {
  key: EvolutionMetricKey
  label: string
  /** Suffix to append in the tooltip (kept short). */
  unit?: string
  /** Returns the value from an Appearance row.
   *  Returns `null` when the analyst has not entered the data — the chart then
   *  draws a gap instead of dropping to 0 (which would lie about performance). */
  read: (a: Appearance) => number | null
  /** Domain hint to keep the Y-axis consistent across matches. */
  domain?: [number, number]
}

const EVOLUTION_METRICS: EvolutionMetricDef[] = [
  // `rating` is the only field truly nullable in the DB — keep null as null.
  { key: 'rating',          label: 'Note du match',  unit: '/10', read: (a) => a.rating, domain: [0, 10] },
  // Counts default to 0 in DB. If the match has 0 minutes played, the analyst likely
  // hasn't filled the row yet → treat all derived counts as missing.
  { key: 'goals',           label: 'Buts',           read: (a) => (a.minutes_played ?? 0) > 0 ? (a.goals ?? 0) : null },
  { key: 'assists',         label: 'Passes décisives', read: (a) => (a.minutes_played ?? 0) > 0 ? (a.assists ?? 0) : null },
  { key: 'shots_on_target', label: 'Tirs cadrés',    read: (a) => (a.minutes_played ?? 0) > 0 ? (a.shots_on_target ?? 0) : null },
  // Minutes is the canonical source of truth; null when literally missing.
  { key: 'minutes_played',  label: 'Minutes jouées', unit: 'min', read: (a) => a.minutes_played ?? null, domain: [0, 100] },
  // xG isn't stored per-appearance yet; we proxy it via shots × 0.12 — clear "approximation" label in the UI.
  // Same minutes-based heuristic: no minutes → no shots data trustworthy.
  { key: 'xg_proxy',        label: 'xG (proxy)',     read: (a) => (a.minutes_played ?? 0) > 0 ? Number(((a.shots ?? 0) * 0.12).toFixed(2)) : null },
]

interface EvolutionRow {
  index: number
  date: string
  label: string
  opponent: string
  competition: string
  home: boolean
  /** `null` when the metric was not entered for this match — Recharts draws a gap. */
  value: number | null
  /** Rolling average over the previous 5 matches, computed on non-null entries only.
   *  `null` until we have at least 3 valid points in the window. */
  rolling: number | null
  /** Result formatted for tooltip — depends on home flag. */
  result: string
}

function EvolutionView({ players, selectedSlug, onChangeSlug }: EvolutionViewProps) {
  const [appearances, setAppearances] = useState<Appearance[]>([])
  const [loading, setLoading] = useState(false)
  const [metricKey, setMetricKey] = useState<EvolutionMetricKey>('rating')

  useEffect(() => {
    if (!selectedSlug) { setAppearances([]); return }
    let cancelled = false
    setLoading(true)
    api.get<{ data: Appearance[] }>(`/admin/players/${selectedSlug}/appearances`, { auth: true })
      .then((res) => { if (!cancelled) setAppearances(res.data ?? []) })
      .catch(() => { if (!cancelled) setAppearances([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedSlug])

  const metric = EVOLUTION_METRICS.find((m) => m.key === metricKey) || EVOLUTION_METRICS[0]
  const selectedPlayer = players.find((p) => p.slug === selectedSlug) || null

  /** Series sorted chronologically (oldest → newest) with a 5-match rolling average.
   *  Nulls are preserved : the line will show gaps and the rolling average ignores them. */
  const series = useMemo<EvolutionRow[]>(() => {
    if (!appearances.length) return []
    const sorted = [...appearances].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    const window = 5
    return sorted.map((a, i) => {
      const value = metric.read(a)
      // Rolling: mean over the previous (window-1) entries plus current, ignoring nulls.
      // Require at least 3 valid points so the average isn't carried by a single match.
      const slice = sorted.slice(Math.max(0, i - window + 1), i + 1)
        .map(metric.read)
        .filter((v): v is number => v !== null)
      const rolling = slice.length >= 3
        ? Number((slice.reduce((acc, x) => acc + x, 0) / slice.length).toFixed(2))
        : null
      const date = new Date(a.match_date)
      return {
        index: i + 1,
        date: a.match_date,
        label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        opponent: a.opponent,
        competition: a.competition,
        home: a.home,
        value,
        rolling,
        result: a.score_team != null && a.score_opponent != null
          ? (a.home ? `${a.score_team}–${a.score_opponent}` : `${a.score_opponent}–${a.score_team}`)
          : '—',
      }
    })
  }, [appearances, metric])

  /** Compact summary KPIs computed on the displayed metric, ignoring matches where
   *  the data is not entered. The summary header surfaces how many were skipped. */
  const summary = useMemo(() => {
    if (!series.length) return null
    const validRows = series.filter((s) => s.value !== null)
    const missing = series.length - validRows.length
    if (validRows.length === 0) {
      return { matches: series.length, valid: 0, missing, sum: 0, avg: 0, best: 0, last5Avg: 0, trend: 0 }
    }
    const values = validRows.map((s) => s.value as number)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const best = Math.max(...values)
    const last5 = series.slice(-5).filter((s) => s.value !== null).map((s) => s.value as number)
    const last5Avg = last5.length ? last5.reduce((a, b) => a + b, 0) / last5.length : 0
    const trend = last5.length ? last5Avg - avg : 0
    return { matches: series.length, valid: validRows.length, missing, sum, avg, best, last5Avg, trend }
  }, [series])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-stone-200/70 dark:bg-zinc-900/60 dark:border-stone-50/[0.06] p-5 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <div className="font-mono uppercase tracking-[0.12em] text-[0.62rem] text-zinc-500 dark:text-stone-400 mb-2">Joueur</div>
            <PlayerSingleSelect
              players={players}
              selectedSlug={selectedSlug}
              onChange={onChangeSlug}
              placeholder="Choisir le joueur à analyser…"
            />
          </div>
          <div className="lg:min-w-[260px]">
            <div className="font-mono uppercase tracking-[0.12em] text-[0.62rem] text-zinc-500 dark:text-stone-400 mb-2">Métrique suivie</div>
            <select
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value as EvolutionMetricKey)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:focus:border-turf-300"
            >
              {EVOLUTION_METRICS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}{m.unit ? ` (${m.unit})` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {!selectedSlug ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/10 bg-white/40 dark:bg-zinc-900/30 px-6 py-16 text-center">
          <ChartLine size={28} weight="duotone" className="mx-auto text-zinc-400 dark:text-stone-500" />
          <p className="mt-4 text-sm text-zinc-600 dark:text-stone-400">
            Sélectionnez un joueur pour visualiser sa courbe de forme match par match.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl bg-white border border-stone-200/70 dark:bg-zinc-900/60 dark:border-stone-50/[0.06] p-6">
          <Skeleton className="h-[420px] w-full" rounded="xl" />
        </div>
      ) : series.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/10 bg-white/40 dark:bg-zinc-900/30 px-6 py-16 text-center">
          <p className="text-sm text-zinc-600 dark:text-stone-400">
            Aucune apparition enregistrée pour ce joueur — ajoutez-en depuis sa fiche.
          </p>
        </div>
      ) : (
        <>
          {/* ── Summary strip ── */}
          {summary && (
            <>
              {summary.missing > 0 && (
                <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-500/[0.08] px-3 py-2 flex items-start gap-2.5">
                  <WarningCircleIcon size={14} weight="duotone" className="text-amber-600 dark:text-amber-300 mt-[2px] shrink-0" />
                  <div className="text-[0.78rem] text-amber-900 dark:text-amber-100">
                    <span className="font-medium">{summary.missing} match{summary.missing > 1 ? 's' : ''}</span>{' '}
                    <span className="text-amber-800 dark:text-amber-200/80">
                      sans donnée pour cette métrique — ignoré{summary.missing > 1 ? 's' : ''} dans les moyennes.
                    </span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryTile
                  label="Matchs analysés"
                  value={summary.valid > 0 && summary.missing > 0
                    ? `${summary.valid} / ${summary.matches}`
                    : summary.matches}
                />
                <SummaryTile label={`Moyenne ${metric.label.toLowerCase()}`} value={summary.valid > 0 ? summary.avg.toFixed(2) : '—'} />
                <SummaryTile label="Sur les 5 derniers"  value={summary.valid > 0 ? summary.last5Avg.toFixed(2) : '—'} trend={summary.valid > 0 ? summary.trend : undefined} />
                <SummaryTile label="Meilleur"            value={summary.valid > 0 ? summary.best.toFixed(2) : '—'} />
              </div>
            </>
          )}

          {/* ── Time-series chart ── */}
          <section className="rounded-2xl bg-white border border-stone-200/70 dark:bg-zinc-900/60 dark:border-stone-50/[0.06] p-5 lg:p-6">
            <header className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="font-mono uppercase tracking-[0.12em] text-[0.62rem] text-zinc-500 dark:text-stone-400">Évolution</div>
                <h3 className="mt-1 font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">
                  {selectedPlayer?.name} <span className="text-zinc-400 dark:text-stone-500 font-normal">— {metric.label}</span>
                </h3>
              </div>
              <span className="hidden sm:inline-flex items-center gap-2 text-[0.7rem] text-zinc-500 dark:text-stone-400">
                <span className="inline-block w-3 h-[2px] bg-turf-700 dark:bg-turf-300" /> Valeur
                <span className="inline-block w-3 h-[2px] bg-amber-500 ml-2" /> Moyenne 5 matchs
              </span>
            </header>
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 16, right: 24, bottom: 32, left: 8 }}>
                  <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#52525b', fontSize: 11 }}
                    label={{ value: 'Match (chronologique)', position: 'insideBottom', offset: -16, fill: '#52525b', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: '#52525b', fontSize: 11 }}
                    domain={metric.domain ?? ['auto', 'auto']}
                    label={{ value: metric.label, angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ stroke: '#a8a29e', strokeDasharray: '3 3' }}
                    content={(props: { active?: boolean; payload?: Array<{ payload: EvolutionRow; value: number | null; dataKey: string }> }) => {
                      const { active, payload } = props
                      if (!active || !payload?.length) return null
                      const p = payload[0].payload
                      return (
                        <div className="rounded-xl bg-zinc-950/95 backdrop-blur border border-stone-50/10 text-stone-100 px-3 py-2.5 text-xs shadow-xl min-w-[200px]">
                          <div className="font-medium text-stone-50">{p.opponent}</div>
                          <div className="text-[0.68rem] text-stone-400">
                            {p.competition} · {p.home ? 'Domicile' : 'Extérieur'} · {new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </div>
                          <div className="mt-2 pt-2 border-t border-stone-50/10 space-y-0.5">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-stone-400">Score</span>
                              <span className="font-mono tabular-nums text-stone-50">{p.result}</span>
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-stone-400">{metric.label}</span>
                              {p.value === null ? (
                                <span className="font-mono text-amber-300 italic">non renseigné</span>
                              ) : (
                                <span className="font-mono tabular-nums text-turf-300">
                                  {p.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}{metric.unit ? ` ${metric.unit}` : ''}
                                </span>
                              )}
                            </div>
                            {p.rolling !== null && (
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="text-stone-400">Moy. 5 matchs</span>
                                <span className="font-mono tabular-nums text-amber-300">{p.rolling.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={metric.label}
                    stroke="#0f5132"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={(dotProps: { cx?: number; cy?: number; payload?: EvolutionRow; index?: number }) => {
                      const { cx, cy, payload, index } = dotProps
                      // Recharts skips drawing for null values automatically, but we want to
                      // surface them as a hollow "non renseigné" marker on the X axis so the
                      // analyst sees there's a missing entry, not just a gap.
                      if (payload && payload.value === null && cx !== undefined) {
                        return (
                          <circle
                            key={index ?? 'missing'}
                            cx={cx}
                            cy={(cy ?? 0) || 0}
                            r={3}
                            fill="transparent"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            strokeDasharray="2 2"
                          />
                        )
                      }
                      return (
                        <circle key={index ?? 'pt'} cx={cx ?? 0} cy={cy ?? 0} r={3} fill="#0f5132" />
                      )
                    }}
                  />
                  <Line type="monotone" dataKey="rolling" name="Moyenne 5 matchs" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {metricKey === 'xg_proxy' && (
              <p className="mt-3 text-[0.72rem] text-zinc-500 dark:text-stone-400 italic">
                xG approximé via <code>tirs × 0,12</code> — la table appearances ne stocke pas encore l'xG par match.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

interface SummaryTileProps { label: string; value: string | number; trend?: number }
function SummaryTile({ label, value, trend }: SummaryTileProps) {
  const trendTone = trend === undefined ? '' : trend > 0.05
    ? 'text-turf-700 dark:text-turf-300'
    : trend < -0.05
      ? 'text-rose-600 dark:text-rose-300'
      : 'text-zinc-500 dark:text-stone-400'
  const arrow = trend === undefined ? '' : trend > 0.05 ? '↑' : trend < -0.05 ? '↓' : '→'
  return (
    <div className="rounded-2xl bg-white border border-stone-200/70 dark:bg-zinc-900/60 dark:border-stone-50/[0.06] p-4">
      <div className="font-mono uppercase tracking-[0.12em] text-[0.62rem] text-zinc-500 dark:text-stone-400">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display font-semibold text-2xl tabular-nums text-zinc-950 dark:text-stone-50">{value}</span>
        {trend !== undefined && (
          <span className={`text-xs font-mono tabular-nums ${trendTone}`}>
            {arrow}{Math.abs(trend) >= 0.05 ? ` ${trend > 0 ? '+' : ''}${trend.toFixed(2)}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

export default AdminAnalysis
