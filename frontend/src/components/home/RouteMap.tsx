import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { LUXEMBOURG, clubLabel, distanceKm, locateClub } from '../../lib/clubLocations'
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
    const g = groups.get(loc.id) ?? { club: clubLabel(p.club ?? '', loc), short: loc.short, lat: loc.lat, lon: loc.lon, players: [] }
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

type Side = 'left' | 'right'

interface Placement {
  side: Side
  /** Vertical shift of the label, in CSS pixels. */
  dy: number
}

interface Rect { l: number; t: number; r: number; b: number }

/** Distance between a pin and its label, in CSS pixels. */
const LABEL_GAP = 14
const LABEL_PAD = 3
const PIN_RADIUS = 8

function defaultSide(d: Destination, origin: { x: number }): Side {
  return d.x < origin.x || d.x > W * 0.7 ? 'left' : 'right'
}

/**
 * Places the club labels so that none of them overlaps another label, the
 * base label or another club's pin. Works on the labels' real rendered size
 * (it depends on the screen, the font and the language): each label keeps its
 * natural side when it can, otherwise slides up or down, then tries the other
 * side. Labels moved away from their pin get a leader line.
 */
function layoutLabels(
  box: HTMLElement,
  labels: Map<string, HTMLElement>,
  destinations: Destination[],
  origin: { x: number; y: number },
): { clubs: Record<string, Placement>; base: 'right' | 'below' } {
  const cw = box.clientWidth
  const ch = box.clientHeight
  if (!cw || !ch) return { clubs: {}, base: 'right' }
  const sx = cw / W
  const sy = ch / H
  const hits = (a: Rect, b: Rect) =>
    a.l < b.r + LABEL_PAD && a.r + LABEL_PAD > b.l && a.t < b.b + LABEL_PAD && a.b + LABEL_PAD > b.t
  const around = (x: number, y: number): Rect => ({ l: x - PIN_RADIUS, r: x + PIN_RADIUS, t: y - PIN_RADIUS, b: y + PIN_RADIUS })

  const ox = origin.x * sx
  const oy = origin.y * sy
  const taken: Rect[] = [around(ox, oy)]
  // The base label sits right of Luxembourg, or below it when that would
  // run off a narrow screen.
  const base = labels.get(BASE_LABEL)
  let baseSide: 'right' | 'below' = 'right'
  if (base) {
    const bw = base.offsetWidth
    const bh = base.offsetHeight
    baseSide = ox + LABEL_GAP + bw <= cw ? 'right' : 'below'
    taken.push(baseSide === 'right'
      ? { l: ox + LABEL_GAP, r: ox + LABEL_GAP + bw, t: oy - bh / 2, b: oy + bh / 2 }
      : { l: ox - bw / 2, r: ox + bw / 2, t: oy + LABEL_GAP, b: oy + LABEL_GAP + bh })
  }
  const pins = new Map(destinations.map((d) => [d.id, around(d.x * sx, d.y * sy)]))

  const out: Record<string, Placement> = {}
  for (const d of [...destinations].sort((a, b) => a.y - b.y)) {
    const el = labels.get(d.id)
    if (!el) continue
    const w = el.offsetWidth
    const h = el.offsetHeight
    const ax = d.x * sx
    const ay = d.y * sy
    const step = Math.max(4, h / 3)
    const preferred = defaultSide(d, origin)
    const other: Side = preferred === 'left' ? 'right' : 'left'
    const shift = (k: number) => (k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step)
    const rectFor = (side: Side, dy: number): Rect => {
      const l = side === 'left' ? ax - LABEL_GAP - w : ax + LABEL_GAP
      return { l, r: l + w, t: ay - h / 2 + dy, b: ay + h / 2 + dy }
    }
    const obstacles = [...taken, ...[...pins].filter(([id]) => id !== d.id).map(([, r]) => r)]
    const fits = (r: Rect) => r.l >= 0 && r.r <= cw && r.t >= 0 && r.b <= ch && !obstacles.some((o) => hits(r, o))

    // Same side first (stacking reads best), then the other side, then
    // larger shifts on the natural side.
    const candidates: Placement[] = [
      ...Array.from({ length: 10 }, (_, k) => ({ side: preferred, dy: shift(k) })),
      ...Array.from({ length: 10 }, (_, k) => ({ side: other, dy: shift(k) })),
      ...Array.from({ length: 10 }, (_, k) => ({ side: preferred, dy: shift(k + 10) })),
    ]
    const chosen = candidates.find((c) => fits(rectFor(c.side, c.dy))) ?? { side: preferred, dy: 0 }
    taken.push(rectFor(chosen.side, chosen.dy))
    out[d.id] = chosen
  }
  return { clubs: out, base: baseSide }
}

