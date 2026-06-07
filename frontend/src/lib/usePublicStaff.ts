import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { StaffMember } from '../types/staff'

interface StaffResponse { data: StaffMember[] }

/**
 * Module-level cache so revisiting `/a-propos` doesn't re-fetch the staff list.
 * The roster changes rarely and the section is tiny (4-6 rows) - a single
 * GET per session is plenty. Same pattern as `usePublicPlayers`.
 */
let cache: StaffMember[] | null = null
let inflight: Promise<StaffMember[]> | null = null

function fetchOnce(): Promise<StaffMember[]> {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = api.get<StaffResponse>('/staff')
    .then((res) => {
      cache = res.data ?? []
      return cache
    })
    .catch(() => {
      cache = []
      return cache
    })
    .finally(() => { inflight = null })
  return inflight
}

/** Returns the public staff list, hot on second visit. */
export function usePublicStaff(): { staff: StaffMember[]; loading: boolean } {
  const [staff, setStaff] = useState<StaffMember[]>(cache ?? [])
  const [loading, setLoading] = useState(cache == null)

  useEffect(() => {
    let cancelled = false
    fetchOnce().then((list) => {
      if (cancelled) return
      setStaff(list)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return { staff, loading }
}
