import { memo, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { motion } from 'framer-motion'

/* Trail of turf "dust" specks following the cursor inside the hero.
   - Listener attaches to a parent ref via addEventListener (no parent rerenders).
   - Throttled to 40ms (~25 spawns/sec max), capped at 25 live particles.
   - Skipped entirely on coarse pointers (touch/mobile) — no listener, no DOM, zero cost.
   - GPU-only animation (opacity + transform).
*/

const SPAWN_THROTTLE_MS = 40
const MAX_PARTICLES = 25
const PARTICLE_LIFETIME_MS = 1100

interface Particle {
  id: string
  x: number
  y: number
  drift: number
  size: number
}

interface HeroTrailProps {
  targetRef: RefObject<HTMLElement | null>
}

function HeroTrailBase({ targetRef }: HeroTrailProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(pointer: coarse)').matches) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const target = targetRef.current
    if (!target) return

    let lastSpawn = 0
    const timeouts = new Set<ReturnType<typeof setTimeout>>()

    const handleMove = (event: MouseEvent) => {
      const now = performance.now()
      if (now - lastSpawn < SPAWN_THROTTLE_MS) return
      lastSpawn = now

      const rect = target.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

      const id = `${now}-${Math.random().toString(36).slice(2, 7)}`
      const drift = (Math.random() - 0.5) * 18
      const size = 4 + Math.random() * 4

      setParticles((prev) => {
        const next = prev.length >= MAX_PARTICLES ? prev.slice(-(MAX_PARTICLES - 1)) : prev
        return [...next, { id, x, y, drift, size }]
      })

      const t = setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id))
        timeouts.delete(t)
      }, PARTICLE_LIFETIME_MS)
      timeouts.add(t)
    }

    target.addEventListener('mousemove', handleMove as EventListener, { passive: true })
    return () => {
      target.removeEventListener('mousemove', handleMove as EventListener)
      timeouts.forEach(clearTimeout)
      timeouts.clear()
    }
  }, [targetRef])

  return (
    <div aria-hidden="true" className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 left-0 rounded-full bg-turf-300"
          style={{
            width: p.size,
            height: p.size,
            boxShadow: '0 0 8px rgba(132,184,150,0.55), 0 0 2px rgba(255,255,255,0.4)',
          }}
          initial={{ opacity: 0.75, scale: 1, x: p.x, y: p.y }}
          animate={{
            opacity: 0,
            scale: 0.25,
            x: p.x + p.drift,
            y: p.y + 28,
          }}
          transition={{ duration: PARTICLE_LIFETIME_MS / 1000, ease: [0.16, 1, 0.3, 1] as const }}
        />
      ))}
    </div>
  )
}

const HeroTrail = memo(HeroTrailBase)
export default HeroTrail
