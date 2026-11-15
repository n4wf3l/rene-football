import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { PublicSettings } from '../types/settings'

interface SettingsResponse { data: PublicSettings }

const EMPTY: PublicSettings = {
  social_links: {},
  contact: { email: null, phone: null, office_city: null },
  legal: {
    legal_form: null,
    rcs_number: null,
    vat_number: null,
    registered_office_address: null,
    publication_director: null,
  },
  appearance: { hero_variant: 'spotlight' },
}

declare global {
  interface Window {
    /** Started by the inline script in index.html, before the app loads. */
    __rfSettings?: Promise<SettingsResponse | null>
    __rfSettingsData?: PublicSettings
  }
}

let cache: PublicSettings | null = null
let inflight: Promise<PublicSettings> | null = null

function fetchOnce(): Promise<PublicSettings> {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  // index.html already asked for the settings while the app was loading.
  const early = window.__rfSettings
  window.__rfSettings = undefined
  const request: Promise<SettingsResponse | null> = early
    ? early.then((res) => res ?? api.get<SettingsResponse>('/settings'))
    : api.get<SettingsResponse>('/settings')
  inflight = request
    .then((res) => {
      cache = { ...EMPTY, ...(res?.data ?? {}) }
      return cache
    })
    .catch(() => {
      cache = EMPTY
      return cache
    })
    .finally(() => { inflight = null })
  return inflight
}

/** The public settings, once (shared by every caller on the page). */
export function loadAppSettings(): Promise<PublicSettings> {
  return fetchOnce()
}

/** Public agency settings (social URLs, etc.). Cached module-wide so all
 *  consumers on a page share a single fetch. */
export function useAppSettings(): { settings: PublicSettings; loading: boolean } {
  const [settings, setSettings] = useState<PublicSettings>(cache ?? EMPTY)
  const [loading, setLoading] = useState(cache == null)

  useEffect(() => {
    let cancelled = false
    fetchOnce().then((s) => {
      if (cancelled) return
      setSettings(s)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return { settings, loading }
}

/** Invalidates the cache so a fresh admin-triggered save shows up on the
 *  next `useAppSettings()` mount. Call from the admin settings form. */
export function invalidateAppSettings() {
  cache = null
  inflight = null
}
