import { memo } from 'react'
import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'

export type MeshGradientIntensity = 'subtle' | 'medium' | 'strong'

/** Background tone strategy.
 *  - `dark`  : always-dark (stadium-at-night) - legacy default, used by every
 *              section that hasn't been migrated to a theme-aware text palette.
 *  - `auto`  : light in light mode, dark in dark mode. Use this only when the
 *              section's text/borders all carry the right dark: variants. */
export type MeshGradientTone = 'dark' | 'auto'

export interface MeshGradientProps {
  intensity?: MeshGradientIntensity
  /** Defaults to `dark` to keep legacy sections unchanged. */
  tone?: MeshGradientTone
  className?: string
}

/* Lava-lamp-style background: three soft turf blobs drifting in independent
   loops. Pure transform/opacity (radial gradients are GPU-cheap, no filter:blur).
   Theme-aware : in light mode the base gradient is near-white and the turf
   blobs run at a reduced opacity so they read as a watermark, not a smear ;
   in dark mode we keep the stadium-at-night look that defines the brand.

   Sits at z-0; content rendered after this in the section flow stays above
   thanks to `.container-page`'s `relative z-10` rule. */
function MeshGradientBase({ intensity = 'medium', tone = 'dark', className = '' }: MeshGradientProps) {
  const a = INTENSITIES[intensity]
  // Multiplier applied to blob opacities in light mode. Pure turf shapes are
  // way more visible on a white-ish background than they are on near-black,
  // so we dim them ~55% to keep the watermark feel.
  const lightDim = 0.45

  // Class strategy : `dark` tone keeps the inline near-black gradient (legacy
  // sections that aren't migrated to theme-aware text). `auto` switches to a
  // light gradient in light mode, dark in dark mode, and dims the blobs.
  const wrapperClass = tone === 'auto'
    ? 'bg-gradient-to-b from-stone-50 to-stone-100 dark:from-[#0a0a0a] dark:to-[#050505]'
    : ''
  const wrapperStyle = tone === 'dark'
    ? { background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)' }
    : undefined
  const blobOpacityClass = tone === 'auto'
    ? 'opacity-[var(--mesh-dim)] dark:opacity-100'
    : ''
  const blobOpacityStyle = tone === 'auto'
    ? ({ ['--mesh-dim' as string]: lightDim } as CSSProperties)
    : undefined

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 z-0 overflow-hidden pointer-events-none ${wrapperClass} ${className}`}
      style={wrapperStyle}
    >
      <motion.span
        className={`absolute -top-24 -left-24 w-[42rem] h-[42rem] rounded-full ${blobOpacityClass}`}
        style={{
          ...blobOpacityStyle,
          background: `radial-gradient(circle, rgba(132,184,150,${a.light}) 0%, rgba(132,184,150,${a.light * 0.25}) 35%, transparent 65%)`,
        }}
        animate={{ x: [0, 60, -30, 0], y: [0, 40, -20, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 22, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.span
        className={`absolute -bottom-32 -right-20 w-[38rem] h-[38rem] rounded-full ${blobOpacityClass}`}
        style={{
          ...blobOpacityStyle,
          background: `radial-gradient(circle, rgba(15,81,50,${a.deep}) 0%, rgba(15,81,50,${a.deep * 0.2}) 40%, transparent 70%)`,
        }}
        animate={{ x: [0, -40, 25, 0], y: [0, -30, 20, 0], scale: [1, 0.92, 1.06, 1] }}
        transition={{ duration: 26, ease: 'easeInOut', repeat: Infinity, delay: 3 }}
      />
      <motion.span
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full ${blobOpacityClass}`}
        style={{
          ...blobOpacityStyle,
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
