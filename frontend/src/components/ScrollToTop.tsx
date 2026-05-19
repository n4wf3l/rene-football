import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Reset the page scroll to the top whenever the route pathname changes.
 *
 * Watches pathname only (not search/hash) so switching tabs inside a cockpit
 * page that uses query params (e.g. /admin/scouting?view=...) does not scroll
 * back to the top mid-interaction. Anchor links (#section) are also left
 * alone so the browser's native scroll-into-view still works.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}

export default ScrollToTop
