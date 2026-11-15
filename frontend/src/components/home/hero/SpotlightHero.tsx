import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import HeroSpotlight from '../HeroSpotlight'
import { EASE_OUT, Headline, HeroCtas, HeroEyebrow, HeroParagraph, HeroStats, type HeroData } from './HeroParts'

/**
 * "Projecteur" (default): headline left, the represented players cycling on a
 * ticket-cut card right, the agency wordmark set huge behind everything.
 */
export default function SpotlightHero({ spotlight, stats }: HeroData) {
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement | null>(null)
  // Giant background wordmark drifts slower than the page (hero depth).
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const wordmarkY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['0%', '35%'])

  return (
    <section ref={heroRef} className="relative overflow-hidden bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-100"
        style={{
          background:
            'radial-gradient(ellipse 45% 55% at 78% 35%, rgba(30,64,175,0.38), transparent 70%),' +
            'radial-gradient(ellipse 40% 40% at 8% 90%, rgba(30,64,175,0.20), transparent 70%)',
        }}
      />
      <motion.div
        aria-hidden="true"
        style={{ y: wordmarkY }}
        className="pointer-events-none absolute inset-x-0 bottom-[-0.12em] select-none whitespace-nowrap text-center font-display font-semibold uppercase leading-none tracking-tightest text-zinc-950/[0.04] dark:text-stone-50/[0.045] text-[34vw]"
      >
        Rene
      </motion.div>

      <div className="container-page grid min-h-[100dvh] items-center gap-12 pb-14 pt-28 lg:grid-cols-12 lg:gap-10 lg:pb-16 lg:pt-24">
        <div className="lg:col-span-7">
          <HeroEyebrow />
          <div className="mt-7"><Headline /></div>
          <HeroParagraph className="mt-7" />
          <HeroCtas className="mt-9" />
          <HeroStats stats={stats} className="mt-14" />
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.3 }}
          className="lg:col-span-5"
        >
          <HeroSpotlight players={spotlight} />
        </motion.div>
      </div>
    </section>
  )
}
