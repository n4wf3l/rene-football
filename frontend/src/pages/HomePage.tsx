import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Buildings,
  Handshake,
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
import YouTubeEmbed from '../components/YouTubeEmbed'
import MeshGradient from '../components/MeshGradient'
import AnimatedNumber from '../components/AnimatedNumber'
import MagneticLink from '../components/MagneticLink'
import HeroSpotlight from '../components/home/HeroSpotlight'
import LuxClock from '../components/home/LuxClock'
import RouteMap from '../components/home/RouteMap'
import RosterSheet from '../components/home/RosterSheet'
import OutroWordmark from '../components/home/OutroWordmark'
import { usePublicPlayers, pickShowcase } from '../lib/usePublicPlayers'
import { usePublicStaff } from '../lib/usePublicStaff'
import heroPortrait from '../assets/player2.png'

/** Icon + key ; title/text come from home.services.<key>.title / .text */
const SERVICES: Array<{ Icon: typeof Handshake; key: 'representation' | 'contracts' | 'scouting' | 'career' }> = [
  { Icon: Handshake,   key: 'representation' },
  { Icon: ShieldCheck, key: 'contracts' },
  { Icon: ScanSmiley,  key: 'scouting' },
  { Icon: TrendUp,     key: 'career' },
]

const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Players with an uploaded photo (not the initials placeholder). */
function hasRealPhoto(url: string | null): boolean {
  return !!url && !url.includes('picsum.photos')
}

interface HeadlineProps {
  pre: string
  accent: string
  post: string
}

