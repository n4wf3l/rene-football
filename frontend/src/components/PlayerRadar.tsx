import { motion } from 'framer-motion'
import type { Player, PlayerCategory } from '../types/player'

export interface RadarAxis {
  /** Player numeric field to read. */
  key: keyof Player
  /** Short label rendered around the polygon. */
  label: string
  /** Theoretical max for normalization (value/max → 0..1). */
  max: number
}

export interface PlayerRadarProps {
  players: Player[]
  /** Override axes - defaults to a per-category preset. */
  axes?: RadarAxis[]
  size?: number
  /** Show a faint comparison label (default true when 2+ players). */
  showLegend?: boolean
}

/* ---- Per-category axes - six dimensions that matter for the position. ---- */
const ATTACKER_AXES: RadarAxis[] = [
  { key: 'goals',              label: 'Buts',          max: 25 },
  { key: 'xg',                 label: 'xG',            max: 18 },
  { key: 'shots_on_target',    label: 'Tirs cadrés',   max: 50 },
  { key: 'dribbles_completed', label: 'Dribbles',      max: 80 },
  { key: 'key_passes',         label: 'Passes clés',   max: 60 },
  { key: 'assists',            label: 'Passes déc.',   max: 15 },
]

const MIDFIELD_AXES: RadarAxis[] = [
  { key: 'key_passes',         label: 'Passes clés',   max: 60 },
  { key: 'pass_accuracy',      label: '% passes',      max: 100 },
  { key: 'dribbles_completed', label: 'Dribbles',      max: 80 },
  { key: 'tackles',            label: 'Tacles',        max: 80 },
  { key: 'interceptions',      label: 'Interceptions', max: 60 },
  { key: 'assists',            label: 'Passes déc.',   max: 15 },
]

const DEFENDER_AXES: RadarAxis[] = [
  { key: 'tackles',            label: 'Tacles',        max: 80 },
  { key: 'interceptions',      label: 'Interceptions', max: 60 },
  { key: 'duels_won',          label: 'Duels gagnés',  max: 100 },
  { key: 'pass_accuracy',      label: '% passes',      max: 100 },
  { key: 'clean_sheets',       label: 'Clean sh.',     max: 15 },
  { key: 'matches_played',     label: 'Matchs',        max: 38 },
]

const KEEPER_AXES: RadarAxis[] = [
  { key: 'saves',              label: 'Arrêts',        max: 150 },
  { key: 'clean_sheets',       label: 'Clean sh.',     max: 15 },
  { key: 'pass_accuracy',      label: '% passes',      max: 100 },
  { key: 'matches_played',     label: 'Matchs',        max: 38 },
  { key: 'minutes_played',     label: 'Minutes',       max: 3500 },
]

function axesFor(category: string | undefined): RadarAxis[] {
  switch (category) {
    case 'Gardien':    return KEEPER_AXES
    case 'Defenseur':
    case 'Défenseur':  return DEFENDER_AXES
    case 'Milieu':     return MIDFIELD_AXES
    case 'Attaquant':  return ATTACKER_AXES
    default:           return MIDFIELD_AXES
  }
}

/* Up to 4 superimposed polygons. Each player gets a distinct hue, fill at low alpha
   for overlap readability, stroke at higher alpha. */
const PLAYER_COLORS = [
  { stroke: '#52996d', fill: 'rgba(82,153,109,0.20)',  legend: 'bg-turf-500' },   // turf
  { stroke: '#e11d48', fill: 'rgba(225,29,72,0.18)',   legend: 'bg-rose-600' },   // rose
  { stroke: '#d97706', fill: 'rgba(217,119,6,0.18)',   legend: 'bg-amber-600' },  // amber
  { stroke: '#0284c7', fill: 'rgba(2,132,199,0.18)',   legend: 'bg-sky-600' },    // sky
]

function readNumeric(p: Player, key: keyof Player): number {
  const v = p[key]
  return typeof v === 'number' ? v : 0
}

export default function PlayerRadar({
  players,
  axes,
  size = 320,
  showLegend = true,
}: PlayerRadarProps) {
  if (!players.length) return null

  // Auto-pick axes from the first player's category if not explicitly given.
  const effectiveAxes = axes ?? axesFor((players[0].category as PlayerCategory) ?? 'Milieu')
  const N = effectiveAxes.length
  const center = size / 2
  const maxR = size * 0.36
  const labelR = size * 0.46

  // Concentric grid (4 levels) for readability.
  const gridLevels = [0.25, 0.5, 0.75, 1]

  const angle = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2

  const pointFor = (radiusFactor: number, i: number) => {
    const r = radiusFactor * maxR
    return [center + r * Math.cos(angle(i)), center + r * Math.sin(angle(i))] as const
  }

  // Polygon points string for one player.
  const polygonFor = (player: Player) =>
    effectiveAxes
      .map((axis, i) => {
        const value = readNumeric(player, axis.key)
        const norm = Math.max(0, Math.min(1, value / axis.max))
        const [x, y] = pointFor(norm, i)
        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')

  const playersToRender = players.slice(0, 4)

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Profil radar des qualités"
      >
        {/* Grid rings */}
        {gridLevels.map((lvl) => (
          <polygon
            key={lvl}
            points={effectiveAxes
              .map((_, i) => {
                const [x, y] = pointFor(lvl, i)
                return `${x.toFixed(2)},${y.toFixed(2)}`
              })
              .join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-stone-300 dark:text-stone-50/10"
          />
        ))}

        {/* Axis lines from center */}
        {effectiveAxes.map((_, i) => {
          const [x, y] = pointFor(1, i)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x.toFixed(2)}
              y2={y.toFixed(2)}
              stroke="currentColor"
              strokeWidth="1"
              className="text-stone-300 dark:text-stone-50/10"
            />
          )
        })}

        {/* Player polygons (back-to-front so the first player sits on top) */}
        {[...playersToRender].reverse().map((player, idxRev) => {
          const idx = playersToRender.length - 1 - idxRev
          const c = PLAYER_COLORS[idx]
          return (
            <motion.polygon
              key={player.slug}
              points={polygonFor(player)}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={2}
              strokeLinejoin="round"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 110, damping: 18, delay: idx * 0.08 }}
              style={{ transformOrigin: `${center}px ${center}px` }}
            />
          )
        })}

        {/* Axis labels around the polygon */}
        {effectiveAxes.map((axis, i) => {
          const [x, y] = pointFor(labelR / maxR, i)
          // Anchor based on horizontal position so labels don't drift outside the SVG.
          const anchor = x < center - 4 ? 'end' : x > center + 4 ? 'start' : 'middle'
          return (
            <text
              key={axis.label}
              x={x.toFixed(2)}
              y={y.toFixed(2)}
              fill="currentColor"
              fontSize="10"
              fontFamily="Geist Mono, ui-monospace, monospace"
              textAnchor={anchor}
              dominantBaseline="middle"
              className="text-zinc-600 dark:text-stone-400 uppercase tracking-wider"
            >
              {axis.label}
            </text>
          )
        })}
      </svg>

      {showLegend && playersToRender.length > 0 && (
        <ul className="flex flex-wrap items-center justify-center gap-3 text-xs">
          {playersToRender.map((p, i) => (
            <li key={p.slug} className="inline-flex items-center gap-2 text-zinc-700 dark:text-stone-300">
              <span className={`w-2.5 h-2.5 rounded-full ${PLAYER_COLORS[i].legend}`} />
              <span className="font-medium">{p.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { axesFor as defaultRadarAxesFor, PLAYER_COLORS as RADAR_PLAYER_COLORS }
