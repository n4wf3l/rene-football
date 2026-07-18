import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { DownloadSimple, FilePdf, Gauge, PencilSimpleLine, WarningCircle } from '@phosphor-icons/react'
import { api, getToken } from '../api/client'
import type { Player } from '../types/player'
import BenchmarksEditor from './BenchmarksEditor'
import StatsProvenanceBadge from './StatsProvenanceBadge'

/**
 * Position × age-tier benchmark view. For a picked player, fetches the
 * server-computed comparison (from /api/admin/analysis/benchmark/{slug})
 * and renders each measured metric as a paired bar chart:
 *   - player value  (accent bar)
 *   - avg peer      (neutral tick)
 *   - elite peer    (turf tick)
 *
 * Plus a vs_avg % badge and a vs_elite gauge (0 = avg, 100 = elite).
 * When a metric has no benchmark for the (position, tier), it's omitted.
 */

interface Props {
  players: Player[]
  selectedSlug: string | null
  onChangeSlug: (slug: string | null) => void
}

interface BenchmarkMetric {
  value: number
  avg: number
  elite: number
  vs_avg: number
  vs_elite: number
}

interface BenchmarkPayload {
  data: {
    player_slug: string
    category: string | null
    age_tier: string
    metrics: Record<string, BenchmarkMetric>
  }
}

const METRIC_LABEL: Record<string, string> = {
  goals: 'Buts / match',
  assists: 'Passes déc. / match',
  xg: 'xG / match',
  xa: 'xA / match',
  shots_on_target: 'Tirs cadrés / match',
  key_passes: 'Passes clés / match',
  pass_accuracy: '% passes',
  dribbles_completed: 'Dribbles réussis / match',
  tackles: 'Tacles / match',
  interceptions: 'Interceptions / match',
  duels_won: 'Duels gagnés / match',
  clean_sheets: 'Clean sheets / match',
  saves: 'Arrêts / match',
  distance_avg_km: 'Km / match',
  top_speed_kmh: 'Vitesse max',
}

const TIER_LABEL: Record<string, string> = {
  u18:   'U18 (< 18 ans)',
  u21:   'U21 (18-20 ans)',
  young: 'Jeune (21-25 ans)',
  prime: 'Prime (26-30 ans)',
  vet:   'Vétéran (31+)',
}

/** Bounded 0-100 for the elite gauge (avg=0, elite=100, above=capped). */
function clampGauge(v: number): number { return Math.max(0, Math.min(100, v)) }

/** Tailwind color class for a vs_elite score. */
function toneFor(vsElite: number): { fill: string; text: string; label: string } {
  if (vsElite >= 85)  return { fill: 'bg-turf-700 dark:bg-turf-300',    text: 'text-turf-700 dark:text-turf-300',       label: 'Elite' }
  if (vsElite >= 60)  return { fill: 'bg-emerald-500',                   text: 'text-emerald-600 dark:text-emerald-400', label: 'Au-dessus' }
  if (vsElite >= 30)  return { fill: 'bg-amber-500',                     text: 'text-amber-600 dark:text-amber-400',     label: 'Autour de la moyenne' }
  if (vsElite >= 0)   return { fill: 'bg-stone-400',                     text: 'text-stone-500 dark:text-stone-400',     label: 'Sous la moyenne' }
  return                     { fill: 'bg-rose-500',                     text: 'text-rose-600 dark:text-rose-400',       label: 'Loin de la moyenne' }
}

