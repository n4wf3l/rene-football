import { useEffect, useState } from 'react'

/**
 * Some public pages (PlayerProfile, Contact, ArticleDetail…) open with a
 * hardcoded-dark hero even in light mode. The public navbar sitting on top
 * of that hero was rendering with its light palette (bg-stone-50/85, dark
 * text) which read as a floating white strip disconnected from the dark
 * content below.
 *
 * These two hooks let a page declare "my top section is dark" so the
 * Header can flip its palette to dark for the duration of that route:
 *
 *   useDarkHero()      // in the page component - adds body.has-dark-hero
 *   useHasDarkHero()   // in <Header /> - reactively reads that flag
 *
 * When the flag is set the Header injects a `dark` class on its own
 * wrapper, which makes every Tailwind `dark:` variant inside the navbar
 * activate regardless of the ThemeContext, without affecting any other
 * element on the page.
 */
const BODY_CLASS = 'has-dark-hero'

export function useDarkHero(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add(BODY_CLASS)
    return () => document.body.classList.remove(BODY_CLASS)
  }, [])
}

export function useHasDarkHero(): boolean {
  const [has, setHas] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.body.classList.contains(BODY_CLASS),
  )
  useEffect(() => {
    if (typeof document === 'undefined') return
    const target = document.body
    const observer = new MutationObserver(() => {
      setHas(target.classList.contains(BODY_CLASS))
    })
    observer.observe(target, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return has
}
