interface ArticleCoverProps {
  /** The article's cover photo; without one, the Rene Football RF mark. */
  src?: string | null
  /** Classes for the image (position, object-fit, hover effects…). */
  className?: string
  loading?: 'eager' | 'lazy'
  /** Size of the RF mark relative to the frame (placeholder only). */
  markSize?: 'sm' | 'md' | 'lg'
}

const MARK: Record<NonNullable<ArticleCoverProps['markSize']>, string> = {
  sm: 'w-[42%]',
  md: 'w-[24%]',
  lg: 'w-[16%]',
}

/**
 * Article cover. An article published without a photo shows the agency's
 * RF mark on its navy backdrop instead of a stock picture, so every news
 * card still looks like Rene Football. Fills its (positioned) parent.
 */
export default function ArticleCover({ src, className = 'absolute inset-0 h-full w-full object-cover', loading = 'lazy', markSize = 'md' }: ArticleCoverProps) {
  if (src) {
    return <img src={src} alt="" loading={loading} decoding="async" className={className} />
  }
  return (
    <div
      aria-hidden="true"
      className={`${className} grid place-items-center`}
      style={{
        background:
          'radial-gradient(ellipse 70% 60% at 30% 25%, rgba(59,130,246,0.28), transparent 70%),' +
          'linear-gradient(150deg, #13285a 0%, #0b1733 55%, #09090b 100%)',
      }}
    >
      <img src="/logo-white.png" alt="" loading={loading} decoding="async" className={`${MARK[markSize]} min-w-[40px] max-w-[180px] opacity-90`} />
    </div>
  )
}
