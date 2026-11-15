import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Anonymous page-view counter for the public site (issue #1).
 *
 * Sends the displayed path to POST /api/track/view on every route change.
 * Nothing is stored in the browser: no cookie, no localStorage, no id. The
 * server derives a daily-rotating hash from the request itself, so a
 * visitor is never followed from one day to the next.
 *
 * - The first view of a page load is flagged as the entry of the visit and
 *   carries document.referrer, so traffic sources are counted once per visit.
 * - Automated browsers (navigator.webdriver) are skipped.
 * - Fire-and-forget: raw fetch with keepalive, errors ignored, and it does
 *   not go through the api client so the top progress bar never reacts.
 */

// Module scope: survives StrictMode double effects and re-mounts.
let entrySent = false
let last: { path: string; at: number } | null = null

function track(path: string): void {
  if (typeof window === 'undefined' || navigator.webdriver) return
  const now = Date.now()
  if (last && last.path === path && now - last.at < 2000) return
  last = { path, at: now }

  const entry = !entrySent
  entrySent = true
  try {
    void fetch('/api/track/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ path, entry, referrer: entry ? document.referrer || null : null }),
      keepalive: true,
    }).catch(() => { /* counting must never disturb the visit */ })
  } catch { /* fetch unavailable */ }
}

export function usePageView(): void {
  const { pathname } = useLocation()
  useEffect(() => { track(pathname) }, [pathname])
}
