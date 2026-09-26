import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionTemplate, useScroll, useSpring, useTransform } from 'framer-motion'
import {
  ArrowUpRight,
  Compass,
  Handshake,
  Person,
  Quotes,
  ScanSmiley,
  ShieldCheck,
} from '@phosphor-icons/react'
import MeshGradient from '../components/MeshGradient'
import Seo from '../components/Seo'
import AnimatedNumber from '../components/AnimatedNumber'
import AnimatedUnderline from '../components/AnimatedUnderline'
import Skeleton from '../components/Skeleton'
import { usePublicStaff } from '../lib/usePublicStaff'
import { usePublicPlayers } from '../lib/usePublicPlayers'
import { usePublicPartners } from '../lib/usePublicPartners'
import { useTranslation } from 'react-i18next'

/** Static structure : icon + i18n key stem. Copy lives in the locale files. */
const PILLARS: Array<{ Icon: typeof Handshake; key: 'representation' | 'scouting' | 'career' }> = [
  { Icon: Handshake,   key: 'representation' },
  { Icon: ScanSmiley,  key: 'scouting' },
  { Icon: ShieldCheck, key: 'career' },
]

// STATS are now driven by real DB numbers below (see usePublicPlayers).
// The old hardcoded 127+ joueurs / 38+ clubs / 14 pays counts have been
// removed - they were placeholder values that no longer match reality.

/** Years are the stable key ; title + text come from about.timeline.events.{year}.* */
const TIMELINE_YEARS = ['2010', '2015', '2020', '2024'] as const

const FADE_UP = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0 },
}

/* Vertical scroll path next to the timeline - drawn via spring scaleY.
   Color stops are interpolated by depth via useMotionTemplate (hooks at top-level). */
interface TimelineRailProps {
  targetRef: RefObject<HTMLOListElement | null>
}

function TimelineRail({ targetRef }: TimelineRailProps) {
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ['start 0.5' as const, 'end 0.5' as const] })
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 })
  const c1 = useTransform(scrollYProgress, [0, 0.5, 1], ['#93c5fd', '#3b82f6', '#1d4ed8'])
  const c2 = useTransform(scrollYProgress, [0, 0.5, 1], ['#60a5fa', '#1e40af', '#0f2664'])
  const background = useMotionTemplate`linear-gradient(180deg, ${c1} 0%, ${c2} 100%)`

  return (
    <span
      aria-hidden="true"
      className="absolute left-3 sm:left-4 top-0 bottom-0 w-px bg-stone-200 dark:bg-stone-50/10"
    >
      <motion.span
        className="absolute inset-0 origin-top w-px"
        style={{ scaleY, background }}
      />
    </span>
  )
}

