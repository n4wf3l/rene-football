import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

/**
 * A useState that syncs its value to localStorage under a fixed key.
 *
 * Reads the stored value on mount (JSON.parse), falls back to `initial`
 * when nothing is stored or parsing fails. Writes on every state change.
 * Safe in SSR (returns `initial` when window is undefined).
 *
 * Kept intentionally minimal — no cross-tab sync, no debouncing, no schema
 * validation. The caller narrows T with a discriminated union or a guard
 * when the stored shape can drift.
 */
export function useLocalStorageState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) return JSON.parse(stored) as T
    } catch { /* stale JSON / disabled storage — fall back */ }
    return initial
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(key, JSON.stringify(value)) }
    catch { /* quota / private mode — best-effort */ }
  }, [key, value])

  return [value, setValue]
}
