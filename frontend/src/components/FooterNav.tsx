import { useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowUp } from '@phosphor-icons/react'

/**
 * Floating bottom companion to the main navbar.
 *
 * Behaviour mirrors the smart-hide top capsule in reverse - when the user
 * scrolls *down* past the threshold, the top navbar tucks away and this one
 * slides up from the bottom with the same glass-capsule styling. Scrolling
 * back up hides it again so the page never shows two capsules at once.
 *
 * The right-side arrow scrolls smoothly to the top. The link list omits the
 * current page so the bar always advertises *the other* destinations.
 */
const NAV = [
  { to: '/',           label: 'Accueil',    end: true },
  { to: '/joueurs',    label: 'Joueurs' },
  { to: '/actualites', label: 'Actualités' },
  { to: '/a-propos',   label: 'À propos' },
  { to: '/contact',    label: 'Contact' },
]

const SHOW_THRESHOLD = 200

function FooterNav() {
  const [visible, setVisible] = useState(false)
  const lastY = useRef(0)
  const location = useLocation()
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

  const otherPages = NAV.filter((item) => {
    const isActive = item.end
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to)
    return !isActive
  })

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="footer-nav"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 30 }}
          className="hidden md:block fixed inset-x-0 bottom-3 sm:bottom-4 z-40 px-3 sm:px-6 will-change-transform pointer-events-none"
        >
          <nav
            aria-label="Navigation rapide"
            className="pointer-events-auto relative mx-auto max-w-page flex items-center justify-between gap-2 rounded-full bg-zinc-950/85 backdrop-blur-xl border border-stone-50/10 px-2.5 py-1.5 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            {/* Inner top hairline - same liquid-glass refraction as the top navbar. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-stone-50/15 to-transparent"
            />

            <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto">
              {otherPages.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className="relative px-3 py-1.5 text-[0.85rem] font-medium text-stone-300 hover:text-stone-50 hover:bg-stone-50/5 rounded-full transition-colors duration-200 ease-premium whitespace-nowrap"
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <button
              type="button"
              onClick={scrollTop}
              aria-label="Remonter en haut de la page"
              title="Remonter en haut"
              className="ml-1 shrink-0 grid place-items-center w-9 h-9 rounded-full bg-turf-800 text-stone-50 hover:bg-turf-700 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              <ArrowUp size={15} weight="bold" />
            </button>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FooterNav
