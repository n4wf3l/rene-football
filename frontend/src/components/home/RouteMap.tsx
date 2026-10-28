import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { geoGraticule, geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson'
import { useTranslation } from 'react-i18next'
import ScrambleText from './ScrambleText'
import luxembourgData from '../../data/luxembourg.json'
import { LUXEMBOURG, distanceKm, locateClub } from '../../lib/clubLocations'
import type { Player } from '../../types/player'

const W = 800
const H = 640
const RINGS_KM = [50, 100, 200]
/** Seconds spent drawing each route once the map comes into view. */
const SECONDS_PER_ROUTE = 0.65

const luxembourgFeature = luxembourgData as Feature<Polygon, { name: string }>

interface Destination {
  id: string
  club: string
  short: string
  players: Player[]
  km: number
  x: number
  y: number
  /** Route as a quadratic curve from Luxembourg. */
  d: string
  start: number
  end: number
}

interface RouteMapProps {
  players: Player[]
}

function point(lon: number, lat: number): Feature<Geometry> {
  return { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lon, lat] } }
}

/**
 * Route map: from the agency's base in Luxembourg, one route per club where
 * a represented player is listed. The routes draw themselves once, on a timer,
 * when the map comes into view - the page scroll is never pinned or slowed.
 * Real data only - clubs without a known location are left out, and the
 * section hides itself under two destinations.
 */
function RouteMap({ players }: RouteMapProps) {
  const model = useMemo(() => buildModel(players), [players])
  return model.destinations.length < 2 ? null : <RouteScene model={model} />
}

type MapModel = ReturnType<typeof buildModel>

function buildModel(players: Player[]) {
  const groups = new Map<string, { club: string; short: string; lat: number; lon: number; players: Player[] }>()
  for (const p of players) {
    const loc = locateClub(p.club)
    if (!loc) continue
    const g = groups.get(loc.id) ?? { club: p.club ?? '', short: loc.short, lat: loc.lat, lon: loc.lon, players: [] }
    g.players.push(p)
    groups.set(loc.id, g)
  }
  const list = [...groups.entries()]
    .map(([id, g]) => ({ id, ...g, km: distanceKm(LUXEMBOURG, g) }))
    .sort((a, b) => a.km - b.km)

  // Frame Luxembourg + every destination, never tighter than ~2 degrees
  // around the base so a single nearby club doesn't zoom the map absurdly.
  const frame: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      luxembourgFeature as Feature<Geometry>,
      point(LUXEMBOURG.lon - 1.0, LUXEMBOURG.lat - 0.5),
      point(LUXEMBOURG.lon + 1.0, LUXEMBOURG.lat + 0.5),
      ...list.map((g) => point(g.lon, g.lat)),
    ],
  }
  const projection = geoMercator().fitExtent([[120, 60], [W - 120, H - 60]], frame)
  const path = geoPath(projection)
  const [ox, oy] = projection([LUXEMBOURG.lon, LUXEMBOURG.lat]) ?? [W / 2, H / 2]

  const span = 1 / Math.max(list.length, 1)
  const destinations: Destination[] = list.map((g, i) => {
    const [x, y] = projection([g.lon, g.lat]) ?? [ox, oy]
    // Control point pushed sideways from the chord: routes bow like flight paths.
    const mx = (ox + x) / 2
    const my = (oy + y) / 2
    const bend = 0.22 * (i % 2 === 0 ? 1 : -1)
    const cx = mx - (y - oy) * bend
    const cy = my + (x - ox) * bend
    const start = i * span
    return {
      id: g.id,
      club: g.club,
      short: g.short,
      players: g.players,
      km: g.km,
      x,
      y,
      d: `M${ox},${oy} Q${cx},${cy} ${x},${y}`,
      start,
      end: start + span * 0.85,
    }
  })

  const rings = RINGS_KM.map((km) => {
    const [, ry] = projection([LUXEMBOURG.lon, LUXEMBOURG.lat + km / 111.2]) ?? [ox, oy]
    return { km, r: Math.abs(oy - ry) }
  })

  return {
    destinations,
    origin: { x: ox, y: oy },
    rings,
    graticule: path(geoGraticule().step([1, 1])()) ?? '',
    country: path(luxembourgFeature) ?? '',
  }
}

