import { memo, useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

interface ScrambleTextProps {
  text: string
  className?: string
  /** Delay before the first letter settles (ms). */
  baseMs?: number
  /** Extra delay per letter (ms) - the board settles left to right. */
  stepMs?: number
}

/**
 * Transfer-board lettering: every glyph flickers through random characters,
 * then settles left to right on the real text. Written straight to the DOM
 * from one rAF loop (no React state per frame). Screen readers get the final
 * text from an sr-only copy; reduced motion renders it directly.
 */
function ScrambleTextBase({ text, className = '', baseMs = 260, stepMs = 34 }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduce) {
      node.textContent = text
      return
    }
    const chars = [...text]
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const elapsed = now - start
      let done = true
      node.textContent = chars
        .map((c, i) => {
          if (c === ' ' || elapsed >= baseMs + i * stepMs) return c
          done = false
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        })
        .join('')
      if (!done) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, reduce, baseMs, stepMs])

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true">{text}</span>
    </span>
  )
}

const ScrambleText = memo(ScrambleTextBase)
export default ScrambleText
