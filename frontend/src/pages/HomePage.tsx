import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Buildings,
  Handshake,
  MapPin,
  MegaphoneSimple,
  Question,
  ScanSmiley,
  ShieldCheck,
  SoccerBall,
  TrendUp,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import MercatoTicker from '../components/MercatoTicker'
import Seo from '../components/Seo'
import HeroTrail from '../components/HeroTrail'
import YouTubeEmbed from '../components/YouTubeEmbed'
import MeshGradient from '../components/MeshGradient'
import FloatingAccents from '../components/FloatingAccents'
import LuxembourgMap from '../components/LuxembourgMap'
import AnimatedNumber from '../components/AnimatedNumber'
import AnimatedUnderline from '../components/AnimatedUnderline'
import { usePublicPlayers, pickShowcase } from '../lib/usePublicPlayers'
import { usePublicStaff } from '../lib/usePublicStaff'
import { playerImage } from '../lib/playerImage'
import heroPortrait from '../assets/player2.png'

/** Local portrait overrides - keyed by slug. Lets us pin the agency's
 *  hand-shot photos for specific players without breaking the rest of the
 *  roster (which falls back to playerImage()).
 *  Currently empty (the previous Karim override was removed when the
 *  demo pro was pulled from the seed). */
const LOCAL_PORTRAITS: Record<string, string> = {}

const HERO_PORTRAIT = heroPortrait

// STATS are now derived at render-time from real DB numbers below. The
// old hardcoded 127+ joueurs / 38+ clubs / 14 pays counts were placeholder
// values that no longer match reality (~10 active players in production).

/** Icon + layout meta ; title/text come from home.services.<key>.title / .text */
const SERVICES: Array<{ Icon: typeof Handshake; key: 'representation' | 'contracts' | 'scouting' | 'career'; span: string; accent?: boolean }> = [
  { Icon: Handshake,   key: 'representation', span: 'lg:col-span-3 lg:row-span-2', accent: true },
  { Icon: ShieldCheck, key: 'contracts',      span: 'lg:col-span-2' },
  { Icon: ScanSmiley,  key: 'scouting',       span: 'lg:col-span-2' },
  { Icon: TrendUp,     key: 'career',         span: 'lg:col-span-3' },
]

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
}

/**
 * Centered pin + typewriter "LUXEMBOURG" label that lands after the
 * LuxembourgMap outline finishes drawing. Sequenced by hard-coded delays
 * (the map's own tracing ends at ~3s = 0.4s delay + 2.6s duration) so it
 * doesn't need a callback out of the map component.
 */
const LUXEMBOURG_WORD = 'LUXEMBOURG'
const PIN_DELAY_S = 2.0
const TYPING_DELAY_S = 2.4
const LETTER_STEP_S = 0.055

/**
 * Continuous L-shaped line that drops from below the "Luxembourg" pin, runs
 * right along the bottom of the hero, ends with an arrow and a short caption
 * about the long-term player tracking. Timings pick up right after the
 * typewriter cursor fades so the whole intro reads as one narrative beat.
 */
const FLOW_VERTICAL_DELAY_S    = 3.5
const FLOW_VERTICAL_DURATION_S = 0.7
const FLOW_HORIZONTAL_DELAY_S  = FLOW_VERTICAL_DELAY_S + FLOW_VERTICAL_DURATION_S - 0.05
const FLOW_HORIZONTAL_DURATION_S = 1.0
const FLOW_ARROW_DELAY_S       = FLOW_HORIZONTAL_DELAY_S + FLOW_HORIZONTAL_DURATION_S
const FLOW_TEXT_DELAY_S        = FLOW_ARROW_DELAY_S + 0.25

