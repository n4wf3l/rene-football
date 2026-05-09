import { memo, useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'

export interface AnimatedNumberProps {
  /** Final value to count up to. */
  value: number
  /** Animation duration in seconds. */
  duration?: number
  /** Decimal places to keep when formatting. */
  decimals?: number
  /** Optional thousands separator (default: French narrow no-break space). */
  separator?: string
  /** Plays only the first time the element enters the viewport. */
  once?: boolean
  /** Element wrapping the number — defaults to span. */
  className?: string
}

/* Counter that animates from 0 to `value` with a spring-flavored ease when
   the wrapper enters the viewport. Reads stay zero-allocation: we keep the
   latest displayed string in component state and let framer-motion drive the
   actual number via `animate()` (no rerender loop on every frame). */
function AnimatedNumberBase({
  value,
  duration = 1.4,
  decimals = 0,
  separator = ' ', // narrow no-break space (FR thousands)
  once = true,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const inView = useInView(ref, { once, margin: '-80px' })
  const [display, setDisplay] = useState(formatNumber(0, decimals, separator))

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        setDisplay(formatNumber(latest, decimals, separator))
      },
    })
    return () => controls.stop()
  }, [inView, value, duration, decimals, separator])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}

function formatNumber(n: number, decimals: number, separator: string): string {
  const fixed = n.toFixed(decimals)
  if (decimals > 0) {
    const [intPart, decPart] = fixed.split('.')
    return addSeparator(intPart, separator) + (decPart ? ',' + decPart : '')
  }
  return addSeparator(fixed, separator)
}

function addSeparator(intStr: string, separator: string): string {
  if (intStr.length <= 3) return intStr
  let out = ''
  for (let i = 0; i < intStr.length; i++) {
    if (i > 0 && (intStr.length - i) % 3 === 0) out += separator
    out += intStr[i]
  }
  return out
}

const AnimatedNumber = memo(AnimatedNumberBase)
export default AnimatedNumber
