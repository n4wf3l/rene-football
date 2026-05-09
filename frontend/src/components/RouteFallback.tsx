import { motion } from 'framer-motion'

/* Lightweight Suspense fallback for lazy routes.
   Stays subtle: a slim turf bar slides in at the top, then a centered shimmer dot.
   Avoids layout shift since the previous route's chrome (header, footer) stays mounted. */
function RouteFallback() {
  return (
    <div className="relative min-h-[40vh] flex items-center justify-center">
      <motion.span
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-turf-300 via-turf-500 to-turf-700"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: [0, 0.6, 1] }}
        transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.span
        aria-label="Chargement"
        className="w-3 h-3 rounded-full bg-turf-700"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.05, 0.85] }}
        transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
      />
    </div>
  )
}

export default RouteFallback