function RouteScene({ model }: { model: MapModel }) {
  const { t, i18n } = useTranslation()
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement | null>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.35 })
  const full = useMotionValue(1)
  const drawn = useMotionValue(0)
  const progress = reduce ? full : drawn

  const { destinations, origin, rings } = model
  const [active, setActive] = useState(reduce ? destinations.length - 1 : -1)

  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(drawn, 1, {
      duration: destinations.length * SECONDS_PER_ROUTE,
      ease: 'linear',
    })
    return () => controls.stop()
  }, [inView, reduce, drawn, destinations.length])

  useMotionValueEvent(drawn, 'change', (v) => {
    let next = -1
    destinations.forEach((d, i) => { if (v >= d.start) next = i })
    if (next !== active) setActive(next)
  })

  const shown = active >= 0 ? destinations[active] : null
  const fmt = (n: number) => Math.round(n).toLocaleString(i18n.resolvedLanguage)

  return (
    <section ref={sectionRef} className="relative bg-zinc-950 text-stone-100">
      <div className="relative flex items-center overflow-hidden py-20 lg:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 55% 60% at 68% 50%, rgba(30,64,175,0.22), transparent 70%)' }}
        />
        <div className="container-page grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <span className="eyebrow text-turf-300 dark:text-turf-300">{t('home.map.eyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-[0.98] tracking-tightest sm:text-4xl lg:mt-4 lg:text-6xl">
              {t('home.map.title')} <span className="text-turf-300">{t('home.map.titleAccent')}</span>
            </h2>
            <p className="mt-6 hidden max-w-[42ch] leading-relaxed text-stone-400 sm:block">{t('home.map.paragraph')}</p>

            {/* Live readout - follows the route currently being drawn */}
            <div className="mt-5 border-t border-stone-50/10 pt-4 lg:mt-10 lg:pt-6" aria-live="polite">
              <div className="flex items-baseline justify-between font-mono text-[0.68rem] uppercase tracking-[0.22em] text-stone-500">
                <span>{t('home.map.routeLabel')}</span>
                <span className="tabular-nums">
                  {String(Math.max(active + 1, 0)).padStart(2, '0')} / {String(destinations.length).padStart(2, '0')}
                </span>
              </div>
              <div className="mt-2 min-h-[4.5rem] lg:mt-3 lg:min-h-[5.5rem]">
                {shown ? (
                  <>
                    <ScrambleText
                      text={shown.club.toUpperCase()}
                      baseMs={120}
                      stepMs={22}
                      className="block font-display text-2xl font-semibold leading-tight tracking-tight text-stone-50 lg:text-3xl"
                    />
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                      <span className="font-mono tabular-nums text-turf-300">
                        {fmt(shown.km)} {t('home.map.kmFrom')}
                      </span>
                      <span className="text-stone-400">
                        {shown.players.map((p, i) => (
                          <span key={p.slug}>
                            {i > 0 && ', '}
                            <Link to={`/joueurs/${p.slug}`} className="hover:text-stone-50 underline-offset-4 hover:underline">
                              {p.name}
                            </Link>
                          </span>
                        ))}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative lg:col-span-8">
            <div className="relative mx-auto w-full max-w-[860px]" style={{ aspectRatio: `${W} / ${H}` }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
                <path d={model.graticule} fill="none" stroke="rgb(245 245 244 / 0.06)" strokeWidth={1} />
                {rings.map((ring) => (
                  <g key={ring.km}>
                    <circle
                      cx={origin.x}
                      cy={origin.y}
                      r={ring.r}
                      fill="none"
                      stroke="rgb(147 197 253 / 0.14)"
                      strokeDasharray="2 6"
                    />
                    <text
                      x={origin.x + 6}
                      y={origin.y - ring.r - 6}
                      fill="rgb(147 197 253 / 0.45)"
                      fontSize={12}
                      fontFamily="Geist Mono, monospace"
                    >
                      {ring.km} km
                    </text>
                  </g>
                ))}
                <path d={model.country} fill="rgb(96 165 250 / 0.22)" stroke="rgb(147 197 253 / 0.9)" strokeWidth={1.4} />
                {destinations.map((d) => (
                  <Route key={d.id} d={d.d} progress={progress} start={d.start} end={d.end} />
                ))}
                {destinations.map((d) => (
                  <Pin key={d.id} x={d.x} y={d.y} progress={progress} at={d.end} />
                ))}
                <circle cx={origin.x} cy={origin.y} r={5} fill="rgb(245 245 244)" />
                {!reduce && (
                  <motion.circle
                    cx={origin.x}
                    cy={origin.y}
                    r={5}
                    fill="none"
                    stroke="rgb(147 197 253)"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 5, opacity: 0 }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                    style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
                  />
                )}
              </svg>

              {/* HTML labels keep a readable size whatever the SVG scale */}
              <MapLabel x={origin.x} y={origin.y} side="right" progress={full} at={0}>
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-stone-50">
                  {t('home.map.base')}
                </span>
              </MapLabel>
              {destinations.map((d) => (
                <MapLabel key={d.id} x={d.x} y={d.y} side={d.x < origin.x || d.x > W * 0.7 ? 'left' : 'right'} progress={progress} at={d.end}>
                  <span className={`block font-display text-[0.8rem] font-semibold leading-tight sm:text-sm ${shown?.id === d.id ? 'text-turf-300' : 'text-stone-100'}`}>
                    <span className="sm:hidden">{d.short}</span>
                    <span className="hidden sm:inline">{d.club}</span>
                  </span>
                  <span className="hidden font-mono text-[0.62rem] tabular-nums text-stone-500 sm:block">
                    {fmt(d.km)} km
                  </span>
                </MapLabel>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

interface RouteProps {
  d: string
  progress: MotionValue<number>
  start: number
  end: number
}

function Route({ d, progress, start, end }: RouteProps) {
  const length = useTransform(progress, [start, end], [0, 1], { clamp: true })
  return (
    <>
      <path d={d} fill="none" stroke="rgb(245 245 244 / 0.07)" strokeWidth={1} strokeDasharray="3 5" />
      <motion.path
        d={d}
        fill="none"
        stroke="rgb(147 197 253)"
        strokeWidth={1.8}
        strokeLinecap="round"
        style={{ pathLength: length }}
      />
    </>
  )
}

interface PinProps {
  x: number
  y: number
  progress: MotionValue<number>
  at: number
}

function Pin({ x, y, progress, at }: PinProps) {
  const scale = useTransform(progress, [at - 0.015, at + 0.01], [0, 1], { clamp: true })
  return (
    <motion.g style={{ scale, transformOrigin: `${x}px ${y}px` }}>
      <circle cx={x} cy={y} r={10} fill="rgb(147 197 253 / 0.18)" />
      <circle cx={x} cy={y} r={4} fill="rgb(147 197 253)" />
    </motion.g>
  )
}

interface MapLabelProps {
  x: number
  y: number
  side: 'left' | 'right' | 'below'
  progress: MotionValue<number>
  at: number
  children: ReactNode
}

function MapLabel({ x, y, side, progress, at, children }: MapLabelProps) {
  const opacity = useTransform(progress, [at - 0.01, at + 0.02], [0, 1], { clamp: true })
  const place =
    side === 'below'
      ? 'translate(-50%, 14px)'
      : side === 'left'
        ? 'translate(calc(-100% - 14px), -50%)'
        : 'translate(14px, -50%)'
  return (
    <div
      className={`pointer-events-none absolute whitespace-nowrap ${side === 'left' ? 'text-right' : ''}`}
      style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: place }}
    >
      <motion.div style={{ opacity }}>{children}</motion.div>
    </div>
  )
}

export default RouteMap
