import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { MotionValue } from 'framer-motion'

/**
 * Login backdrop: a tilted tactical board. A 4-3-3 with its passing network,
 * and one ball that keeps circulating through a build-up, as on a match
 * analysis screen. Purely decorative (aria-hidden), one perpetual loop.
 *
 * The board is drawn in a flat 1050 x 680 SVG (a pitch at 10 px per metre)
 * and tilted in CSS 3D; the tilt follows the pointer through motion values
 * owned by the page, so nothing here re-renders on mouse move.
 */

const PW = 1050
const PH = 680

/** 4-3-3 attacking to the right, numbered like a team sheet. */
const PLAYERS: { n: number; x: number; y: number }[] = [
  { n: 1, x: 70, y: 340 },
  { n: 2, x: 250, y: 110 }, { n: 4, x: 220, y: 260 }, { n: 5, x: 220, y: 420 }, { n: 3, x: 250, y: 570 },
  { n: 6, x: 420, y: 340 }, { n: 8, x: 520, y: 210 }, { n: 10, x: 540, y: 470 },
  { n: 7, x: 760, y: 120 }, { n: 9, x: 820, y: 340 }, { n: 11, x: 760, y: 560 },
]

/** The build-up the ball replays, by shirt number. */
const SEQUENCE = [1, 4, 6, 8, 2, 7, 10, 11, 9, 6, 5, 3, 10, 9]

const at = (n: number) => PLAYERS.find((p) => p.n === n) ?? PLAYERS[0]
const PASSES = SEQUENCE.slice(1).map((n, i) => [at(SEQUENCE[i]), at(n)] as const)
const LOOP_SECONDS = 15

interface TacticalSceneProps {
  rotateX: MotionValue<number>
  rotateZ: MotionValue<number>
  /** True once access is granted: the board dives into the centre circle. */
  entering: boolean
}

function TacticalSceneBase({ rotateX, rotateZ, entering }: TacticalSceneProps) {
  const reduce = useReducedMotion()
  const xs = SEQUENCE.map((n) => at(n).x)
  const ys = SEQUENCE.map((n) => at(n).y)
  const times = SEQUENCE.map((_, i) => i / (SEQUENCE.length - 1))

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1400px]">
      {/* Static, responsive size; the motion layer inside only tilts and dives. */}
      <div className="absolute left-1/2 top-[58%] lg:top-1/2 w-[1050px] h-[680px] -ml-[525px] -mt-[340px] scale-[0.5] sm:scale-[0.7] lg:scale-[0.85] xl:scale-100 [transform-style:preserve-3d]">
      <motion.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        style={{ rotateX, rotateZ }}
        animate={entering ? { scale: 3.2, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={entering ? { duration: 1, ease: [0.7, 0, 0.3, 1] } : { duration: 0 }}
      >
        <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id="login-heat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="login-turf" x1="0" x2="1">
              {Array.from({ length: 10 }, (_, i) => (
                <stop key={i} offset={`${i * 10}%`} stopColor={i % 2 ? '#0c1a33' : '#0a1629'} />
              ))}
            </linearGradient>
          </defs>

          {/* Turf with mowing stripes, then the markings */}
          <rect x="0" y="0" width={PW} height={PH} rx="6" fill="url(#login-turf)" />
          <g fill="none" stroke="#93c5fd" strokeOpacity="0.28" strokeWidth="2">
            <rect x="0" y="0" width={PW} height={PH} rx="6" />
            <line x1={PW / 2} y1="0" x2={PW / 2} y2={PH} />
            <circle cx={PW / 2} cy={PH / 2} r="91.5" />
            <rect x="0" y={PH / 2 - 201.5} width="165" height="403" />
            <rect x={PW - 165} y={PH / 2 - 201.5} width="165" height="403" />
            <rect x="0" y={PH / 2 - 91.5} width="55" height="183" />
            <rect x={PW - 55} y={PH / 2 - 91.5} width="55" height="183" />
            <path d={`M165,${PH / 2 - 73} A91.5,91.5 0 0 1 165,${PH / 2 + 73}`} />
            <path d={`M${PW - 165},${PH / 2 - 73} A91.5,91.5 0 0 0 ${PW - 165},${PH / 2 + 73}`} />
          </g>
          <circle cx={PW / 2} cy={PH / 2} r="3" fill="#93c5fd" fillOpacity="0.5" />

          {/* Where the team lives: a soft heat zone on the right half-space */}
          <ellipse cx="690" cy="300" rx="300" ry="210" fill="url(#login-heat)" />

          {/* Passing network: every link of the build-up, faint */}
          <g stroke="#93c5fd" strokeOpacity="0.22" strokeWidth="1.5" strokeDasharray="4 7">
            {PASSES.map(([a, b], i) => (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            ))}
          </g>

          {/* Players */}
          {PLAYERS.map((p) => (
            <g key={p.n}>
              <circle cx={p.x} cy={p.y} r="22" fill="#2563eb" fillOpacity="0.16" />
              <circle cx={p.x} cy={p.y} r="13" fill="#0a1629" stroke="#93c5fd" strokeWidth="2" />
              <text
                x={p.x}
                y={p.y + 4.5}
                textAnchor="middle"
                fontSize="13"
                fontFamily="Geist Mono, monospace"
                fill="#e0ecff"
              >
                {p.n}
              </text>
            </g>
          ))}

          {/* The ball, replaying the build-up */}
          {!reduce && (
            <motion.circle
              r="6"
              fill="#fafaf9"
              initial={{ cx: xs[0], cy: ys[0] }}
              animate={{ cx: xs, cy: ys }}
              transition={{ duration: LOOP_SECONDS, times, ease: 'easeInOut', repeat: Infinity }}
              style={{ filter: 'drop-shadow(0 0 6px rgba(147,197,253,0.9))' }}
            />
          )}
        </svg>
      </motion.div>
      </div>
    </div>
  )
}

const TacticalScene = memo(TacticalSceneBase)
export default TacticalScene