const BASE_LABEL = '__base'

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

  // Label placement, recomputed whenever the map's rendered size or the
  // labels' text (language, breakpoint) changes.
  const mapRef = useRef<HTMLDivElement | null>(null)
  const labelEls = useRef(new Map<string, HTMLElement>())
  const [placement, setPlacement] = useState<Record<string, Placement>>({})
  const [baseSide, setBaseSide] = useState<'right' | 'below'>('right')
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const box = mapRef.current
    if (!box) return
    let frame = 0
    const run = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setScale(box.clientWidth / W || 1)
        const layout = layoutLabels(box, labelEls.current, destinations, origin)
        setPlacement(layout.clubs)
        setBaseSide(layout.base)
      })
    }
    run()
    document.fonts?.ready.then(run).catch(() => {})
    const observer = new ResizeObserver(run)
    observer.observe(box)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [destinations, origin, i18n.resolvedLanguage])

  const labelRef = (id: string) => (el: HTMLElement | null) => {
    if (el) labelEls.current.set(id, el)
    else labelEls.current.delete(id)
  }

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
    <section ref={sectionRef} className="relative bg-white text-zinc-900 dark:bg-zinc-950 dark:text-stone-100">
      <div className="relative flex items-center overflow-hidden py-20 lg:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-100"
          style={{ background: 'radial-gradient(ellipse 55% 60% at 68% 50%, rgba(30,64,175,0.22), transparent 70%)' }}
        />
        <div className="container-page grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <span className="eyebrow">{t('home.map.eyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-[0.98] tracking-tightest sm:text-4xl lg:mt-4 lg:text-6xl">
              {t('home.map.title')} <span className="text-turf-700 dark:text-turf-300">{t('home.map.titleAccent')}</span>
            </h2>
            <p className="mt-6 hidden max-w-[42ch] leading-relaxed text-zinc-600 dark:text-stone-400 sm:block">{t('home.map.paragraph')}</p>

            {/* Live readout - follows the route currently being drawn */}
            <div className="mt-5 border-t border-zinc-950/10 pt-4 dark:border-stone-50/10 lg:mt-10 lg:pt-6" aria-live="polite">
              <div className="flex items-baseline justify-between font-mono text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500 dark:text-stone-500">
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
                      className="block font-display text-2xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-stone-50 lg:text-3xl"
                    />
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                      <span className="font-mono tabular-nums text-turf-700 dark:text-turf-300">
                        {fmt(shown.km)} {t('home.map.kmFrom')}
                      </span>
                      <span className="text-zinc-600 dark:text-stone-400">
                        {shown.players.map((p, i) => (
                          <span key={p.slug}>
                            {i > 0 && ', '}
                            <Link to={`/joueurs/${p.slug}`} className="underline-offset-4 hover:text-zinc-950 hover:underline dark:hover:text-stone-50">
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
            <div ref={mapRef} className="relative mx-auto w-full max-w-[860px]" style={{ aspectRatio: `${W} / ${H}` }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
                <path d={model.graticule} fill="none" strokeWidth={1} className="stroke-zinc-950/[0.07] dark:stroke-stone-50/[0.06]" />
                {rings.map((ring) => (
                  <g key={ring.km}>
                    <circle
                      cx={origin.x}
                      cy={origin.y}
                      r={ring.r}
                      fill="none"
                      className="stroke-turf-700/25 dark:stroke-turf-300/[0.14]"
                      strokeDasharray="2 6"
                    />
                    <text
                      x={origin.x + 6}
                      y={origin.y - ring.r - 6}
                      className="fill-turf-700/60 dark:fill-turf-300/45"
                      fontSize={12}
                      fontFamily="Geist Mono, monospace"
                    >
                      {ring.km} km
                    </text>
                  </g>
                ))}
                <path d={model.country} strokeWidth={1.4} className="fill-turf-400/20 stroke-turf-600 dark:fill-turf-400/[0.22] dark:stroke-turf-300/90" />
                {destinations.map((d) => (
                  <Route key={d.id} d={d.d} progress={progress} start={d.start} end={d.end} />
                ))}
                {destinations.map((d) => {
                  const p = placement[d.id]
                  if (!p || Math.abs(p.dy) < 6) return null
                  // Leader from the pin to the edge of a label that had to move.
                  const dir = p.side === 'left' ? -1 : 1
                  return (
                    <Leader key={d.id} progress={progress} at={d.end}
                      x1={d.x} y1={d.y} x2={d.x + (dir * (LABEL_GAP - 3)) / scale} y2={d.y + p.dy / scale} />
                  )
                })}
                {destinations.map((d) => (
                  <Pin key={d.id} x={d.x} y={d.y} progress={progress} at={d.end} />
                ))}
                <circle cx={origin.x} cy={origin.y} r={5} className="fill-zinc-950 dark:fill-stone-50" />
                {!reduce && (
                  <motion.circle
                    cx={origin.x}
                    cy={origin.y}
                    r={5}
                    fill="none"
                    className="stroke-turf-600 dark:stroke-turf-300"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 5, opacity: 0 }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                    style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
                  />
                )}
              </svg>

              {/* HTML labels keep a readable size whatever the SVG scale */}
              <MapLabel x={origin.x} y={origin.y} side={baseSide} progress={full} at={0} labelRef={labelRef(BASE_LABEL)}>
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-zinc-950 dark:text-stone-50">
                  {t('home.map.base')}
                </span>
              </MapLabel>
              {destinations.map((d) => (
                <MapLabel
                  key={d.id}
                  x={d.x}
                  y={d.y}
                  side={placement[d.id]?.side ?? defaultSide(d, origin)}
                  dy={placement[d.id]?.dy ?? 0}
                  progress={progress}
                  at={d.end}
                  labelRef={labelRef(d.id)}
                >
                  <span className={`block font-display text-[0.8rem] font-semibold leading-tight sm:text-sm ${shown?.id === d.id ? 'text-turf-700 dark:text-turf-300' : 'text-zinc-900 dark:text-stone-100'}`}>
                    <span className="sm:hidden">{d.short}</span>
                    <span className="hidden sm:inline">{d.club}</span>
                  </span>
                  <span className="hidden font-mono text-[0.62rem] tabular-nums text-zinc-500 dark:text-stone-500 sm:block">
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
      <path d={d} fill="none" strokeWidth={1} strokeDasharray="3 5" className="stroke-zinc-950/[0.08] dark:stroke-stone-50/[0.07]" />
      <motion.path
        d={d}
        fill="none"
        className="stroke-turf-600 dark:stroke-turf-300"
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
      <circle cx={x} cy={y} r={10} className="fill-turf-600/15 dark:fill-turf-300/[0.18]" />
      <circle cx={x} cy={y} r={4} className="fill-turf-600 dark:fill-turf-300" />
    </motion.g>
  )
}

interface LeaderProps {
  x1: number
  y1: number
  x2: number
  y2: number
  progress: MotionValue<number>
  at: number
}

function Leader({ x1, y1, x2, y2, progress, at }: LeaderProps) {
  const opacity = useTransform(progress, [at - 0.01, at + 0.02], [0, 1], { clamp: true })
  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={1}
      className="stroke-zinc-950/30 dark:stroke-stone-50/30"
      style={{ opacity }}
    />
  )
}

interface MapLabelProps {
  x: number
  y: number
  side: Side | 'below'
  /** Vertical shift in CSS pixels, set by the label layout. */
  dy?: number
  progress: MotionValue<number>
  at: number
  labelRef?: (el: HTMLDivElement | null) => void
  children: ReactNode
}

function MapLabel({ x, y, side, dy = 0, progress, at, labelRef, children }: MapLabelProps) {
  const opacity = useTransform(progress, [at - 0.01, at + 0.02], [0, 1], { clamp: true })
  const place =
    side === 'below'
      ? 'translate(-50%, 14px)'
      : side === 'left'
        ? `translate(calc(-100% - ${LABEL_GAP}px), calc(-50% + ${dy}px))`
        : `translate(${LABEL_GAP}px, calc(-50% + ${dy}px))`
  return (
    <div
      ref={labelRef}
      className={`pointer-events-none absolute whitespace-nowrap ${side === 'left' ? 'text-right' : ''}`}
      style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: place }}
    >
      <motion.div style={{ opacity }}>{children}</motion.div>
    </div>
  )
}

export default RouteMap