function AProposPage() {
  const { t } = useTranslation()
  const timelineRef = useRef<HTMLOListElement | null>(null)
  // Module-level cache via usePublicStaff() - a second visit to /a-propos
  // does NOT re-fetch the API, which was the main cause of the perceived
  // "éternité" load.
  const { staff, loading: staffLoading } = usePublicStaff()
  const { players } = usePublicPlayers()
  const { partners, loading: partnersLoading } = usePublicPartners()
  const clubsCount = useMemo(
    () => new Set(players.map((p) => p.club).filter(Boolean)).size,
    [players],
  )
  const yearsOfExperience = new Date().getFullYear() - 2010

  return (
    <>
      <Seo
        title={t('about.seo.title')}
        description={t('about.seo.description')}
        path="/a-propos"
      />
      {/* Hero */}
      <section className="relative overflow-hidden text-zinc-900 dark:text-stone-100">
        <MeshGradient intensity="medium" tone="auto" />
        <div className="container-page pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-700 dark:text-turf-300">
              {t('about.hero.eyebrow')}
            </span>
            <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest leading-[1.05] text-zinc-950 dark:text-stone-50 max-w-[18ch]">
              {t('about.hero.title')}
            </h1>
            <p className="mt-6 max-w-[58ch] text-base lg:text-lg text-zinc-600 dark:text-stone-400 leading-relaxed">
              {t('about.hero.paragraph')}
            </p>
          </div>
          {(() => {
            // Only surface stats we can prove — a zero card next to a real one
            // reads worse than not showing that dimension at all.
            const heroStats = [
              { value: players.length,     label: t('home.stats.players') },
              { value: clubsCount,         label: t('home.stats.clubs') },
              { value: yearsOfExperience,  label: t('home.stats.years') },
              { value: staff.length,       label: t('home.stats.team') },
            ].filter((s) => s.value > 0)
            if (heroStats.length === 0) return null
            return (
              <div className="lg:col-span-5 lg:justify-self-end self-end">
                <div className="grid grid-cols-2 gap-y-6 gap-x-10 border-t border-stone-900/10 dark:border-stone-50/10 pt-8">
                  {heroStats.map((s) => (
                    <div key={s.label}>
                      <div className="font-mono text-3xl text-zinc-950 dark:text-stone-50 tabular-nums inline-flex items-baseline">
                        <AnimatedNumber value={s.value} duration={1.4} />
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-stone-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* Founder quote — highlight card. Hardcoded here because it is a
          unique editorial piece specific to the founder, not template copy. */}
      <section className="bg-white dark:bg-zinc-950 pt-4 pb-16 lg:pt-6 lg:pb-24 transition-colors">
        <div className="container-page">
          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-120px' }}
            transition={{ type: 'spring', stiffness: 90, damping: 22 }}
            className="relative overflow-hidden rounded-3xl border border-turf-100 dark:border-turf-300/15 bg-gradient-to-br from-turf-50 via-white to-turf-50/40 dark:from-turf-950/30 dark:via-zinc-900 dark:to-turf-950/10 px-8 py-10 lg:px-14 lg:py-14 shadow-[0_20px_40px_-24px_rgba(30,64,175,0.20)] dark:shadow-none"
          >
            {/* Decorative quote mark, top-right corner. */}
            <Quotes
              size={64}
              weight="fill"
              aria-hidden="true"
              className="absolute top-8 right-8 lg:top-10 lg:right-12 text-turf-200 dark:text-turf-300/25"
            />

            <span className="relative font-mono uppercase tracking-[0.22em] text-[0.7rem] font-semibold text-turf-700 dark:text-turf-300">
              {t('about.founderQuote.eyebrow')}
            </span>

            <blockquote className="relative mt-5 font-display font-semibold text-2xl lg:text-4xl leading-[1.15] tracking-tight text-zinc-950 dark:text-stone-50 max-w-[46ch]">
              {t('about.founderQuote.quote')}
            </blockquote>

            <p className="relative mt-6 text-sm lg:text-[0.95rem] leading-relaxed text-zinc-600 dark:text-stone-400 max-w-[70ch]">
              {t('about.founderQuote.paragraph')}
            </p>

            <figcaption className="relative mt-5 text-lg lg:text-xl font-display">
              <span className="text-turf-700 dark:text-turf-300 font-medium">René Jacob </span>
              <span className="text-turf-800 dark:text-turf-200 font-black tracking-tight">YOUGBARÉ</span>
            </figcaption>
          </motion.figure>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-stone-50 dark:bg-zinc-950 py-20 lg:py-28 transition-colors">
        <div className="container-page">
          <div className="max-w-[44ch] mb-12">
            <span className="eyebrow">{t('about.pillars.eyebrow')}</span>
            <AnimatedUnderline className="mt-2" />
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
              {t('about.pillars.title')}
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-stone-400 leading-relaxed">
              {t('about.pillars.intro')}
            </p>
          </div>

          <motion.ul
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="grid lg:grid-cols-3 gap-5 lg:gap-6"
          >
            {PILLARS.map(({ Icon, key }) => (
              <motion.li
                key={key}
                variants={FADE_UP}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                className="rounded-3xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-7 lg:p-8"
              >
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-turf-50 dark:bg-turf-800/30 text-turf-800 dark:text-turf-300 border border-turf-100 dark:border-turf-300/20">
                  <Icon size={22} weight="regular" />
                </div>
                <h3 className="mt-5 font-display font-semibold text-xl tracking-tight text-zinc-950 dark:text-stone-50">
                  {t(`about.pillars.${key}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-stone-400 max-w-[40ch]">
                  {t(`about.pillars.${key}.text`)}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* Staff - hidden entirely once we know there is no staff to show.
          We keep the section visible during the initial fetch so the layout
          doesn't pop ; the skeleton fills the slot until we have the answer. */}
      {(staffLoading || staff.length > 0) && (
      <section className="bg-white dark:bg-zinc-950 border-y border-stone-200/80 dark:border-stone-50/10 py-20 lg:py-28 transition-colors">
        <div className="container-page">
          <div className="flex items-end justify-between gap-6 mb-12 flex-wrap">
            <div className="max-w-[44ch]">
              <span className="eyebrow">{t('about.staff.eyebrow')}</span>
              <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
                {t('about.staff.title')}
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-stone-400 max-w-[42ch]">
              {t('about.staff.intro')}
            </p>
          </div>

          {staffLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          )}

          {!staffLoading && staff.length > 0 && (
            <motion.ul
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-100px' }}
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6"
            >
              {staff.map((m) => (
                <motion.li
                  key={m.slug}
                  variants={FADE_UP}
                  transition={{ type: 'spring', stiffness: 110, damping: 22 }}
                  className="group"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-stone-200 dark:bg-stone-50/5">
                    {m.photo_url ? (
                      <img
                        src={m.photo_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-stone-400 dark:text-stone-500">
                        <Person size={48} weight="duotone" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950/70 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-stone-50">
                      <div className="font-display font-medium text-base leading-tight">{m.name}</div>
                      <div className="text-[0.7rem] text-stone-300 mt-0.5 font-mono uppercase tracking-wider">
                        {m.role}
                      </div>
                    </div>
                  </div>
                  {m.bio && (
                    <p className="mt-4 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
                      {m.bio}
                    </p>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>
      </section>
      )}

      {/* Partners — hidden entirely when no partner is published, so an
          empty admin state doesn't show a dead section to guests. */}
      {(partnersLoading || partners.length > 0) && (
      <section className="bg-white dark:bg-zinc-950 border-t border-stone-200/80 dark:border-stone-50/10 py-20 lg:py-28 transition-colors">
        <div className="container-page">
          <div className="max-w-[44ch] mb-12">
            <span className="eyebrow">{t('about.partners.eyebrow')}</span>
            <AnimatedUnderline className="mt-2" />
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
              {t('about.partners.title')}
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-stone-400 leading-relaxed">
              {t('about.partners.intro')}
            </p>
          </div>

          {partnersLoading && partners.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map((i) => <Skeleton key={i} className="aspect-[3/2] rounded-2xl" />)}
            </div>
          ) : (
            <motion.ul
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-100px' }}
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5"
            >
              {partners.map((p) => {
                const inner = (
                  <>
                    <div className="aspect-[3/2] grid place-items-center bg-white dark:bg-stone-50/[0.03] p-6">
                      {p.logo_url ? (
                        <img
                          src={p.logo_url}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="max-w-full max-h-full object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition duration-300"
                        />
                      ) : (
                        <span className="font-display font-semibold text-lg text-zinc-800 dark:text-stone-200 text-center">
                          {p.name}
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-3 border-t border-stone-200/80 dark:border-stone-50/10">
                      <div className="font-medium text-sm text-zinc-950 dark:text-stone-50 truncate">
                        {p.name}
                      </div>
                      {p.role && (
                        <div className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate mt-0.5">
                          {p.role}
                          {p.country_label ? ` · ${p.country_label}` : ''}
                        </div>
                      )}
                    </div>
                  </>
                )
                return (
                  <motion.li
                    key={p.slug}
                    variants={FADE_UP}
                    transition={{ type: 'spring', stiffness: 110, damping: 20 }}
                    className="group rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40"
                  >
                    {p.website_url ? (
                      <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="block">
                        {inner}
                      </a>
                    ) : (
                      <div>{inner}</div>
                    )}
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </div>
      </section>
      )}

      {/* Timeline */}
      <section className="bg-stone-50 dark:bg-zinc-950 py-20 lg:py-28 transition-colors">
        <div className="container-page">
          <div className="max-w-[44ch] mb-12">
            <span className="eyebrow">{t('about.timeline.eyebrow')}</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
              {t('about.timeline.title')}
            </h2>
          </div>

          <ol ref={timelineRef} className="relative pl-10 sm:pl-14 max-w-3xl">
            <TimelineRail targetRef={timelineRef} />
            {TIMELINE_YEARS.map((year, i) => (
              <motion.li
                key={year}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ type: 'spring', stiffness: 110, damping: 22, delay: i * 0.05 }}
                className="relative pb-12 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-[34px] sm:-left-[42px] top-1.5 grid place-items-center w-6 h-6 rounded-full bg-turf-700 border-2 border-stone-50 dark:border-zinc-950 shadow-[0_0_8px_rgba(30, 64, 175,0.6)]"
                >
                  <Compass size={11} weight="bold" className="text-stone-50" />
                </span>
                <div className="font-mono tabular-nums text-turf-700 dark:text-turf-300 text-sm uppercase tracking-wider">
                  {year}
                </div>
                <h3 className="mt-1 font-display font-medium text-xl lg:text-2xl text-zinc-950 dark:text-stone-50 tracking-tight">
                  {t(`about.timeline.events.${year}.title`)}
                </h3>
                <p className="mt-2 text-base text-zinc-600 dark:text-stone-400 leading-relaxed max-w-[55ch]">
                  {t(`about.timeline.events.${year}.text`)}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="text-stone-100 py-16 lg:py-24 relative overflow-hidden">
        <MeshGradient intensity="subtle" />
        <div className="container-page grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <span className="eyebrow text-turf-300">{t('about.cta.eyebrow')}</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-tight tracking-tight">
              {t('about.cta.title')}
            </h2>
            <p className="mt-4 max-w-[55ch] text-stone-400 leading-relaxed">
              {t('about.cta.paragraph')}
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Link
              to="/contact"
              className="btn bg-stone-50 text-zinc-950 hover:bg-stone-200 text-sm px-5 py-3"
            >
              {t('about.cta.button')}
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default AProposPage
