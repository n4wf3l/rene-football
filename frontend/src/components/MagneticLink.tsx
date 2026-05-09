import { memo, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const SPRING = { stiffness: 100, damping: 20, mass: 0.6 }

interface MagneticLinkProps {
  to: string
  children: ReactNode
  className?: string
  strength?: number
}

function MagneticLinkBase({ to, children, className = '', strength = 0.25 }: MagneticLinkProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, SPRING)
  const sy = useSpring(y, SPRING)

  const handleMove = (event: ReactMouseEvent<HTMLSpanElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((event.clientX - rect.left - rect.width / 2) * strength)
    y.set((event.clientY - rect.top - rect.height / 2) * strength)
  }

  const handleLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.span
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: sx, y: sy, display: 'inline-block' }}
    >
      <Link to={to} className={className}>
        {children}
      </Link>
    </motion.span>
  )
}

const MagneticLink = memo(MagneticLinkBase)
export default MagneticLink