function HeroFlowline() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 hidden lg:block"
    >
      {/* Vertical drop from just under the LUXEMBOURG label. Anchored in
         pixels because the Luxembourg map is left-aligned with a fixed
         -ml-10 offset and a max-h that caps its width at ~370px, so its
         centre sits around 145px from the viewport edge regardless of
         viewport width. Kept short so the horizontal segment lands above
         the stats band and doesn't cut through it. */}
      <motion.div
        className="absolute w-[2px] bg-turf-400/60 dark:bg-turf-300/50 origin-top"
        style={{ left: '145px', top: '58%', height: '16%' }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: FLOW_VERTICAL_DELAY_S, duration: FLOW_VERTICAL_DURATION_S, ease: 'easeInOut' }}
      />

      {/* Horizontal run to the bottom-right - continuous with the vertical
         since both use the same 2px stroke and colour. */}
      <motion.div
        className="absolute h-[2px] bg-turf-400/60 dark:bg-turf-300/50 origin-left"
        style={{ left: '145px', top: '74%', width: '55%' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: FLOW_HORIZONTAL_DELAY_S, duration: FLOW_HORIZONTAL_DURATION_S, ease: 'easeInOut' }}
      />

      {/* Arrowhead lands at the end of the horizontal line once the line
         itself has finished drawing. The outer wrapper owns the position +
         centring transform (-50% Y so the icon centre sits ON the line);
         the inner motion.div only animates opacity + fade-in slide, so
         Motion's transform for `x` doesn't overwrite the centring. */}
      <div
        className="absolute"
        style={{
          left: 'calc(145px + 55%)',
          top: '74%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          className="text-turf-500 dark:text-turf-300"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: FLOW_ARROW_DELAY_S, duration: 0.35, ease: 'easeOut' }}
        >
          <ArrowRight size={18} weight="bold" />
        </motion.div>
      </div>

      {/* Caption sits just under the horizontal line, right-aligned so it
         reads as the destination the arrow points to. Anchored 12px below
         the line so it never clips the stats band underneath. */}
      <motion.div
        className="absolute max-w-[420px] text-right text-[0.78rem] leading-relaxed text-stone-700 dark:text-stone-300"
        style={{ right: '4%', top: 'calc(74% + 12px)' }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: FLOW_TEXT_DELAY_S, duration: 0.55, ease: 'easeOut' }}
      >
        <span className="block text-[0.62rem] uppercase tracking-[0.32em] font-semibold text-turf-600 dark:text-turf-300 mb-1">
          Suivi long terme
        </span>
        Le profil et statistiques de nos joueurs sont trackés et possèdent un
        réel suivi de progression et même après avoir atteint le niveau
        professionnel.
      </motion.div>
    </div>
  )
}

function LuxembourgLabel() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-turf-700 dark:text-turf-300"
      aria-hidden="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: PIN_DELAY_S, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <MapPin size={30} weight="fill" />
      </motion.div>
      <div className="font-mono text-[0.72rem] tracking-[0.42em] font-semibold text-turf-900 dark:text-turf-100">
        {LUXEMBOURG_WORD.split('').map((letter, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: TYPING_DELAY_S + i * LETTER_STEP_S, duration: 0.001 }}
          >
            {letter}
          </motion.span>
        ))}
        {/* Blinking-then-fading cursor: appears with the first letter, blinks
           while typing, fades out just after the last letter lands. */}
        <motion.span
          className="inline-block w-[0.5em] ml-0.5 -mb-0.5 align-baseline"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0, 1, 0, 1, 0] }}
          transition={{
            delay: TYPING_DELAY_S,
            duration: LETTER_STEP_S * LUXEMBOURG_WORD.length + 0.6,
            times: [0, 0.08, 0.24, 0.4, 0.56, 0.85, 1],
            ease: 'linear',
          }}
        >
          |
        </motion.span>
      </div>
    </div>
  )
}

