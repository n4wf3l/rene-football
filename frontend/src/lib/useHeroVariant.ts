import { useEffect, useState } from 'react'
import { DEFAULT_HERO, isHeroVariant, type HeroVariant } from './heroVariants'
import { loadAppSettings } from './useAppSettings'

const STORAGE_KEY = 'rf_hero_variant'
/** On a first visit, how long the hero may wait for the setting. */
const FIRST_VISIT_WAIT_MS = 900

function fromUrl(): HeroVariant | null {
  try {
    const v = new URLSearchParams(window.location.search).get('hero')
    return isHeroVariant(v) ? v : null
  } catch {
    return null
  }
}

function known(): HeroVariant | null {
  const early = window.__rfSettingsData?.appearance?.hero_variant
  if (isHeroVariant(early)) return early
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isHeroVariant(stored) ? stored : null
  } catch {
    return null
  }
}

/**
 * The home hero chosen in Réglages. `?hero=<name>` previews another one (the
 * admin's "Aperçu" links). Returning visitors get the remembered choice at
 * once; a first visit waits briefly for the setting (requested by index.html
 * while the app loads), then falls back to the default. Null = not decided
 * yet, render the empty hero frame.
 */
export function useHeroVariant(): HeroVariant | null {
  const [variant, setVariant] = useState<HeroVariant | null>(() => fromUrl() ?? known())

  useEffect(() => {
    if (fromUrl()) return
    let done = false
    const timer = window.setTimeout(() => {
      if (!done) setVariant((v) => v ?? DEFAULT_HERO)
    }, FIRST_VISIT_WAIT_MS)
    loadAppSettings().then((s) => {
      done = true
      window.clearTimeout(timer)
      const fresh = isHeroVariant(s.appearance?.hero_variant) ? s.appearance.hero_variant as HeroVariant : DEFAULT_HERO
      try { localStorage.setItem(STORAGE_KEY, fresh) } catch { /* private mode */ }
      setVariant(fresh)
    })
    return () => { done = true; window.clearTimeout(timer) }
  }, [])

  return variant
}
