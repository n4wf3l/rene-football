import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Partner } from '../types/partner'

interface PartnersResponse { data: Partner[] }

/** Module-level cache — partners list is tiny and rarely changes. */
let cache: Partner[] | null = null
let inflight: Promise<Partner[]> | null = null

function fetchOnce(): Promise<Partner[]> {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = api.get<PartnersResponse>('/partners')
    .then((res) => { cache = res.data ?? []; return cache })
    .catch(() => { cache = []; return cache })
    .finally(() => { inflight = null })
  return inflight
}

export function usePublicPartners(): { partners: Partner[]; loading: boolean } {
  const [partners, setPartners] = useState<Partner[]>(cache ?? [])
  const [loading, setLoading] = useState(cache == null)

  useEffect(() => {
    let cancelled = false
    fetchOnce().then((list) => {
      if (cancelled) return
      setPartners(list)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return { partners, loading }
}

export function invalidatePartnersCache() {
  cache = null
  inflight = null
}
