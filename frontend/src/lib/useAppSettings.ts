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
}

let cache: PublicSettings | null = null
let inflight: Promise<PublicSettings> | null = null

function fetchOnce(): Promise<PublicSettings> {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = api.get<SettingsResponse>('/settings')
    .then((res) => {
      cache = res.data ?? EMPTY
      return cache
    })
    .catch(() => {
      cache = EMPTY
      return cache
    })
    .finally(() => { inflight = null })
  return inflight
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
