import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { ArrowsClockwise, Eraser, Trash } from '@phosphor-icons/react'
import { COLS, ROWS, type HeatmapGrid, emptyGrid, heatmapFromPosition, setCell } from '../lib/heatmap'

const VW = 600
const VH = 400
const PAD = 10
const FW = VW - 2 * PAD
const FH = VH - 2 * PAD
const CW = FW / COLS
const CH = FH / ROWS

/**
 * Standard football heatmap ramp (yellow → orange → red → deep red).
 * Uses a warm palette on top of the green pitch so intensity levels are
 * legible at a glance instead of being lost in turf-on-turf tints. Mirrors
 * the ramp used server-side in the PDF renderer so the on-screen preview
 * and the exported document look consistent.
 */
function intensityFill(v: number): string {
  if (v <= 0) return 'transparent'
  const stops: Array<[number, number, number, number]> = [
    [0,   250, 204,  21],   // #facc15  yellow
    [33,  249, 115,  22],   // #f97316  orange
    [66,  239,  68,  68],   // #ef4444  red
    [100, 190,  18,  60],   // #be123c  deep red
  ]
  const clamped = Math.max(0, Math.min(100, v))
  let [r, g, b] = [stops[stops.length - 1][1], stops[stops.length - 1][2], stops[stops.length - 1][3]]
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, r0, g0, b0] = stops[i]
    const [t1, r1, g1, b1] = stops[i + 1]
    if (clamped >= t0 && clamped <= t1) {
      const k = t1 === t0 ? 0 : (clamped - t0) / (t1 - t0)
      r = Math.round(r0 + (r1 - r0) * k)
      g = Math.round(g0 + (g1 - g0) * k)
      b = Math.round(b0 + (b1 - b0) * k)
      break
    }
  }
  // Opacity ramps too so low-intensity cells stay subtle even when warm.
  const opacity = 0.30 + (clamped / 100) * 0.60
  return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})`
}

/* ---- Pitch lines (own + opponent halves identical, mirrored). ---- */
function PitchLines({ stroke = 'rgba(255,255,255,0.55)' }: { stroke?: string }) {
  return (
    <g
      fill="none"
      stroke={stroke}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none"
    >
      {/* outer */}
      <rect x={PAD} y={PAD} width={FW} height={FH} rx={6} />
      {/* halfway */}
      <line x1={VW / 2} y1={PAD} x2={VW / 2} y2={VH - PAD} />
      {/* center circle + spot */}
      <circle cx={VW / 2} cy={VH / 2} r={50} />
      <circle cx={VW / 2} cy={VH / 2} r={2.5} fill={stroke} />
      {/* left penalty area (16.5m × 40.3m, scale ≈5.52 → 91 × 222) */}
      <rect x={PAD} y={VH / 2 - 111} width={91} height={222} />
      {/* left goal area (5.5m × 18.3m → 30 × 101) */}
      <rect x={PAD} y={VH / 2 - 50.5} width={30} height={101} />
      {/* left penalty spot */}
      <circle cx={PAD + 60.5} cy={VH / 2} r={2.5} fill={stroke} />
      {/* right penalty area */}
      <rect x={VW - PAD - 91} y={VH / 2 - 111} width={91} height={222} />
      {/* right goal area */}
      <rect x={VW - PAD - 30} y={VH / 2 - 50.5} width={30} height={101} />
      {/* right penalty spot */}
      <circle cx={VW - PAD - 60.5} cy={VH / 2} r={2.5} fill={stroke} />
      {/* goals */}
      <rect x={PAD - 5} y={VH / 2 - 22} width={5} height={44} />
      <rect x={VW - PAD} y={VH / 2 - 22} width={5} height={44} />
    </g>
  )
}

interface PitchProps {
  grid?: HeatmapGrid | null
  mode?: 'view' | 'paint'
  position?: string
  slug?: string
  onChange?: (next: HeatmapGrid) => void
  /** Nice-to-have: hide the toolbar in paint mode (caller renders its own). */
  hideToolbar?: boolean
  className?: string
}

const BRUSH_LEVELS: { value: number; label: string }[] = [
  { value: 0,   label: 'Effacer' },
  { value: 25,  label: '25' },
  { value: 50,  label: '50' },
  { value: 75,  label: '75' },
  { value: 100, label: '100' },
]

function Pitch({ grid, mode = 'view', position, slug, onChange, hideToolbar = false, className }: PitchProps) {
  const data = useMemo<HeatmapGrid>(
    () => (grid && grid.length === ROWS ? grid : emptyGrid()),
    [grid],
  )
  const svgRef = useRef<SVGSVGElement | null>(null)
  const filterId = useId()
  const [brush, setBrush] = useState<number>(50)
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null)
  const dragging = useRef(false)

  const cellAt = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const local = pt.matrixTransform(ctm.inverse())
    const x = local.x - PAD
    const y = local.y - PAD
    if (x < 0 || y < 0 || x > FW || y > FH) return null
    const col = Math.max(0, Math.min(COLS - 1, Math.floor(x / CW)))
    const row = Math.max(0, Math.min(ROWS - 1, Math.floor(y / CH)))
    return { row, col }
  }, [])

  const paint = useCallback(
    (clientX: number, clientY: number) => {
      const at = cellAt(clientX, clientY)
      if (!at) return
      if (data[at.row]?.[at.col] === brush) return
      onChange?.(setCell(data, at.row, at.col, brush))
    },
    [brush, cellAt, data, onChange],
  )

  const isPaint = mode === 'paint' && !!onChange

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPaint) return
    dragging.current = true
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    paint(e.clientX, e.clientY)
  }
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const at = cellAt(e.clientX, e.clientY)
    setHover(at)
    if (!isPaint || !dragging.current) return
    paint(e.clientX, e.clientY)
  }
  const handlePointerUp = () => { dragging.current = false }
  const handlePointerLeave = () => { dragging.current = false; setHover(null) }

  const reset = () => onChange?.(emptyGrid())
  const auto = () => {
    if (!position || !slug) return
    onChange?.(heatmapFromPosition(position, slug))
  }

  return (
    <div className={className}>
      {isPaint && !hideToolbar && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[0.65rem] uppercase tracking-[0.16em] font-mono text-zinc-500 dark:text-stone-400 mr-1">
            Pinceau
          </span>
          {BRUSH_LEVELS.map((lvl) => (
            <button
              key={lvl.value}
              type="button"
              onClick={() => setBrush(lvl.value)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-medium border transition-colors ${
                brush === lvl.value
                  ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                  : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
              }`}
            >
              {lvl.value === 0 ? (
                <Eraser size={12} weight="bold" />
              ) : (
                <span
                  aria-hidden
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: intensityFill(lvl.value), border: '1px solid rgba(0,0,0,0.2)' }}
                />
              )}
              {lvl.label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2">
            {position && slug && (
              <button
                type="button"
                onClick={auto}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-medium bg-turf-50 border border-turf-200 text-turf-800 hover:bg-turf-100 dark:bg-turf-800/30 dark:border-turf-300/30 dark:text-turf-200 dark:hover:bg-turf-800/50 transition-colors"
                title="Régénérer depuis le poste"
              >
                <ArrowsClockwise size={12} weight="bold" /> Auto
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-medium bg-white border border-stone-300 text-zinc-700 hover:border-red-400 hover:text-red-600 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-red-400 dark:hover:text-red-300 transition-colors"
              title="Tout effacer"
            >
              <Trash size={12} weight="bold" /> Reset
            </button>
          </span>
        </div>
      )}

      <div className="relative aspect-[3/2] w-full rounded-2xl overflow-hidden bg-turf-700 dark:bg-turf-900 ring-1 ring-stone-200 dark:ring-stone-50/10">
        {/* Field "grass" pattern via stripes - pure CSS underlay so dompdf doesn't choke. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 8.33%, rgba(0,0,0,0.04) 8.33% 16.66%)',
          }}
        />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="relative block w-full h-full select-none"
          style={{ touchAction: isPaint ? 'none' : 'auto' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          role={isPaint ? 'application' : 'img'}
          aria-label="Heatmap du joueur sur le terrain"
        >
          <defs>
            <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation={mode === 'view' ? 16 : 7} />
            </filter>
          </defs>

          {/* Heatmap layer (under the lines so the lines stay sharp) */}
          <g filter={`url(#${filterId})`} opacity={mode === 'view' ? 0.95 : 0.85}>
            {data.flatMap((row, i) =>
              row.map((v, j) => (
                <rect
                  key={`${i}-${j}`}
                  x={PAD + j * CW}
                  y={PAD + i * CH}
                  width={CW}
                  height={CH}
                  fill={intensityFill(v)}
                />
              )),
            )}
          </g>

          <PitchLines />

          {/* Painter overlay - invisible cells for hit-testing + hover ring */}
          {isPaint && (
            <g>
              {data.flatMap((row, i) =>
                row.map((v, j) => (
                  <g key={`hit-${i}-${j}`}>
                    <rect
                      x={PAD + j * CW}
                      y={PAD + i * CH}
                      width={CW}
                      height={CH}
                      fill="transparent"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={PAD + j * CW + CW / 2}
                      y={PAD + i * CH + CH / 2 + 4}
                      textAnchor="middle"
                      fontSize={11}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fill={v > 50 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)'}
                      pointerEvents="none"
                    >
                      {v}
                    </text>
                  </g>
                )),
              )}
              {hover && (
                <rect
                  x={PAD + hover.col * CW}
                  y={PAD + hover.row * CH}
                  width={CW}
                  height={CH}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {mode === 'view' && (
        <div className="mt-3 flex items-center gap-3 text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
          <span>Faible</span>
          <span
            className="flex-1 h-1.5 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, rgba(250,204,21,0.9), rgba(249,115,22,0.9), rgba(239,68,68,0.95), rgba(190,18,60,1))',
            }}
          />
          <span>Élevée</span>
        </div>
      )}
    </div>
  )
}

export default Pitch
