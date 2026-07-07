import { useEffect, useRef, useState } from 'react'
import { subscribeToApiActivity } from '../api/client'

/**
 * Thin progress bar that appears at the very top of the viewport whenever any
 * `api.*` request is in flight, and animates to completion once the last one
 * settles. YouTube / GitHub / NProgress style.
 *
 * Behaviour:
 * - Bar climbs to ~85% asymptotically while requests are running (so it never
 *   stalls at the same spot for long even on slow endpoints).
 * - When the count returns to 0, we snap to 100% then fade the whole element
 *   out so the next request starts from an empty bar.
 */
export default function TopLoadingBar() {
  const [progress, setProgress] = useState(0)  // 0..1
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const fadeTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return subscribeToApiActivity((count) => {
      if (count > 0) {
        // Something is in flight - show and start climbing.
        if (fadeTimeoutRef.current) {
          window.clearTimeout(fadeTimeoutRef.current)
          fadeTimeoutRef.current = null
        }
        setVisible(true)
        setProgress((p) => (p === 0 ? 0.08 : p))
        if (intervalRef.current == null) {
          intervalRef.current = window.setInterval(() => {
            setProgress((p) => {
              // Asymptotic climb toward 0.85 - never quite gets there so the
              // completion snap always feels earned.
              const remaining = 0.85 - p
              if (remaining <= 0) return p
              return p + Math.max(0.005, remaining * 0.08)
            })
          }, 180)
        }
      } else {
        // No more requests: snap to full, then fade out.
        if (intervalRef.current != null) {
          window.clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setProgress(1)
        fadeTimeoutRef.current = window.setTimeout(() => {
          setVisible(false)
          // Reset after the fade so the next request starts clean.
          window.setTimeout(() => setProgress(0), 220)
        }, 220)
      }
    })
  }, [])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed top-0 left-0 right-0 z-[100] h-[2px] transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="h-full bg-gradient-to-r from-turf-500 via-turf-400 to-turf-300 shadow-[0_0_10px_rgba(45,125,79,0.55)] transition-[width] duration-200 ease-out"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  )
}
