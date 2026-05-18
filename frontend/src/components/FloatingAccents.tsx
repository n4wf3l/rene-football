import { memo } from 'react'
import { motion } from 'framer-motion'

interface AccentDot {
  /** Top position (CSS, 0 → 100). */
  top: number
  /** Left position (CSS, 0 → 100). */
  left: number
  /** Diameter in pixels. */
  size: number
  /** Per-dot drift duration. */
  duration: number
  /** Animation delay in seconds (so dots are out of phase). */
  delay: number
  /** Min opacity in the breath. */
  baseOpacity: number
}

const DOTS: AccentDot[] = [
  { top: 22, left: 12, size: 6, duration: 9,  delay: 0,   baseOpacity: 0.35 },
  { top: 66, left: 18, size: 4, duration: 11, delay: 1.6, baseOpacity: 0.30 },
  { top: 38, left: 88, size: 5, duration: 10, delay: 0.8, baseOpacity: 0.40 },
  { top: 78, left: 72, size: 6, duration: 13, delay: 2.4, baseOpacity: 0.35 },
  { top: 14, left: 56, size: 3, duration: 8,  delay: 3.0, baseOpacity: 0.25 },
  { top: 90, left: 42, size: 4, duration: 12, delay: 1.2, baseOpacity: 0.30 },
]

/* Glowing turf accents that float in a section background - six points slowly
   drift on independent loops, breathing in opacity. Pointer-events disabled.
   Memoized so the rest of the page never causes them to rerender. */
function FloatingAccentsBase() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {DOTS.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-turf-300"
          style={{
            top: `${d.top}%`,
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            boxShadow: `0 0 ${d.size * 2}px rgba(132,184,150,0.65)`,
          }}
          animate={{
            y: [0, -16, 8, 0],
            x: [0, 10, -6, 0],
            opacity: [d.baseOpacity, d.baseOpacity * 2.4, d.baseOpacity * 1.5, d.baseOpacity],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{
            duration: d.duration,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: d.delay,
          }}
        />
      ))}
    </div>
  )
}

const FloatingAccents = memo(FloatingAccentsBase)
export default FloatingAccents
