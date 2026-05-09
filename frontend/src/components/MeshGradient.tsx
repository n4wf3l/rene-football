import { memo } from 'react'
import { motion } from 'framer-motion'

export type MeshGradientIntensity = 'subtle' | 'medium' | 'strong'

export interface MeshGradientProps {
  intensity?: MeshGradientIntensity
  className?: string
}

/* Lava-lamp-style background: three soft turf blobs drifting in independent
   loops. Pure transform/opacity (radial gradients are GPU-cheap, no filter:blur).

   Always dark (zinc-950 → near-black) regardless of theme — the website's
   editorial-sport identity keeps every hero/CTA section consistently dark
   (stadium-at-night look). The light/dark toggle affects content sections
   below the fold (services, roster preview, footer, cards).

   Sits at z-0; content rendered after this in the section flow stays above
   thanks to `.container-page`'s `relative z-10` rule. */
function MeshGradientBase({ intensity = 'medium', className = '' }: MeshGradientProps) {
  const a = INTENSITIES[intensity]

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 z-0 overflow-hidden pointer-events-none ${className}`}
      style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)' }}
    >
      <motion.span
        className="absolute -top-24 -left-24 w-[42rem] h-[42rem] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(132,184,150,${a.light}) 0%, rgba(132,184,150,${a.light * 0.25}) 35%, transparent 65%)`,
        }}
        animate={{ x: [0, 60, -30, 0], y: [0, 40, -20, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 22, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.span
        className="absolute -bottom-32 -right-20 w-[38rem] h-[38rem] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(15,81,50,${a.deep}) 0%, rgba(15,81,50,${a.deep * 0.2}) 40%, transparent 70%)`,
        }}
        animate={{ x: [0, -40, 25, 0], y: [0, -30, 20, 0], scale: [1, 0.92, 1.06, 1] }}
        transition={{ duration: 26, ease: 'easeInOut', repeat: Infinity, delay: 3 }}
      />
      <motion.span
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(82,153,109,${a.mid}) 0%, transparent 60%)`,
        }}
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0], opacity: [0.5, 0.85, 0.6, 0.5] }}
        transition={{ duration: 18, ease: 'easeInOut', repeat: Infinity, delay: 1.5 }}
      />
    </div>
  )
}

const INTENSITIES: Record<MeshGradientIntensity, { light: number; mid: number; deep: number }> = {
  subtle: { light: 0.18, mid: 0.10, deep: 0.30 },
  medium: { light: 0.28, mid: 0.16, deep: 0.45 },
  strong: { light: 0.40, mid: 0.22, deep: 0.60 },
}

const MeshGradient = memo(MeshGradientBase)
export default MeshGradient
