import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import MagneticLink from '../MagneticLink'

/**
 * Closing gesture of the home page: the wordmark slides together from both
 * edges as the section scrolls into place, then a single contact CTA.
 */
function OutroWordmark() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const left = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-22%', '0%'])
  const right = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['22%', '0%'])

  return (
    <section ref={ref} className="relative overflow-hidden bg-stone-50 pb-12 pt-24 text-zinc-900 dark:bg-zinc-950 dark:text-stone-100 lg:pt-32">
      <div aria-hidden="true" className="select-none font-display font-semibold uppercase leading-[0.8] tracking-tightest">
        <motion.div style={{ x: left }} className="whitespace-nowrap pl-[3vw] text-[33.8vw] text-zinc-950 dark:text-stone-50">
          Rene
        </motion.div>
        <motion.div style={{ x: right }} className="whitespace-nowrap pl-[3vw] text-[16.2vw] text-turf-700 dark:text-turf-400">
          Football
        </motion.div>
      </div>

      <div className="container-page mt-12 flex flex-col gap-8 border-t border-zinc-950/10 pt-8 dark:border-stone-50/10 md:flex-row md:items-center md:justify-between">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-zinc-500 dark:text-stone-400">{t('home.outro.tagline')}</p>
        <MagneticLink
          to="/contact"
          className="group inline-flex items-center gap-3 bg-zinc-950 px-6 py-4 font-medium text-stone-50 transition-colors duration-300 ease-premium hover:bg-turf-800 dark:bg-stone-50 dark:text-zinc-950 dark:hover:bg-turf-300"
        >
          {t('home.outro.cta')}
          <ArrowUpRight size={18} weight="bold" className="transition-transform duration-300 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </MagneticLink>
      </div>
    </section>
  )
}

export default OutroWordmark
