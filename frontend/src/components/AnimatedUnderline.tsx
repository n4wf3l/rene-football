import { useEffect, useRef } from 'react'
import { animate, useInView, useMotionValue, motion } from 'framer-motion'

export interface AnimatedUnderlineProps {
  /** Width of the line in pixels. */
  width?: number
  /** Stroke thickness. */
  thickness?: number
  /** Tailwind color name fragment, e.g. "turf-700". Falls back to currentColor. */
  colorClass?: string
  className?: string
}

/* SVG line that "draws" itself from left to right when it scrolls into view.
   Uses framer-motion's `pathLength` animation (which is GPU-cheap and works
   even with a straight horizontal stroke). */
export default function AnimatedUnderline({
  width = 56,
  thickness = 2,
  colorClass = 'text-turf-700 dark:text-turf-300',
  className = '',
}: AnimatedUnderlineProps) {
  const ref = useRef<SVGSVGElement | null>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const pathLength = useMotionValue(0)

  useEffect(() => {
    if (!inView) return
    const ctrl = animate(pathLength, 1, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.1,
    })
    return () => ctrl.stop()
  }, [inView, pathLength])

  return (
    <svg
      ref={ref}
      width={width}
      height={thickness}
      viewBox={`0 0 ${width} ${thickness}`}
      fill="none"
      className={`block ${colorClass} ${className}`}
      aria-hidden="true"
    >
      <motion.line
        x1={0}
        y1={thickness / 2}
        x2={width}
        y2={thickness / 2}
        stroke="currentColor"
        strokeWidth={thickness}
        strokeLinecap="round"
        style={{ pathLength }}
      />
    </svg>
  )
}