export default function BenchmarkView({ players, selectedSlug, onChangeSlug }: Props) {
  const [data, setData] = useState<BenchmarkPayload['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  // Bumped after each benchmark edit to force the benchmark fetch effect to re-run.
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!selectedSlug) { setData(null); return }
    let cancelled = false
    setLoading(true); setError(null)
    api.get<BenchmarkPayload>(`/admin/analysis/benchmark/${selectedSlug}`, { auth: true })
      .then((res) => { if (!cancelled) setData(res.data) })
      .catch(() => { if (!cancelled) setError('Impossible de charger le benchmark.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, refreshTick])

  const player = useMemo(
    () => players.find((p) => p.slug === selectedSlug) ?? null,
    [players, selectedSlug],
  )

  const rows = useMemo(() => {
    if (!data) return []
    return Object.entries(data.metrics)
      .map(([key, m]) => ({ key, label: METRIC_LABEL[key] ?? key, ...m }))
      .sort((a, b) => b.vs_elite - a.vs_elite)
  }, [data])

  /** Export the benchmark rows as CSV. One line per metric, includes both
   *  raw values and normalized comparison indices so the file is directly
   *  usable in a spreadsheet or a report. */
  const exportCsv = () => {
    if (!player || rows.length === 0) return
    const header = ['metric', 'label', 'value', 'avg', 'elite', 'vs_avg_pct', 'vs_elite_index']
    const body = rows.map((r) => [r.key, r.label, r.value, r.avg, r.elite, r.vs_avg, r.vs_elite])
    const csv = [header, ...body]
      .map((line) => line.map((c) => {
        const s = String(c ?? '')
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `benchmark-${player.slug}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  /** Download the server-generated analysis PDF for the current player.
   *  Uses the auth-protected endpoint so we go through fetch + blob rather
   *  than a raw window.open (which strips headers). */
  const exportPdf = async () => {
    if (!player) return
    try {
      const token = getToken()
      const resp = await fetch(`/api/admin/players/${player.slug}/analysis-report`, {
        headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } : { Accept: 'application/pdf' },
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setError("Impossible de générer le PDF d'analyse.")
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
      {/* Player picker */}
      <aside className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 p-5 space-y-3 self-start sticky top-6">
        <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400">
          Joueur
        </div>
        <select
          value={selectedSlug ?? ''}
          onChange={(e) => onChangeSlug(e.target.value || null)}
          className="w-full rounded-lg border border-stone-300 bg-white dark:border-stone-50/15 dark:bg-zinc-950 text-sm px-3 py-2 focus:outline-none focus:border-zinc-900 dark:focus:border-turf-300"
        >
          <option value="">— Choisir un joueur —</option>
          {players.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} · {p.position ?? p.category}
            </option>
          ))}
        </select>

        {player && data && (
          <div className="pt-3 mt-3 border-t border-stone-200 dark:border-stone-50/10 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-stone-200">
              <Gauge size={14} weight="bold" className="text-turf-700 dark:text-turf-300" />
              <span>Comparé au profil</span>
            </div>
            <div className="font-display font-semibold text-zinc-950 dark:text-stone-50">
              {data.category ?? '—'} · {TIER_LABEL[data.age_tier] ?? data.age_tier}
            </div>
            <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500 leading-relaxed pt-1">
              Référence anchored sur les moyennes UEFA / top 5 européens. Les valeurs sont exprimées par match.
            </p>
            <div className="pt-2">
              <StatsProvenanceBadge player={player} />
            </div>
          </div>
        )}
      </aside>

      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 p-5 lg:p-6">
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-200/70 dark:border-stone-50/10">
            <div className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
              {rows.length} métrique{rows.length > 1 ? 's' : ''} benchmarkée{rows.length > 1 ? 's' : ''} · triées par proximité au profil elite
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
                title="Ajuster les profils de référence (moyenne / elite par poste × âge)"
              >
                <PencilSimpleLine size={13} weight="bold" /> Éditer benchmarks
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
                title="Exporter le benchmark en CSV"
              >
                <DownloadSimple size={13} weight="bold" /> CSV
              </button>
              <button
                type="button"
                onClick={exportPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium btn-primary"
                title="Générer un dossier d'analyse PDF (interne)"
              >
                <FilePdf size={13} weight="bold" /> Dossier PDF
              </button>
            </div>
          </div>
        )}

        <BenchmarksEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          onMutated={() => setRefreshTick((t) => t + 1)}
        />


        {!selectedSlug && (
          <div className="py-14 text-center text-sm text-zinc-500 dark:text-stone-500">
            Choisissez un joueur pour voir sa comparaison au profil de référence de son poste et de son âge.
          </div>
        )}
        {selectedSlug && loading && (
          <div className="py-14 text-center text-xs font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-500 animate-pulse">
            Chargement…
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 text-sm">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {selectedSlug && !loading && !error && rows.length === 0 && (
          <div className="py-14 text-center text-sm text-zinc-500 dark:text-stone-500">
            Aucun benchmark défini pour ce joueur (poste ou tranche d'âge non couvert).
          </div>
        )}
        {rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((r, i) => {
              const gauge = clampGauge(r.vs_elite)
              const tone = toneFor(r.vs_elite)
              // Bars are drawn on a 0 → max(elite, value) scale so the elite
              // marker sits at a stable relative position, no matter the unit.
              const scaleMax = Math.max(r.elite, r.value) * 1.1 || 1
              return (
                <motion.div
                  key={r.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-xl border border-stone-200/70 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-950/40 p-4"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <div className="text-sm font-medium text-zinc-900 dark:text-stone-100">{r.label}</div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-mono tabular-nums ${tone.text}`}>
                        {r.vs_avg >= 0 ? '+' : ''}{r.vs_avg.toFixed(0)}% vs avg
                      </span>
                      <span className={`text-[0.65rem] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-full ${tone.text} bg-white/60 dark:bg-stone-50/5`}>
                        {tone.label}
                      </span>
                    </div>
                  </div>

                  {/* Comparative bar with avg and elite ticks */}
                  <div className="relative h-2.5 rounded-full bg-stone-200/80 dark:bg-stone-50/10 overflow-visible">
                    <div
                      className={`h-full rounded-full ${tone.fill}`}
                      style={{ width: `${Math.min(100, (r.value / scaleMax) * 100)}%` }}
                    />
                    {/* Avg tick */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-4 w-px bg-zinc-500 dark:bg-stone-400"
                      style={{ left: `${(r.avg / scaleMax) * 100}%` }}
                      title={`Moyenne ${r.avg}`}
                    />
                    {/* Elite tick */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-4 w-0.5 bg-turf-700 dark:bg-turf-300"
                      style={{ left: `${(r.elite / scaleMax) * 100}%` }}
                      title={`Elite ${r.elite}`}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[0.65rem] font-mono text-zinc-500 dark:text-stone-500 tabular-nums">
                    <span>
                      Joueur <span className="font-semibold text-zinc-900 dark:text-stone-100">{r.value}</span>
                    </span>
                    <span>Moyenne {r.avg}</span>
                    <span className="text-turf-700 dark:text-turf-300">Elite {r.elite}</span>
                  </div>

                  {/* vs_elite gauge */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-stone-200/80 dark:bg-stone-50/10 overflow-hidden">
                      <div className={`h-full rounded-full ${tone.fill}`} style={{ width: `${gauge}%` }} />
                    </div>
                    <span className="text-[0.65rem] font-mono tabular-nums text-zinc-500 dark:text-stone-400 w-14 text-right">
                      {gauge.toFixed(0)}% elite
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