/** H1 revealed word by word from behind a mask - the hero's load sequence. */
function Headline({ pre, accent, post }: HeadlineProps) {
  const reduce = useReducedMotion()
  const words = [
    ...pre.split(' ').map((w) => ({ w, accent: false })),
    ...accent.split(' ').map((w) => ({ w, accent: true })),
    ...post.split(' ').map((w) => ({ w, accent: false })),
  ].filter((x) => x.w)

  return (
    <h1
      className="font-display font-semibold leading-[0.96] tracking-tightest text-zinc-950 dark:text-stone-50"
      style={{ fontSize: 'clamp(2.6rem, 6vw, 5.4rem)' }}
    >
      <span className="sr-only">{`${pre} ${accent} ${post}`}</span>
      <span aria-hidden="true">
        {words.map(({ w, accent: isAccent }, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span
              className={`inline-block ${isAccent ? 'text-turf-700 italic dark:text-turf-300' : ''}`}
              initial={reduce ? false : { y: '108%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 + i * 0.05 }}
            >
              {w}
            </motion.span>
            {i < words.length - 1 && '\u00a0'}
          </span>
        ))}
      </span>
    </h1>
  )
}

function HomePage() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement | null>(null)
  const { players, loading } = usePublicPlayers()
  const { staff } = usePublicStaff()

  // Every published player, most active first - the hero card cycles through
  // the ones with a real photo, the team sheet lists them all.
  const ordered = useMemo(() => pickShowcase(players, players.length), [players])
  const spotlight = useMemo(() => ordered.filter((p) => hasRealPhoto(p.photo_url)), [ordered])
  const sheet = useMemo(() => ordered.slice(0, 8), [ordered])

  // Live stats derived from the DB so we never inflate the numbers. Values of
  // 0 are filtered out so an empty deployment doesn't publicise "0 clubs".
  const clubsCount = useMemo(
    () => new Set(players.map((p) => p.club).filter(Boolean)).size,
    [players],
  )
  const yearsOfExperience = new Date().getFullYear() - 2010
  const STATS: { value: number; label: string }[] = [
    { value: players.length,     label: t('home.stats.players') },
    { value: yearsOfExperience,  label: t('home.stats.years') },
    { value: clubsCount,         label: t('home.stats.clubs') },
    { value: staff.length,       label: t('home.stats.team') },
  ].filter((s) => s.value > 0)

  // Giant background wordmark drifts slower than the page (hero depth).
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const wordmarkY = useTransform(heroProgress, [0, 1], reduce ? ['0%', '0%'] : ['0%', '35%'])

  return (
    <>
      <Seo
        title="Rene Football · Agence de football au Luxembourg"
        bareTitle
        description="Agent FIFA licencié basé au Luxembourg. Représentation de joueurs, négociation de transferts, scouting et gestion de carrière, en activité depuis 2010."
        path="/"
      />

      {/* HERO - follows the site theme: headline left, the represented
          players cycling on a ticket-cut card right, the agency wordmark set
          huge behind everything. */}
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
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500 dark:text-stone-400"
            >
              <span className="text-turf-700 dark:text-turf-300">{t('home.hero.chip')}</span>
              <span className="h-px w-8 bg-zinc-950/20 dark:bg-stone-50/20" aria-hidden="true" />
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-turf-600 animate-pulse dark:bg-turf-300" aria-hidden="true" />
                {t('home.hero.clock')} <LuxClock />
              </span>
            </motion.div>

            <div className="mt-7">
              <Headline pre={t('home.hero.titlePre')} accent={t('home.hero.titleAccent')} post={t('home.hero.titlePost')} />
            </div>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.7 }}
              className="mt-7 max-w-[54ch] text-base leading-relaxed text-zinc-600 dark:text-stone-400 lg:text-lg"
            >
              {t('home.hero.paragraph')}
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.82 }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <MagneticLink
                to="/joueurs"
                className="group inline-flex items-center gap-3 bg-zinc-950 px-6 py-4 text-[0.95rem] font-medium text-stone-50 transition-colors duration-300 ease-premium hover:bg-turf-800 dark:bg-stone-50 dark:text-zinc-950 dark:hover:bg-turf-300"
              >
                {t('home.hero.ctaPrimary')}
                <ArrowUpRight size={18} weight="bold" className="transition-transform duration-300 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </MagneticLink>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 border border-zinc-950/20 px-6 py-4 text-[0.95rem] font-medium text-zinc-900 transition-colors duration-300 ease-premium hover:border-zinc-950/60 active:-translate-y-px dark:border-stone-50/20 dark:text-stone-100 dark:hover:border-stone-50/60"
              >
                {t('home.hero.ctaSecondary')}
              </Link>
            </motion.div>

            {STATS.length >= 2 && (
              <motion.dl
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="mt-14 grid max-w-xl grid-cols-2 gap-y-6 border-t border-zinc-950/10 pt-6 dark:border-stone-50/10 sm:grid-cols-4"
              >
                {STATS.map((s) => (
                  <div key={s.label} className="flex flex-col pr-4">
                    <dt className="order-2 mt-1 text-xs leading-snug text-zinc-500 dark:text-stone-500">{s.label}</dt>
                    <dd className="font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                      <AnimatedNumber value={s.value} duration={1.6} />
                    </dd>
                  </div>
                ))}
              </motion.dl>
            )}
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.3 }}
            className="lg:col-span-5"
          >
            <HeroSpotlight players={spotlight} fallbackSrc={heroPortrait} />
          </motion.div>
        </div>
      </section>

      {/* MERCATO TICKER */}
      <MercatoTicker />

      {/* DEPUIS LUXEMBOURG - pinned route map (hides itself without data) */}
      <RouteMap players={players} />

      {/* TEAM SHEET - every represented player, numbered like a line-up */}
      {(loading || sheet.length > 0) && (
        <section className="bg-stone-50 py-20 dark:bg-zinc-950 lg:py-32">
          <div className="container-page">
            <div className="mb-12 grid gap-6 lg:mb-16 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <span className="eyebrow">{t('home.roster.eyebrow')}</span>
                <h2 className="mt-4 max-w-[16ch] font-display text-4xl font-semibold leading-[0.98] tracking-tightest text-zinc-950 dark:text-stone-50 lg:text-6xl">
                  {t('home.roster.title')}
                </h2>
              </div>
              <div className="lg:col-span-4 lg:justify-self-end">
                <Link
                  to="/joueurs"
                  className="inline-flex items-center gap-2 border-b border-zinc-950/30 pb-1 font-medium text-zinc-950 transition hover:border-zinc-950 dark:border-stone-50/30 dark:text-stone-50 dark:hover:border-stone-50"
                >
                  {t('home.roster.viewAll')}
                  <ArrowUpRight size={16} weight="bold" />
                </Link>
              </div>
            </div>
            <RosterSheet players={sheet} loading={loading} />
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

      {/* SERVICES - sticky title left, numbered trades right */}
      <section className="bg-stone-50 py-20 dark:bg-zinc-950 lg:py-32">
        <div className="container-page grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <span className="eyebrow">{t('home.services.eyebrow')}</span>
              <h2 className="mt-4 max-w-[14ch] font-display text-4xl font-semibold leading-[0.98] tracking-tightest text-zinc-950 dark:text-stone-50 lg:text-6xl">
                {t('home.services.title')}
              </h2>
              <p className="mt-6 max-w-[44ch] leading-relaxed text-zinc-600 dark:text-stone-400">
                {t('home.services.intro')}
              </p>
            </div>
          </div>

          <ol className="lg:col-span-7 border-t border-stone-300/70 dark:border-stone-50/10">
            {SERVICES.map(({ Icon, key }, i) => (
              <motion.li
                key={key}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, ease: EASE_OUT }}
                className="group grid grid-cols-[3.5rem_1fr] gap-x-4 border-b border-stone-300/70 py-9 dark:border-stone-50/10 sm:grid-cols-[5rem_1fr_auto] lg:py-11"
              >
                <span className="font-display text-4xl font-semibold leading-none tabular-nums text-turf-700/80 dark:text-turf-300/80 lg:text-5xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-stone-50 lg:text-3xl">
                    {t(`home.services.${key}.title`)}
                  </h3>
                  <p className="mt-3 max-w-[48ch] text-[0.95rem] leading-relaxed text-zinc-600 dark:text-stone-400">
                    {t(`home.services.${key}.text`)}
                  </p>
                </div>
                <Icon
                  size={28}
                  weight="regular"
                  aria-hidden="true"
                  className="hidden text-zinc-300 transition-[color,transform] duration-500 ease-premium group-hover:-rotate-6 group-hover:text-turf-700 dark:text-stone-600 dark:group-hover:text-turf-300 sm:block"
                />
              </motion.li>
            ))}
          </ol>
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
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
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
                className="flex flex-col border-t-2 border-zinc-950 pt-6 dark:border-stone-50"
              >
                <div className="font-display text-5xl lg:text-7xl font-semibold text-zinc-950 dark:text-stone-50 tracking-tightest tabular-nums">
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
          <div className="mt-16 grid gap-x-10 gap-y-8 lg:grid-cols-2">
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
                className="flex items-start gap-4 border-t border-stone-200 pt-6 dark:border-stone-50/10"
              >
                <span className="grid place-items-center w-11 h-11 bg-turf-50 text-turf-800 border border-turf-100 dark:bg-turf-800/30 dark:border-turf-300/25 dark:text-turf-300 shrink-0">
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
                className="group relative flex items-start gap-3 border border-stone-50/10 bg-stone-50/[0.03] hover:bg-stone-50/[0.06] hover:border-stone-50/25 p-5 transition-colors ease-premium"
              >
                <span className="grid place-items-center w-10 h-10 bg-turf-800/40 text-turf-200 border border-turf-300/25 shrink-0">
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
      {/* OUTRO - the wordmark closes the page */}
      <OutroWordmark />
    </>
  )
}

export default HomePage
