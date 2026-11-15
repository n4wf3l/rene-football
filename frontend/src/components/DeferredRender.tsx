import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface DeferredRenderProps {
  children: ReactNode
  /** Space kept while the content waits, so the page doesn't jump. */
  minHeight?: string
}

/**
 * Renders its children only once the browser has painted what comes before
 * them, in the next idle moment. Used for below-the-fold sections of heavy
 * pages: the first render (and the first paint of the hero) no longer waits
 * for the map, the news, the video... which then render a frame later.
 */
export default function DeferredRender({ children, minHeight = '100vh' }: DeferredRenderProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      // Second frame: the first one has been painted by now.
      frame = requestAnimationFrame(() => {
        if ('requestIdleCallback' in window) {
          const id = window.requestIdleCallback(() => setReady(true), { timeout: 500 })
          cancel = () => window.cancelIdleCallback(id)
        } else {
          const id = setTimeout(() => setReady(true), 50)
          cancel = () => clearTimeout(id)
        }
      })
    })
    let cancel = () => cancelAnimationFrame(frame)
    return () => cancel()
  }, [])

  return ready ? <>{children}</> : <div aria-hidden="true" style={{ minHeight }} />
}
