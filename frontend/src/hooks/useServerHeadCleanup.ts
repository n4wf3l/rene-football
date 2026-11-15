import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Public pages arrive from the server with their own head tags (title,
 * description, canonical, Open Graph, schema.org) marked data-rh="true", so
 * Google and link previews read them without JavaScript.
 *
 * Once React runs, the <Seo> component renders the same tags itself, and
 * React 19 does not replace tags it did not create. So the server's title /
 * meta / link tags are removed at startup (see main.tsx), and its JSON-LD,
 * which <Seo> does not render, is kept for the first page and dropped on the
 * first navigation so it never describes another page.
 */
export function removeServerHeadTags(): void {
  document.head
    .querySelectorAll('title[data-rh="true"], meta[data-rh="true"], link[data-rh="true"]')
    .forEach((el) => el.remove())
}

function removeServerJsonLd(): void {
  document.head
    .querySelectorAll('script[type="application/ld+json"][data-rh="true"]')
    .forEach((el) => el.remove())
}

export function useServerHeadCleanup(): void {
  const { pathname } = useLocation()
  const first = useRef(pathname)

  useEffect(() => {
    if (pathname !== first.current) removeServerJsonLd()
  }, [pathname])

  // Leaving the public site (to the admin) also ends that first page.
  useEffect(() => removeServerJsonLd, [])
}
