import type { CSSProperties, HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Forces a minimum height when no children + no h-* class is given. */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
}

const RADII: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm:    'rounded',
  md:    'rounded-md',
  lg:    'rounded-lg',
  xl:    'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full:  'rounded-full',
}

/* Generic pulsing block - matches the dark/light surface tokens of the app
   (stone-200 in light mode, stone-50/8 on dark). Tailwind's animate-pulse is
   GPU-friendly (opacity only). Pass `className` to size it: `h-4 w-32`, etc. */
export default function Skeleton({
  rounded = 'md',
  className = '',
  style,
  ...rest
}: SkeletonProps) {
  const styles: CSSProperties = { ...style }
  return (
    <div
      aria-hidden="true"
      className={`bg-stone-200 dark:bg-stone-50/8 animate-pulse ${RADII[rounded]} ${className}`}
      style={styles}
      {...rest}
    />
  )
}
