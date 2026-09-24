import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, Polygon } from 'geojson'
import luxembourgData from '../data/luxembourg.json'

// Real national boundary (Natural Earth via world-atlas, extracted at build
// time - see scripts/gen-luxembourg.mjs). Same technique as FutsalProject's
// MoroccoMap: d3-geo projects the actual polygon instead of a hand-traced
// approximation, so the silhouette is accurate.
const luxembourgFeature = luxembourgData as Feature<Polygon, { name: string }>

export interface LuxembourgMapProps {
  className?: string
  strokeColor?: string
  fillColor?: string
  fillOpacity?: number
  strokeWidth?: number
  /** Render the translucent fill wash. Defaults to true. */
  showFill?: boolean
  /** Render the drawn-on stroke outline. Defaults to true. */
  showStroke?: boolean
  /** viewBox width in SVG units (aspect ratio is derived from the projection). */
  width?: number
  /** viewBox height in SVG units. */
  height?: number
  /** Inner padding so the country doesn't touch the SVG edge. */
  padding?: number
}

export default function LuxembourgMap({
  className = '',
  strokeColor = 'currentColor',
  fillColor,
  fillOpacity = 0.16,
  strokeWidth = 1.6,
  showFill = true,
  showStroke = true,
  width = 320,
  height = 380,
  padding = 16,
}: LuxembourgMapProps) {
  // Single projection drives the outline - fitExtent guarantees the
  // silhouette fills the viewBox exactly regardless of the country's shape.
  // The raw d3-geo output ends with `Z` which closes the polygon back to the
  // starting point via a straight line. Framer Motion's `pathLength` animation
  // measures dasharray/dashoffset against the *M..last L* stretch and skips the
  // implicit Z segment, so the closing edge is left un-drawn - visible as a
  // small gap near the top of Luxembourg where the M and Z points meet.
  // We patch that by replacing the trailing `Z` with an explicit `L Mx,My`
  // back to the start plus a short overshoot into the first vertex, so the
  // stroke traces the whole silhouette and slightly overlaps its own tail.
  const pathD = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [padding, padding],
        [width - padding, height - padding],
      ],
      luxembourgFeature,
    )
    const raw = geoPath(projection)(luxembourgFeature) ?? ''
    // Extract M point coords (first pair after M) and the FIRST L point
    // coords (so we can overshoot into it after closing).
    const startMatch = raw.match(/^M(-?[\d.]+),(-?[\d.]+)/)
    const firstLMatch = raw.match(/L(-?[\d.]+),(-?[\d.]+)/)
    if (!startMatch || !firstLMatch || !raw.endsWith('Z')) return raw
    const [mX, mY] = [startMatch[1], startMatch[2]]
    const [lX, lY] = [firstLMatch[1], firstLMatch[2]]
    // Trim the trailing Z, add an explicit line back to M, then an overshoot
    // into the first L. The overlap masks any sub-pixel gap at the join.
    return `${raw.slice(0, -1)}L${mX},${mY}L${lX},${lY}`
  }, [width, height, padding])

  const fill = fillColor ?? strokeColor

  // Manual dashoffset tracing (instead of Motion's pathLength shorthand):
  // pathLength reads getTotalLength() from the DOM, which undershoots on
  // closed non-scaling-stroke paths in Chromium and leaves a sub-pixel gap at
  // the end. We hard-code strokeDasharray to a value comfortably larger than
  // any real path length (2000 svg units - Luxembourg's projected outline is
  // ~700), so at dashoffset=0 the entire path sits inside the first dash of
  // the pattern with zero measurement dependency, and the loop closes.
  // The gap "always at the same spot" symptom disappears because there is no
  // "spot" any more - the whole path is one continuous dash.
  const DASH = 2000
  const traceDuration = 2.6
  const traceDelay = 0.4

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={`block ${className}`}
      aria-hidden="true"
      overflow="visible"
    >
      {/* Fill fades in after the outline finishes drawing */}
      {showFill && (
        <motion.path
          d={pathD}
          fill={fill}
          stroke="none"
          initial={{ fillOpacity: 0 }}
          animate={{ fillOpacity }}
          transition={{ duration: 0.6, delay: 2.4, ease: 'easeOut' }}
        />
      )}

      {/* Pencil-stroke outline traced on mount. strokeDasharray stays static
         at DASH (way above the path's own length), strokeDashoffset animates
         from DASH down to 0 - equivalent to a "reveal from start to end"
         effect but without any DOM measurement. */}
      {showStroke && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeOpacity={0.95}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          strokeDasharray={DASH}
          initial={{ strokeDashoffset: DASH }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: traceDuration, delay: traceDelay, ease: [0.65, 0, 0.35, 1] }}
        />
      )}
    </svg>
  )
}

