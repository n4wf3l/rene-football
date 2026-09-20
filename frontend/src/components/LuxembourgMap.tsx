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
  padding = 10,
}: LuxembourgMapProps) {
  // Single projection drives the outline - fitExtent guarantees the
  // silhouette fills the viewBox exactly regardless of the country's shape.
  const pathD = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [padding, padding],
        [width - padding, height - padding],
      ],
      luxembourgFeature,
    )
    return geoPath(projection)(luxembourgFeature) ?? ''
  }, [width, height, padding])

  const fill = fillColor ?? strokeColor

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={`block ${className}`}
      aria-hidden="true"
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

      {/* Pencil-stroke outline drawn on mount */}
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
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.6, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
        />
      )}
    </svg>
  )
}