function HomePage() {
  const { t } = useTranslation()
  const heroRef = useRef<HTMLElement | null>(null)
  const { players, loading } = usePublicPlayers()
  const { staff } = usePublicStaff()
  // Top 4 showcase roster picked from the real DB - sorts by minutes_played
  // so the visible cards always reflect the agency's active stars, not seed order.
  const roster = useMemo(() => pickShowcase(players, 4), [players])
  // Live stats derived from the DB so we never inflate the numbers. Cards
  // with a value of 0 are filtered out so an empty deployment doesn't
  // publicise "0 joueurs" / "0 clubs".
  const clubsCount = useMemo(
    () => new Set(players.map((p) => p.club).filter(Boolean)).size,
    [players],
  )
  const yearsOfExperience = new Date().getFullYear() - 2010
  const STATS: { value: number; label: string; suffix?: string }[] = [
    { value: players.length,     label: t('home.stats.players') },
    { value: yearsOfExperience,  label: t('home.stats.years') },
    { value: clubsCount,         label: t('home.stats.clubs') },
    { value: staff.length,       label: t('home.stats.team') },
  ].filter((s) => s.value > 0)
  return (
    <>
      <Seo
        title="Rene Football · Agence de football au Luxembourg"
        bareTitle
        description="Agent FIFA licencié basé au Luxembourg. Représentation de joueurs, négociation de transferts, scouting et gestion de carrière, en activité depuis 2010."
        path="/"
      />
      {/* HERO - asymmetric 60/40 split. Theme-aware : light mode keeps the
          editorial layout with high-contrast dark text, dark mode keeps the
          stadium-at-night feel that defines the brand. */}
      <section ref={heroRef} className="relative overflow-hidden text-zinc-900 dark:text-stone-100">
        <MeshGradient intensity="medium" tone="auto" />
        <FloatingAccents />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-7/12 items-center justify-start -ml-10 lg:flex"
        >
          <LuxembourgMap
            className="h-[70%] max-h-[440px] w-auto text-turf-700/70 dark:text-turf-300/50"
            showStroke={false}
            fillOpacity={0.1}
          />
        </div>
        {/* Stroke drawn again above the text (z-20) so the outline stays
           visible where it crosses opaque headline glyphs. Screen-blend was
           tried first but is invisible over pure white text (screen(white,
           anything) ~= white) - a plain semi-transparent overlay reads on
           both the white glyphs and the dark background instead.
           The stroke is wrapped in a `relative` shell so the "Luxembourg"
           label + pin can be absolutely centred over the country silhouette
           without a second layout system. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-7/12 items-center justify-start -ml-10 lg:flex"
        >
          <div className="relative h-[70%] max-h-[440px] flex items-stretch">
            <LuxembourgMap
              className="h-full w-auto text-turf-600/60 dark:text-turf-300/70"
              showFill={false}
              strokeWidth={1.6}
            />
            <LuxembourgLabel />
          </div>
        </div>

        {/* Narrative flowline: continuous L-shape from under the Luxembourg
           pin down to the bottom of the hero, ending in an arrow that points
           to a short caption about long-term player tracking. */}
        <HeroFlowline />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27160%27 height=%27160%27><filter id=%27n%27><feTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27/></filter><rect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/></svg>")',
          }}
        />

        <HeroTrail targetRef={heroRef} />

        {/* Strict full-viewport hero on lg+: content stays inside one screen at any
           resolution. On mobile we let it grow naturally (a tall stacked layout
           would never fit a 100dvh box anyway). Title + portrait sizes are
           viewport-aware (clamp + max-h dvh) so they never push content out. */}
        <div className="container-page grid lg:grid-cols-12 gap-8 lg:gap-10 items-center pt-12 pb-12 lg:pt-16 lg:pb-12 min-h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-3rem)]">
          <motion.div
            className="lg:col-span-7"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.span
              variants={FADE_UP}
              transition={{ type: 'spring', stiffness: 110, damping: 18 }}
              className="inline-flex items-center gap-2 rounded-full border border-turf-300/60 bg-turf-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-turf-800 dark:border-turf-400/30 dark:bg-turf-800/20 dark:text-turf-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-turf-600 dark:bg-turf-300 animate-pulse" />
              {t('home.hero.chip')}
            </motion.span>

            <motion.h1
              variants={FADE_UP}
              transition={{ type: 'spring', stiffness: 110, damping: 18 }}
              className="mt-5 font-display font-semibold leading-[1.05] tracking-tightest text-zinc-950 dark:text-stone-50"
              style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.25rem)' }}
            >
              {t('home.hero.titlePre')}{' '}
              <span className="text-turf-700 dark:text-turf-300">{t('home.hero.titleAccent')}</span>{' '}
              {t('home.hero.titlePost')}
            </motion.h1>

            <motion.p
              variants={FADE_UP}
              transition={{ type: 'spring', stiffness: 110, damping: 18 }}
              className="mt-5 max-w-[58ch] text-base lg:text-lg text-zinc-600 dark:text-stone-400 leading-relaxed"
            >
              {t('home.hero.paragraph')}
            </motion.p>

            <motion.div
              variants={FADE_UP}
              transition={{ type: 'spring', stiffness: 110, damping: 18 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <Link
                to="/joueurs"
                className="btn bg-zinc-950 text-stone-50 hover:bg-zinc-800 dark:bg-stone-50 dark:text-zinc-950 dark:hover:bg-stone-200 ease-premium"
              >
                {t('home.hero.ctaPrimary')}
                <ArrowUpRight size={18} weight="bold" />
              </Link>
              <Link to="/contact" className="btn btn-ghost">
                {t('home.hero.ctaSecondary')}
              </Link>
            </motion.div>
          </motion.div>

          {/* Hero portrait - right column. max-h capped against viewport so it
             never pushes the whole hero past 100dvh on short laptop screens. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.15 }}
            className="lg:col-span-5 relative flex lg:justify-end"
          >
            <div
              className="relative aspect-[3/4] w-full lg:max-w-[440px] ml-auto rounded-[2rem] overflow-hidden border border-stone-300/60 dark:border-stone-50/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              style={{ maxHeight: 'min(75dvh, 600px)' }}
            >
              <img
                src={HERO_PORTRAIT}
                alt=""
                loading="eager"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 30%, rgba(10,10,10,0.45) 70%, #0a0a0a 100%)',
                }}
              />
              {/* Hero identity chip — bound to the first real player in the
                  DB so the name matches the roster instead of a hardcoded
                  placeholder. Hidden entirely when the roster is empty. */}
              {roster[0] && (
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-3">
                  <div>
                    <div className="font-mono text-[0.7rem] uppercase tracking-wider text-turf-300">
                      {t('home.hero.identityLabel')}
                    </div>
                    <div className="mt-1 font-display font-semibold text-stone-50 text-xl">
                      {roster[0].name}
                    </div>
                    <div className="text-stone-400 text-sm">
                      {roster[0].position}{roster[0].age ? ` · ${roster[0].age}` : ''}
                    </div>
                  </div>
                  {roster[0].since && (
                    <div className="flex items-center gap-2 rounded-full bg-stone-50/10 backdrop-blur px-3 py-1.5 border border-stone-50/15">
                      <span className="w-2 h-2 rounded-full bg-turf-300 animate-pulse" />
                      <span className="text-xs text-stone-100">{t('home.hero.signedIn', { year: roster[0].since })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Stats line - filiform, mono numbers, divided by 1px lines.
           Sits BELOW the 100dvh hero box so it never competes for vertical space
           with the headline + portrait. Visible on scroll-down.
           Hidden entirely when STATS is empty (all values are 0). */}
        {STATS.length > 0 && (
          <div className="container-page pb-16 lg:pb-20">
            <div className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-stone-200 dark:divide-stone-50/10 border-t border-stone-200 dark:border-stone-50/10 pt-10">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 110, damping: 18 }}
                  className="px-0 lg:px-8 first:lg:pl-0 py-4 lg:py-0"
                >
                  <div className="font-mono text-3xl lg:text-4xl text-zinc-950 dark:text-stone-50 tabular-nums inline-flex items-baseline">
                    <AnimatedNumber value={s.value} duration={1.6} />
                    {s.suffix && <span className="text-turf-700 dark:text-turf-300 ml-0.5">{s.suffix}</span>}
                  </div>
                  <div className="mt-2 text-sm text-zinc-600 dark:text-stone-400">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* MERCATO TICKER */}
      <MercatoTicker />

      {/* ROSTER PREVIEW - light section, gallery feel.
          Hidden entirely when the API resolves an empty roster so an empty
          deployment doesn't publish a "no players yet" line to guests. */}
      {(loading || roster.length > 0) && (
      <section className="bg-stone-50 dark:bg-zinc-950 py-20 lg:py-28">
        <div className="container-page">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div>
              <span className="eyebrow">{t('home.roster.eyebrow')}</span>
              <AnimatedUnderline className="mt-2" />
              <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50 max-w-[18ch]">
                {t('home.roster.title')}
              </h2>
            </div>
            <Link
              to="/joueurs"
              className="inline-flex items-center gap-2 text-zinc-950 dark:text-stone-50 font-medium border-b border-zinc-950/30 dark:border-stone-50/30 hover:border-zinc-950 dark:hover:border-stone-50 transition pb-1 self-start"
            >
              {t('home.roster.viewAll')}
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </div>

          {loading && roster.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-stone-200 dark:bg-zinc-900 animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.ul
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-100px' }}
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
            >
              {roster.map((p) => {
                const photo = LOCAL_PORTRAITS[p.slug] ?? playerImage(p)
                return (
                  <motion.li
                    key={p.slug}
                    variants={FADE_UP}
                    transition={{ type: 'spring', stiffness: 110, damping: 20 }}
                    className="group"
                  >
                    <Link to={`/joueurs/${p.slug}`} className="block">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-stone-200">
                        <img
                          src={photo}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950/70 to-transparent" />
                        <div className="absolute top-3 left-3 font-mono text-[0.65rem] uppercase tracking-wider text-stone-50/90 bg-zinc-950/40 backdrop-blur px-2 py-1 rounded-full">
                          {p.age} ans
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-stone-50">
                          <div className="font-display font-medium text-base lg:text-lg leading-tight">
                            {p.name}
                          </div>
                          <div className="text-xs text-stone-300 mt-0.5">{p.position}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-zinc-700 dark:text-stone-300">{p.club ?? '-'}</span>
                        <ArrowUpRight
                          size={14}
                          weight="bold"
                          className="text-zinc-400 group-hover:text-turf-700 dark:group-hover:text-turf-300 transition"
                        />
                      </div>
                    </Link>
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </div>
      </section>
      )}

      {/* BRAND VIDEO - dark editorial break between roster (light) and services (light).
         Facade YouTube : poster only at first paint, iframe loaded on click. */}
      <section className="relative overflow-hidden bg-zinc-950 text-stone-100 py-20 lg:py-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 15% 30%, rgba(30, 64, 175,0.30), transparent 60%),' +
              'radial-gradient(ellipse 50% 50% at 85% 80%, rgba(30, 64, 175,0.18), transparent 55%),' +
              'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
          }}
        />

        <div className="container-page">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-10 lg:mb-14">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 110, damping: 20 }}
              className="lg:col-span-7"
            >
              <span className="eyebrow text-turf-300">{t('home.brandVideo.eyebrow')}</span>
              <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-[1.05] tracking-tight max-w-[18ch]">
                {t('home.brandVideo.title')} <span className="text-turf-300">{t('home.brandVideo.titleAccent')}</span>
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 110, damping: 20, delay: 0.08 }}
              className="lg:col-span-5 text-stone-400 leading-relaxed lg:pb-2"
            >
              {t('home.brandVideo.paragraph')}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          >
            <YouTubeEmbed
              videoId="bu84Ph4KCG0"
              title={t('home.brandVideo.videoTitle')}
            />
          </motion.div>
        </div>
      </section>

      {/* SERVICES - bento asymétrique, pas de 4 cards alignées */}
      <section className="bg-stone-50 dark:bg-zinc-950 pt-4 pb-20 lg:pb-28">
        <div className="container-page">
          <div className="max-w-[44ch] mb-12">
            <span className="eyebrow">{t('home.services.eyebrow')}</span>
            <AnimatedUnderline className="mt-2" />
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
              {t('home.services.title')}
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-stone-400 leading-relaxed">
              {t('home.services.intro')}
            </p>
          </div>

          <div className="grid lg:grid-cols-5 lg:auto-rows-[14rem] gap-4 lg:gap-5">
            {SERVICES.map(({ Icon, key, span, accent }) => (
              <motion.article
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ type: 'spring', stiffness: 110, damping: 20 }}
                className={`relative overflow-hidden rounded-3xl border p-7 lg:p-8 flex flex-col justify-between ${span} ${
                  accent
                    ? 'bg-white text-zinc-900 border-stone-200/80 shadow-diffusion dark:bg-zinc-900 dark:text-stone-100 dark:border-white/10'
                    : 'bg-white text-zinc-900 border-stone-200/80 dark:bg-zinc-900 dark:text-stone-50 dark:border-stone-50/10'
                }`}
              >
                <div
                  className={`grid place-items-center w-11 h-11 rounded-xl ${
                    accent
                      ? 'bg-turf-50 text-turf-800 border border-turf-100 dark:bg-turf-800/40 dark:text-turf-200 dark:border-turf-300/30'
                      : 'bg-turf-50 text-turf-800 border border-turf-100 dark:bg-turf-800/40 dark:text-turf-200 dark:border-turf-300/30'
                  }`}
                >
                  <Icon size={22} weight="regular" />
                </div>
                {accent && (
                  <div>
                    <div className="font-mono text-5xl lg:text-6xl font-semibold text-turf-700 dark:text-turf-200 tracking-tight">
                      <AnimatedNumber value={players.length} />
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                      {t('home.stats.players')}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="font-display font-semibold text-xl lg:text-2xl tracking-tight text-zinc-950 dark:text-stone-50">
                    {t(`home.services.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed max-w-[40ch] text-zinc-600 dark:text-stone-400">
                    {t(`home.services.${key}.text`)}
                  </p>
                </div>
                {accent && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(30, 64, 175,0.30), transparent 70%)' }}
                  />
                )}
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* WHY AN AGENCY - fact-based section that pre-answers "why should a
         player/club deal with an agency" before the contact CTA. Every
         figure is sourced from FIFA's Football Agents Annual Report 2025
         and the CIES Football Observatory - links visible so nobody has
         to trust our word. */}
      <section className="bg-white dark:bg-zinc-950 border-t border-stone-200/80 dark:border-stone-50/10 py-20 lg:py-28 transition-colors">
        <div className="container-page">
          <div className="max-w-[60ch]">
            <span className="eyebrow">{t('home.why.eyebrow')}</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tightest text-zinc-950 dark:text-stone-50 leading-[1.05]">
              {t('home.why.title')}
            </h2>
            <p className="mt-6 text-base lg:text-lg text-zinc-600 dark:text-stone-400 leading-relaxed">
              {t('home.why.intro')}
            </p>
          </div>

          {/* Stat headliners — figures (0,5 % / 58 % / $1,37 Md) stay in the
              source language ; only the surrounding narrative is translated. */}
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              { stat: '0,5%',    key: 'one',   sourceLabel: 'FIFA',      sourceHref: 'https://digitalhub.fifa.com/m/1e7b741fa0fae779/original/FIFA-Football-Agent-Regulations.pdf' },
              { stat: '58%',     key: 'two',   sourceLabel: 'CIES',      sourceHref: 'https://football-observatory.com/IMG/pdf/report_agents_2012-2.pdf' },
              { stat: '$1,37 Md', key: 'three', sourceLabel: 'FIFA 2025', sourceHref: 'https://digitalhub.fifa.com/m/1e7b741fa0fae779/original/FIFA-Football-Agent-Regulations.pdf' },
            ].map((s) => (
              <motion.article
                key={s.stat}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 110, damping: 22 }}
                className="rounded-3xl border border-stone-200/80 bg-stone-50 dark:bg-zinc-900 dark:border-stone-50/10 p-6 lg:p-7 flex flex-col"
              >
                <div className="font-mono text-4xl lg:text-5xl font-semibold text-zinc-950 dark:text-stone-50 tracking-tight tabular-nums">
                  {s.stat}
                </div>
                <div className="mt-3 font-display font-medium text-base lg:text-lg text-zinc-950 dark:text-stone-50 leading-snug">
                  {t(`home.why.stats.${s.key}.label`)}
                </div>
                <p className="mt-3 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
                  {t(`home.why.stats.${s.key}.detail`)}
                </p>
                <a
                  href={s.sourceHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.22em] font-mono text-turf-700 dark:text-turf-300 hover:text-turf-800 dark:hover:text-turf-200 transition-colors"
                >
                  {t('home.why.sourceLabel')} · {s.sourceLabel}
                  <ArrowUpRight size={11} weight="bold" />
                </a>
              </motion.article>
            ))}
          </div>

          {/* Value pillars - what an agency actually adds beyond the numbers */}
          <div className="mt-14 grid lg:grid-cols-2 gap-4">
            {[
              { Icon: ShieldCheck, key: 'one'   },
              { Icon: TrendUp,     key: 'two'   },
              { Icon: ScanSmiley,  key: 'three' },
              { Icon: Handshake,   key: 'four'  },
            ].map(({ Icon, key }) => (
              <motion.article
                key={key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 110, damping: 22 }}
                className="rounded-2xl border border-stone-200/80 bg-white dark:bg-zinc-900 dark:border-stone-50/10 p-6 flex items-start gap-4"
              >
                <span className="grid place-items-center w-11 h-11 rounded-xl bg-turf-50 text-turf-800 border border-turf-100 dark:bg-turf-800/30 dark:border-turf-300/25 dark:text-turf-300 shrink-0">
                  <Icon size={20} weight="regular" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-base lg:text-lg text-zinc-950 dark:text-stone-50 tracking-tight">
                    {t(`home.why.pillars.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">{t(`home.why.pillars.${key}.text`)}</p>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Consolidated sources footnote */}
          <div className="mt-10 pt-6 border-t border-stone-200/70 dark:border-stone-50/10 flex flex-wrap gap-x-6 gap-y-2 text-[0.68rem] uppercase tracking-[0.18em] font-mono text-zinc-500 dark:text-stone-500">
            <span className="text-zinc-400 dark:text-stone-600">{t('home.why.sources')}</span>
            <a
              href="https://digitalhub.fifa.com/m/1e7b741fa0fae779/original/FIFA-Football-Agent-Regulations.pdf"
              target="_blank"
              rel="noreferrer"
              className="hover:text-turf-700 dark:hover:text-turf-300 transition-colors inline-flex items-center gap-1"
            >
              FIFA · Football Agent Regulations
              <ArrowUpRight size={10} weight="bold" />
            </a>
            <a
              href="https://football-observatory.com/IMG/pdf/report_agents_2012-2.pdf"
              target="_blank"
              rel="noreferrer"
              className="hover:text-turf-700 dark:hover:text-turf-300 transition-colors inline-flex items-center gap-1"
            >
              CIES · Football Observatory
              <ArrowUpRight size={10} weight="bold" />
            </a>
            <a
              href="https://www.hudl.com/blog/2023-fifa-football-agent-regulations"
              target="_blank"
              rel="noreferrer"
              className="hover:text-turf-700 dark:hover:text-turf-300 transition-colors inline-flex items-center gap-1"
            >
              Réforme FIFA 2023
              <ArrowUpRight size={10} weight="bold" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA - 4 audience cards deep-linking into the wizard step 2 so
         visitors know upfront that the form adapts to their profile. */}
      <section className="text-stone-100 py-20 lg:py-28 relative overflow-hidden">
        <MeshGradient intensity="subtle" />
        <div className="container-page">
          <div className="max-w-[60ch]">
            <span className="eyebrow text-turf-300">{t('home.cta.eyebrow')}</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-tight tracking-tight">
              {t('home.cta.title')}
              <br />
              <span className="text-stone-400">
                {t('home.cta.subtitle')}
              </span>
            </h2>
            <p className="mt-6 text-stone-400 leading-relaxed">
              {t('home.cta.paragraph')}
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { reason: 'joueur', i18nKey: 'player', Icon: SoccerBall },
              { reason: 'club',   i18nKey: 'club',   Icon: Buildings },
              { reason: 'medias', i18nKey: 'media',  Icon: MegaphoneSimple },
              { reason: 'autre',  i18nKey: 'other',  Icon: Question },
            ].map(({ reason, i18nKey, Icon }) => (
              <Link
                key={reason}
                to={`/contact?reason=${reason}`}
                className="group relative flex items-start gap-3 rounded-2xl border border-stone-50/10 bg-stone-50/[0.03] hover:bg-stone-50/[0.06] hover:border-stone-50/25 p-5 transition-colors ease-premium"
              >
                <span className="grid place-items-center w-10 h-10 rounded-xl bg-turf-800/40 text-turf-200 border border-turf-300/25 shrink-0">
                  <Icon size={18} weight="regular" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-sm text-stone-50">{t(`contact.audience.${i18nKey}.label`)}</span>
                  <span className="block mt-1 text-xs text-stone-400 leading-relaxed">{t(`contact.audience.${i18nKey}.hint`)}</span>
                </span>
                <ArrowUpRight
                  size={13}
                  weight="bold"
                  className="absolute top-4 right-4 text-stone-500 group-hover:text-turf-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all ease-premium"
                />
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-mono text-stone-400 hover:text-stone-50 transition-colors"
            >
              {t('home.cta.browseAll')}
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default HomePage
