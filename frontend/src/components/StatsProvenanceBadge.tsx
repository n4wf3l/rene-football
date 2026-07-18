import { Database, WarningCircle, CheckCircle } from '@phosphor-icons/react'
import type { Player } from '../types/player'

/**
 * Small chip that surfaces the provenance of a player's numeric stats:
 *   - source label (CSV / Wyscout / Instat / …) mapped to a human-friendly text
 *   - "il y a X" freshness, colored red if the last update is older than
 *     `staleAfterDays` (default 60) so agents don't quote outdated numbers
 *   - reliability (1-5) rendered as a compact dot meter
 *
 * Kept intentionally light so it can sit inside a card, table row or a
 * sidebar without dominating. When no provenance is set (legacy / seeded
 * players), the badge collapses to a warning that says "source inconnue".
 */

interface Props {
  player: Pick<Player, 'stats_source' | 'stats_updated_at' | 'stats_reliability'>
  staleAfterDays?: number
  size?: 'xs' | 'sm'
}

const SOURCE_LABEL: Record<string, string> = {
  manual:        'Manuelle',
  csv:           'CSV',
  xlsx:          'Excel',
  wyscout:       'Wyscout',
  instat:        'Instat',
  club_official: 'Club officiel',
  observed:      'Scout',
  seed:          'Demo',
}

const SOURCE_TONE: Record<string, string> = {
  manual:        'bg-stone-500/15 text-stone-700 dark:text-stone-300',
  csv:           'bg-turf-500/15 text-turf-800 dark:text-turf-300',
  xlsx:          'bg-turf-500/15 text-turf-800 dark:text-turf-300',
  wyscout:       'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  instat:        'bg-violet-500/15 text-violet-800 dark:text-violet-300',
  club_official: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  observed:      'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  seed:          'bg-rose-500/15 text-rose-800 dark:text-rose-300',
}

/** Coarse "X hours / days / months ago" — no need for a dep. */
function relativeTime(iso: string | null | undefined): { text: string; days: number } | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (isNaN(t)) return null
  const ms   = Date.now() - t
  const mins = Math.floor(ms / 60_000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  const mos  = Math.floor(days / 30)
  const yrs  = Math.floor(days / 365)
  if (yrs > 0)  return { text: `il y a ${yrs} an${yrs > 1 ? 's' : ''}`,  days }
  if (mos > 0)  return { text: `il y a ${mos} mois`,                     days }
  if (days > 0) return { text: `il y a ${days} j`,                       days }
  if (hrs > 0)  return { text: `il y a ${hrs} h`,                        days }
  if (mins > 5) return { text: `il y a ${mins} min`,                     days }
  return { text: "à l'instant", days }
}

export default function StatsProvenanceBadge({ player, staleAfterDays = 60, size = 'xs' }: Props) {
  const source = (player.stats_source ?? '').toLowerCase() as keyof typeof SOURCE_LABEL | ''
  const rel    = player.stats_reliability ?? null
  const time   = relativeTime(player.stats_updated_at)
  const stale  = time != null && time.days > staleAfterDays

  const px = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-1'
  const txt = size === 'xs' ? 'text-[0.6rem]' : 'text-[0.68rem]'

  if (!source && !time && rel == null) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full ${px} ${txt} font-mono uppercase tracking-[0.14em] bg-rose-500/10 text-rose-700 dark:text-rose-400`}
            title="Aucune source enregistrée pour ces stats. Passez par « Importer CSV » ou l'édition manuelle pour tracer l'origine.">
        <WarningCircle size={11} weight="bold" /> Source inconnue
      </span>
    )
  }

  const label     = source ? (SOURCE_LABEL[source] ?? source) : 'Manuelle'
  const toneClass = source ? (SOURCE_TONE[source] ?? SOURCE_TONE.manual) : SOURCE_TONE.manual

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 rounded-full ${px} ${txt} font-mono uppercase tracking-[0.14em] ${toneClass}`}
        title={`Source des stats : ${label}`}
      >
        <Database size={11} weight="bold" /> {label}
      </span>

      {time && (
        <span
          className={`inline-flex items-center gap-1 rounded-full ${px} ${txt} font-mono uppercase tracking-[0.14em] ${
            stale
              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
              : 'bg-stone-100 text-zinc-600 dark:bg-stone-50/10 dark:text-stone-400'
          }`}
          title={stale ? `Stats non rafraîchies depuis plus de ${staleAfterDays} jours` : 'Fraîcheur des stats'}
        >
          {stale ? <WarningCircle size={11} weight="bold" /> : <CheckCircle size={11} weight="bold" />}
          {time.text}
        </span>
      )}

      {rel != null && (
        <span
          className={`inline-flex items-center gap-0.5 rounded-full ${px} ${txt} font-mono ${
            rel >= 4
              ? 'bg-turf-500/15 text-turf-800 dark:text-turf-300'
              : rel === 3
              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
              : 'bg-rose-500/15 text-rose-800 dark:text-rose-400'
          }`}
          title={`Fiabilité auto-déclarée : ${rel}/5`}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`inline-block w-1 h-1 rounded-full ${n <= rel ? 'bg-current' : 'bg-current opacity-25'}`} />
          ))}
        </span>
      )}
    </span>
  )
}
