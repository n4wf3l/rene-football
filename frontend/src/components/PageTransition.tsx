import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

/**
 * Route-level fade + subtle slide-up. Fires on every route change AND on a
 * full page refresh (because the wrapper mounts fresh either way), so the
 * new content lands with a beat instead of popping in.
 *
 * `key` is bound to the pathname so React remounts the motion.div whenever
 * the route changes, which triggers Framer Motion's `initial` state again.
 * AnimatePresence keeps the outgoing content in the DOM long enough to fade
 * it out cleanly. `mode="wait"` chains exit → enter so the two frames don't
 * overlap and cause a visible flash.
 *
 * Respects `prefers-reduced-motion`: users who opt out get an instant swap.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const reduce = useReducedMotion()

  const variants = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit:    { opacity: 0, y: -6 },
      }

  return (
    <AnimatePresence mode="wait" initial={true}>
      <motion.div
        key={location.pathname}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={reduce ? { duration: 0 } : { duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        style={{ willChange: reduce ? undefined : 'opacity, transform' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
