import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

/**
 * Route-level fade + subtle slide-up. Fires on every route change AND on a
 * full page refresh (because the wrapper mounts fresh either way), so the
 * new content lands with a beat instead of popping in.
 *
 * `key` is bound to the pathname so React remounts the motion.div whenever
 * the route changes, which triggers Framer Motion's `initial` state again.
 *
 * Historical note: this used AnimatePresence `mode="wait"` to chain exit →
 * enter cleanly, but under fast navigation (double-click, quick tab switch)
 * the exit could get interrupted and leave the enter animation in a stuck
 * `opacity: 0` state — the new page was there in the DOM but invisible until
 * the user refreshed. We now let the enter animation run standalone on
 * remount (no AnimatePresence, no exit), which is more predictable at the
 * cost of no cross-fade between pages. ScrollToTop still handles the scroll
 * reset independently.
 *
 * Respects `prefers-reduced-motion`: users who opt out get an instant swap.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const reduce = useReducedMotion()

  if (reduce) return <>{children}</>

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  )
}
