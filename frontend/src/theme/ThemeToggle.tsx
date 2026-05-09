import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from './ThemeContext'

export type ThemeToggleVariant = 'header' | 'rail' | 'admin'

export interface ThemeToggleProps {
  variant?: ThemeToggleVariant
  className?: string
}

/**
 * variant:
 *  - "header": pill button for the public top navbar (dark-on-dark)
 *  - "rail":   square 40px button for the sidebar rail
 *  - "admin":  square button for the admin sidebar (light/dark adaptive)
 */
function ThemeToggle({ variant = 'header', className = '' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const Icon = isDark ? Sun : Moon

  const base =
    variant === 'header'
      ? 'inline-grid place-items-center w-9 h-9 rounded-full text-zinc-700 dark:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-50/8 transition-colors'
      : variant === 'rail'
      ? 'group relative grid place-items-center w-10 h-10 rounded-xl text-stone-400 hover:text-stone-50 hover:bg-stone-50/5 transition-colors'
      : 'group relative grid place-items-center w-10 h-10 rounded-xl text-stone-300 hover:text-stone-50 hover:bg-stone-50/5 transition-colors'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className={`${base} ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0,   scale: 1 }}
          exit={{    opacity: 0, rotate: 90,  scale: 0.7 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }}
          className="grid place-items-center"
        >
          <Icon size={16} weight={isDark ? 'fill' : 'duotone'} />
        </motion.span>
      </AnimatePresence>

      {(variant === 'rail' || variant === 'admin') && (
        <span
          role="tooltip"
          className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-zinc-900 text-stone-100 text-xs whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-premium pointer-events-none border border-stone-50/10 shadow-diffusion"
        >
          {isDark ? 'Mode clair' : 'Mode sombre'}
        </span>
      )}
    </button>
  )
}

export default ThemeToggle
