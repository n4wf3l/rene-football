import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowUp } from '@phosphor-icons/react'

/**
 * Floating scroll-to-top button.
 *
 * Used to be a full navbar mirror at the bottom of the viewport (the same
 * pills as the top nav) that competed for attention with the top capsule.
 * Trimmed down to just the scroll-to-top affordance — the same reveal
 * behaviour (appears after 200px scroll depth, hides when scrolling back up)
 * kept intact.
 */
const SHOW_THRESHOLD = 200

function FooterNav() {
  const [visible, setVisible] = useState(false)
  const lastY = useRef(0)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (v) => {
    const dy = v - lastY.current
    if (Math.abs(dy) < 4) return // ignore sub-pixel jitter / trackpad momentum

    if (v <= SHOW_THRESHOLD) {
      if (visible) setVisible(false)
    } else if (dy > 0 && !visible) {
      setVisible(true)
    } else if (dy < 0 && visible) {
      setVisible(false)
    }
    lastY.current = v
  })

  const scrollTop = () => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-top"
          type="button"
          onClick={scrollTop}
          aria-label="Remonter en haut de la page"
          title="Remonter en haut"
          initial={{ y: 40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 grid place-items-center w-11 h-11 rounded-full bg-turf-800 text-stone-50 hover:bg-turf-700 transition-colors shadow-[0_16px_32px_-12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.14)]"
        >
          <ArrowUp size={17} weight="bold" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export default FooterNav
