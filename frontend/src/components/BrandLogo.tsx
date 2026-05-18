import { motion } from 'framer-motion'
import logoBlack from '../assets/logo-black.png'
import logoWhite from '../assets/logo-white.png'

export type BrandLogoVariant = 'auto' | 'light' | 'dark'

export interface BrandLogoProps {
  /** Square size in px (the logo keeps its aspect via object-contain). */
  size?: number
  className?: string
  /**
   * - `auto` (default): swap between black/white via `dark:` Tailwind classes - use on theme-aware surfaces.
   * - `light`: always render the white logo (for always-dark surfaces like the navbar capsule).
   * - `dark`:  always render the black logo (for always-light surfaces).
   */
  variant?: BrandLogoVariant
  /** Adds the small pulsing turf dot in the top-right corner - keeps the "alive" feel of the original mark. */
  withPulse?: boolean
}

export default function BrandLogo({
  size = 36,
  className = '',
  variant = 'auto',
  withPulse = false,
}: BrandLogoProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Black logo - light surfaces */}
      {(variant === 'auto' || variant === 'dark') && (
        <img
          src={logoBlack}
          alt={variant === 'dark' ? 'Rene Football' : ''}
          aria-hidden={variant === 'auto' ? 'true' : undefined}
          draggable={false}
          className={`absolute inset-0 w-full h-full object-contain select-none ${
            variant === 'auto' ? 'block dark:hidden' : 'block'
          }`}
        />
      )}
      {/* White logo - dark surfaces */}
      {(variant === 'auto' || variant === 'light') && (
        <img
          src={logoWhite}
          alt={variant === 'light' ? 'Rene Football' : ''}
          aria-hidden={variant === 'auto' ? 'true' : undefined}
          draggable={false}
          className={`absolute inset-0 w-full h-full object-contain select-none ${
            variant === 'auto' ? 'hidden dark:block' : 'block'
          }`}
        />
      )}
      {withPulse && (
        <motion.span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-turf-300"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1, 0.85] }}
          transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
          style={{ boxShadow: '0 0 6px rgba(132,184,150,0.7)' }}
        />
      )}
    </span>
  )
}
