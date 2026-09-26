import { useEffect, useRef, useState } from 'react'
import type { MotionValue } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Buildings,
  Cards,
  FilePdf,
  Flag,
  Lightning,
  ListMagnifyingGlass,
  MegaphoneSimple,
  Path,
  Person,
  PersonSimpleRun,
  Ruler,
  Shield,
  SoccerBall,
  Sparkle,
  Wind,
  Calendar,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { ApiError, api, pdfUrl } from '../api/client'
import type { Player } from '../types/player'
import MeshGradient from '../components/MeshGradient'
import Seo from '../components/Seo'
import AnimatedNumber from '../components/AnimatedNumber'
import Pitch from '../components/Pitch'
import ScoutReport from '../components/ScoutReport'
import PlayerRadar from '../components/PlayerRadar'
import PercentileBars from '../components/PercentileBars'
import AppearancesTable from '../components/AppearancesTable'
import ClipsGalleryPublic from '../components/ClipsGalleryPublic'
import type { Appearance } from '../types/appearance'
import type { PlayerClip } from '../types/clip'
import type { Presentation } from '../types/presentation'
import { heatmapFromPosition, isValidGrid } from '../lib/heatmap'
import { playerImage } from '../lib/playerImage'
import { useDarkHero } from '../hooks/useDarkHero'

type SectionId =
  | 'identite'
  | 'scout'
  | 'saison'
  | 'terrain'
  | 'creation'
  | 'defense'
  | 'physique'
  | 'discipline'
  | 'gardien'
  | 'matchs'
  | 'moments'

type ProfileStatus = 'loading' | 'ready' | 'not-found' | 'error'

const SECTIONS_FIELD: readonly SectionId[] = [
  'identite', 'scout', 'saison', 'terrain', 'creation',
  'defense', 'physique', 'discipline', 'matchs', 'moments',
] as const

const SECTIONS_KEEPER: readonly SectionId[] = [
  'identite', 'scout', 'saison', 'terrain', 'gardien',
  'physique', 'discipline', 'matchs', 'moments',
] as const

function safeRatio(num: number, den: number): number {
  if (!den) return 0
  return Math.max(0, Math.min(100, (num / den) * 100))
}

/* Pick the rows shown in the public-facing PercentileBars by category.
   Field players: ~10 rows centered on creation/defense/discipline.
   Keepers: 5 rows focused on the GK essentials. */
type TFunc = (k: string, opts?: Record<string, unknown>) => string
function percentileMetricsFor(_category: string, isKeeper: boolean, t: TFunc): { key: string; label: string }[] {
  const rows = isKeeper
    ? ['matches_played', 'minutes_played', 'clean_sheets', 'saves', 'pass_accuracy']
    : ['matches_played', 'goals', 'assists', 'xg', 'xa', 'key_passes', 'pass_accuracy', 'dribbles_completed', 'tackles', 'duels_won', 'yellow_cards']
  return rows.map((key) => ({ key, label: t(`playerProfile.metrics.${key}`) }))
}

interface StatNumberProps {
  value: number | string
  suffix?: string
  sub?: string
}

function StatNumber({ value, suffix = '', sub }: StatNumberProps) {
  return (
    <div>
      <div className="font-mono text-3xl lg:text-5xl text-zinc-950 dark:text-stone-50 tabular-nums leading-none">
        {typeof value === 'number'
          ? <AnimatedNumber value={value} duration={1.2} />
          : value}
        {suffix && <span className="text-stone-400 dark:text-stone-500 text-2xl lg:text-3xl ml-0.5">{suffix}</span>}
      </div>
      {sub && <div className="mt-2 text-xs text-zinc-500 dark:text-stone-400 font-mono uppercase tracking-wider">{sub}</div>}
    </div>
  )
}

interface StatBarProps {
  label: string
  raw: number | string
  pct: number
  suffix?: string
}

function StatBar({ label, raw, pct, suffix = '' }: StatBarProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[0.65rem] uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-400">{label}</span>
        <span className="font-mono tabular-nums text-zinc-950 dark:text-stone-50 text-sm">
          {raw}{suffix}
        </span>
      </div>
      <div className="h-1 rounded-full bg-stone-200 dark:bg-stone-50/10 overflow-hidden">
        <motion.span
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: pct / 100 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ type: 'spring', stiffness: 90, damping: 22, delay: 0.05 }}
          className="block h-full bg-turf-700"
          style={{ transformOrigin: 'left' }}
        />
      </div>
    </div>
  )
}

interface ScrollRailProps {
  sections: readonly SectionId[]
  scrollYProgress: MotionValue<number>
}

function ScrollRail({ sections, scrollYProgress }: ScrollRailProps) {
  const { t } = useTranslation()
  const scaleY = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.4 })
  return (
    <div
      aria-hidden="true"
      className="hidden xl:block fixed left-6 top-1/2 -translate-y-1/2 z-20 h-72 pointer-events-none"
    >
      <div className="relative h-full w-px bg-stone-200 dark:bg-stone-50/10">
        <motion.span
          className="absolute inset-0 origin-top bg-turf-700 dark:bg-turf-300 w-px"
          style={{ scaleY }}
        />
        {sections.map((id, i) => (
          <span
            key={id}
            className="absolute -left-[3px] w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-50/20"
            style={{ top: `${(i / (sections.length - 1)) * 100}%` }}
          />
        ))}
        <div className="absolute -right-2 top-0 translate-x-full -translate-y-1/2">
          <span className="font-mono uppercase tracking-[0.18em] text-[0.6rem] text-zinc-500 dark:text-stone-400 whitespace-nowrap">
            {t('playerProfile.scrollRail.label')}
          </span>
        </div>
      </div>
    </div>
  )
}

interface SectionHeadingProps {
  id: string
  eyebrow: string
  title: string
}

function SectionHeading({ id, eyebrow, title }: SectionHeadingProps) {
  return (
    <div id={id} className="scroll-mt-24 mb-8">
      <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-700 dark:text-turf-300">{eyebrow}</span>
      <h2 className="mt-2 font-display font-semibold text-2xl lg:text-4xl text-zinc-950 dark:text-stone-50 tracking-tight">
        {title}
      </h2>
    </div>
  )
}

/* --- Loading skeleton with shimmer --- */
function PlayerSkeleton() {
  return (
    <div>
      <section className="bg-zinc-950 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="container-page grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-5">
            <div className="h-3 w-32 bg-stone-50/10 rounded animate-pulse" />
            <div className="h-12 lg:h-20 w-3/4 bg-stone-50/10 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-stone-50/10 rounded animate-pulse" />
            <div className="grid grid-cols-3 gap-6 pt-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-stone-50/10 rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="aspect-[3/4] w-full max-w-[440px] ml-auto bg-stone-50/10 rounded-3xl animate-pulse" />
          </div>
        </div>
      </section>
      <section className="container-page py-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-stone-200 rounded-3xl animate-pulse" />
        ))}
      </section>
    </div>
  )
}

/* --- 404 / error view --- */
function NotFoundView() {
  const { t } = useTranslation()
  return (
    <section className="bg-stone-50 min-h-[70vh] py-24 lg:py-32">
      <div className="container-page max-w-page">
        <div className="max-w-[60ch]">
          <span className="font-mono uppercase tracking-[0.2em] text-xs text-turf-700">
            {t('playerProfile.notFound.eyebrow')}
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest text-zinc-950 leading-[1.05]">
            {t('playerProfile.notFound.title')}
          </h1>
          <p className="mt-6 text-base lg:text-lg text-zinc-600 leading-relaxed">
            {t('playerProfile.notFound.paragraph')}
          </p>
          <Link to="/joueurs" className="btn btn-outline mt-10">
            <ArrowLeft size={16} weight="bold" />
            {t('playerProfile.backToRoster')}
          </Link>
        </div>
      </div>
    </section>
  )
}

/* --- Main detail content --- */
interface PlayerDetailProps {
  percentiles?: Record<string, number> | null
  peersCount?: number
  appearances?: Appearance[]
  clips?: PlayerClip[]
  presentations?: Presentation[]
  player: Player
}

function PlayerDetail({ player, percentiles, peersCount, appearances = [], clips = [], presentations = [] }: PlayerDetailProps) {
  const { t, i18n } = useTranslation()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isKeeper = player.category === 'Gardien'

  /* ─────────────────────────── Section visibility ───────────────────────────
   * A public profile must never expose empty/zero stat sections - a U9 player
   * shouldn't display "0 cartons / 0 cartons" or an empty defense bloc. We
   * compute a `vis` map up-front and use it to (a) filter the nav rail,
   * (b) gate each <section>, (c) renumber the eyebrows so there are no holes
   * like "06 - Défense" jumping to "08 - Discipline".
   * ----------------------------------------------------------------------- */
  const hasTracking = (player.distance_avg_km ?? 0) > 0
    || (player.sprints_avg ?? 0) > 0
    || (player.top_speed_kmh ?? 0) > 0
    || (player.high_intensity_runs_avg ?? 0) > 0

  const hasScoutProfile = (player.comparisons?.length ?? 0) > 0
    || (player.strengths?.length ?? 0) > 0
    || (player.scout_quote?.trim().length ?? 0) > 0
    || (player.potential_rating ?? 0) > 0

  const vis = {
    identite:   true, // identity is always shown - individual fields filter themselves below
    scout:      hasScoutProfile,
    saison:     (player.matches_played ?? 0) > 0,
    // Only show the heatmap if the admin actually painted one - never the
    // generic fallback from `heatmapFromPosition`, which is a placeholder.
    terrain:    isValidGrid(player.heatmap_grid),
    creation:   !isKeeper && (
      (player.goals ?? 0) > 0
      || (player.assists ?? 0) > 0
      || (player.xg ?? 0) > 0
      || (player.xa ?? 0) > 0
      || (player.key_passes ?? 0) > 0
      || (player.dribbles_completed ?? 0) > 0
    ),
    gardien:    isKeeper && (
      (player.clean_sheets ?? 0) > 0
      || (player.saves ?? 0) > 0
    ),
    defense:    !isKeeper && (
      (player.tackles ?? 0) > 0
      || (player.interceptions ?? 0) > 0
      || (player.duels_won ?? 0) > 0
    ),
    physique:   hasTracking,
    discipline: (player.yellow_cards ?? 0) > 0 || (player.red_cards ?? 0) > 0,
    matchs:     appearances.length > 0,
    moments:    clips.length > 0,
  }

  // Short label used on the nav rail (translated at render time).
  const navLabel = (id: SectionId): string => t(`playerProfile.sections.${id}.nav`)
  // Full-length section heading (translated at render time).
  const sectionTitle = (id: SectionId): string => t(`playerProfile.sections.${id}.title`)

  // Ordered list of section ids that survive the visibility gate. Drives the
  // nav rail AND the eyebrow numbering, so they stay in sync at all costs.
  const allOrder = isKeeper ? SECTIONS_KEEPER : SECTIONS_FIELD
  const visibleSections = allOrder.filter((id) => (vis as Record<string, boolean>)[id])
  const sections = visibleSections

  // 1-based, zero-padded number for the eyebrow of a given section id.
  // Returns null when the section isn't visible - caller should not render it.
  const numberFor = (id: SectionId): string | null => {
    const idx = visibleSections.indexOf(id)
    if (idx < 0) return null
    return String(idx + 1).padStart(2, '0')
  }
  // Eyebrow with the current dynamic number, e.g. "03 - Défense".
  const eyebrow = (id: SectionId): string => `${numberFor(id) ?? '00'} - ${navLabel(id)}`

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start' as const, 'end end' as const],
  })

  const shotAccuracy = safeRatio(player.shots_on_target, player.shots)
  const conversion   = safeRatio(player.goals, player.shots)
  const minutesPerMatch = player.matches_played
    ? Math.round(player.minutes_played / player.matches_played)
    : 0
  const xgDelta = (player.goals - (player.xg ?? 0)).toFixed(1)
  const xaDelta = (player.assists - (player.xa ?? 0)).toFixed(1)

  return (
    <div ref={containerRef}>
      <Seo
        title={player.name}
        description={
          player.bio
            ? player.bio.slice(0, 155)
            : t('playerProfile.seo.descriptionFallback', {
                name: player.name,
                role: player.position ?? player.category,
                club: player.club ? ` (${player.club})` : '',
              })
        }
        path={`/joueurs/${player.slug}`}
        ogType="profile"
        image={player.photo_url ? (player.photo_url.startsWith('http') ? player.photo_url : `https://renefootball.com${player.photo_url}`) : undefined}
      />
      <ScrollRail sections={sections} scrollYProgress={scrollYProgress} />

      {/* Hero */}
      <section className="relative overflow-hidden text-stone-100">
        <MeshGradient intensity="subtle" />

        <div className="container-page pt-8 pb-16 lg:pt-10 lg:pb-24">
          <div className="mb-10">
            <Link
              to="/joueurs"
              className="inline-flex items-center gap-2 text-sm text-stone-300 hover:text-stone-50 transition group"
            >
              <ArrowLeft size={16} weight="bold" className="transition-transform group-hover:-translate-x-0.5" />
              <span>{t('playerProfile.backToRoster')}</span>
            </Link>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-end">
            <motion.div
              className="lg:col-span-7"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 110, damping: 20 }}
            >
              <div className="flex items-center gap-2 flex-wrap mb-5">
                <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
                  {t('playerProfile.hero.representedPlayer')}
                </span>
                <span className="text-stone-600">·</span>
                <span className="text-xs text-stone-400">{t('playerProfile.hero.since', { year: player.since })}</span>
              </div>

              <h1 className="font-display font-semibold text-stone-50 leading-[1.02] tracking-tightest text-[clamp(2.5rem,8vw,5.5rem)] max-w-[16ch]">
                {player.name}
              </h1>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-turf-800/40 border border-turf-300/30 text-turf-200 text-xs font-medium">
                  {player.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-stone-50/5 border border-stone-50/10 text-stone-200 text-xs font-medium">
                  {player.position}
                </span>
                {player.club && (
                  <span className="px-3 py-1 rounded-full bg-stone-50/5 border border-stone-50/10 text-stone-200 text-xs font-medium">
                    {player.club}
                  </span>
                )}
              </div>

              <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-8 border-t border-stone-50/10 pt-8 max-w-[600px]">
                <div>
                  <dt className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-500">{t('playerProfile.hero.age')}</dt>
                  <dd className="mt-1 font-mono text-xl tabular-nums text-stone-50">{player.age}</dd>
                </div>
                {player.height && (
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-500">{t('playerProfile.hero.height')}</dt>
                    <dd className="mt-1 font-mono text-xl tabular-nums text-stone-50">{player.height}</dd>
                  </div>
                )}
                {player.preferred_foot && (
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-500">{t('playerProfile.hero.preferredFoot')}</dt>
                    <dd className="mt-1 font-mono text-xl text-stone-50">{player.preferred_foot}</dd>
                  </div>
                )}
                {player.nationality && (
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-500">{t('playerProfile.hero.nationality')}</dt>
                    <dd className="mt-1 font-mono text-xl text-stone-50">{player.nationality}</dd>
                  </div>
                )}
              </dl>
            </motion.div>

            <motion.div
              className="lg:col-span-5"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.15 }}
            >
              <div className="relative aspect-[3/4] w-full max-w-[440px] ml-auto rounded-[2rem] overflow-hidden border border-stone-50/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <img
                  src={playerImage(player)}
                  alt={player.name}
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, transparent 35%, rgba(10,10,10,0.55) 75%, #0a0a0a 100%)',
                  }}
                />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
                  <div>
                    <div className="font-mono text-[0.7rem] uppercase tracking-wider text-turf-300">
                      {t('playerProfile.hero.currentSeason')}
                    </div>
                    <div className="mt-1 font-mono text-xl text-stone-50 tabular-nums">
                      {t('playerProfile.hero.matchesCount', { count: player.matches_played })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-stone-50/10 backdrop-blur px-3 py-1.5 border border-stone-50/15">
                    <span className="w-2 h-2 rounded-full bg-turf-300 animate-pulse" />
                    <span className="text-[0.7rem] text-stone-100">{t('playerProfile.hero.underContract')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sub-nav (sticky) - carries the player identity so the reader always
         knows whose stats they're scrolling through. Photo + name + position
         sit on the left, section anchors in the middle, actions on the right. */}
      <nav
        aria-label={t('playerProfile.stickyNav.sectionsAria')}
        className="sticky nav-sticky z-30 bg-stone-50/90 dark:bg-zinc-950/85 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-50/10"
      >
        {/* Full viewport width (bypass container-page's max-w-page) so the
            identity chip + 9 anchor pills + stats + actions fit on one line
            without triggering a horizontal scrollbar. `scrollbar-hide` keeps
            behaviour graceful on tiny screens where content still overflows
            (scroll works, scrollbar itself is hidden cross-browser). */}
        <div className="relative z-10 w-full px-4 md:px-8 py-2.5 flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Compact identity - stays anchored on the left even at narrow widths. */}
          <div className="flex items-center gap-2.5 pr-3 mr-1 shrink-0 border-r border-stone-200/80 dark:border-stone-50/10">
            {player.photo_url ? (
              <img
                src={playerImage(player)}
                alt=""
                className="w-8 h-8 rounded-lg object-cover shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg grid place-items-center bg-stone-200 dark:bg-stone-50/10 text-zinc-500 dark:text-stone-400 text-[0.7rem] font-mono font-bold shrink-0">
                {player.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <div className="font-display font-semibold text-sm text-zinc-950 dark:text-stone-50 truncate max-w-[16ch] sm:max-w-none">
                {player.name}
              </div>
              <div className="text-[0.65rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate max-w-[16ch] sm:max-w-none">
                {player.position ?? player.category}
              </div>
            </div>
          </div>

          {sections.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:text-stone-50 dark:hover:bg-stone-50/5 transition whitespace-nowrap"
            >
              {navLabel(id)}
            </a>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden lg:inline font-mono uppercase tracking-[0.18em] text-[0.6rem] text-zinc-500 dark:text-stone-400 whitespace-nowrap">
              {t('playerProfile.stickyNav.summary', { matches: player.matches_played, minutes: player.minutes_played.toLocaleString(i18n.resolvedLanguage) })}
            </span>
            <a
              href={pdfUrl(player.slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-300 dark:border-stone-50/15 text-zinc-900 dark:text-stone-100 hover:bg-zinc-900 hover:text-stone-50 hover:border-zinc-900 dark:hover:bg-stone-50/10 dark:hover:border-stone-50/30 transition whitespace-nowrap"
            >
              <FilePdf size={13} weight="regular" />
              {t('playerProfile.pdfButton')}
            </a>
            {presentations.slice(0, 3).map((pres) => (
              <a
                key={pres.id}
                href={`/api/presentations/${pres.public_token}`}
                target="_blank"
                rel="noreferrer"
                title={pres.title}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-turf-700 text-stone-50 hover:bg-turf-800 dark:bg-turf-300 dark:text-zinc-950 dark:hover:bg-turf-200 transition whitespace-nowrap"
              >
                <FilePdf size={13} weight="regular" />
                {t('playerProfile.stickyNav.presentationButton')}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Identité - always shown, individual cards filter themselves out when null. */}
      <section className="container-page py-16 lg:py-24">
        <SectionHeading id="identite" eyebrow={eyebrow('identite')} title={sectionTitle('identite')} />

        <div className="grid lg:grid-cols-5 gap-5">
          {([
            { Icon: Person,     key: 'category',    label: t('playerProfile.identity.cards.category'),    value: player.category },
            { Icon: SoccerBall, key: 'position',    label: t('playerProfile.identity.cards.position'),    value: player.position },
            { Icon: Flag,       key: 'nationality', label: t('playerProfile.identity.cards.nationality'), value: player.nationality },
            { Icon: Ruler,      key: 'height',      label: t('playerProfile.identity.cards.height'),      value: player.height },
            { Icon: Calendar,   key: 'since',       label: t('playerProfile.identity.cards.since'),       value: player.since },
          ] as const).filter((card) => card.value !== null && card.value !== undefined && card.value !== '').map(({ Icon, key, label, value }) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              className="rounded-2xl border border-stone-200/80 bg-white p-5 dark:bg-zinc-900 dark:border-stone-50/10"
            >
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-turf-50 text-turf-800 border border-turf-100">
                <Icon size={18} weight="regular" />
              </div>
              <div className="mt-4 text-[0.65rem] uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-400">
                {label}
              </div>
              <div className="mt-1 font-display font-medium text-base text-zinc-950 dark:text-stone-50">{value}</div>
            </motion.div>
          ))}
        </div>

        {player.bio && (
          <div className="mt-10 max-w-[68ch] text-zinc-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
            {player.bio}
          </div>
        )}
      </section>

      {/* Profil scout - only shown when at least one scout-side field is filled. */}
      {vis.scout && (
      <section className="bg-white border-y border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/10">
        <div className="container-page">
          <SectionHeading id="scout" eyebrow={eyebrow('scout')} title={sectionTitle('scout')} />
          <ScoutReport
            comparisons={player.comparisons}
            strengths={player.strengths}
            potentialRating={player.potential_rating}
            potentialLabel={player.potential_label}
            scoutQuote={player.scout_quote}
          />

          {/* Radar empreinte + percentiles vs catégorie */}
          <div className="mt-12 lg:mt-16 grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            <div className="lg:col-span-5 rounded-3xl border border-stone-200/80 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-900/40 p-6 lg:p-8 flex flex-col">
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-2">
                {t('playerProfile.scout.footprint.eyebrow')}
              </div>
              <h3 className="font-display font-semibold text-xl lg:text-2xl tracking-tight text-zinc-950 dark:text-stone-50 leading-tight mb-2">
                {t('playerProfile.scout.footprint.title')}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-stone-400 leading-relaxed mb-4">
                {t('playerProfile.scout.footprint.description')}
              </p>
              <div className="flex-1 flex justify-center items-center">
                <PlayerRadar players={[player]} size={300} showLegend={false} />
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-6 lg:p-8">
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-2">
                {t('playerProfile.scout.percentiles.eyebrow')}
              </div>
              <h3 className="font-display font-semibold text-xl lg:text-2xl tracking-tight text-zinc-950 dark:text-stone-50 leading-tight mb-2">
                {t('playerProfile.scout.percentiles.title', { firstName: player.name.split(' ')[0], category: player.category.toLowerCase() })}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-stone-400 leading-relaxed mb-5">
                {t('playerProfile.scout.percentiles.description')}{' '}
                <span className="text-turf-700 dark:text-turf-300 font-medium">{t('playerProfile.scout.percentiles.best')}</span>,
                <span className="text-rose-700 dark:text-rose-300 font-medium ml-1">{t('playerProfile.scout.percentiles.worst')}</span>.
              </p>
              <PercentileBars
                percentiles={percentiles}
                populationSize={peersCount}
                metrics={percentileMetricsFor(player.category, player.category === 'Gardien', t)}
              />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Saison - hidden if the player hasn't played a match yet. */}
      {vis.saison && (
      <section className="bg-stone-50 border-b border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/10">
        <div className="container-page">
          <SectionHeading id="saison" eyebrow={eyebrow('saison')} title={sectionTitle('saison')} />

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-7 grid grid-cols-2 gap-y-10 gap-x-8 lg:border-r lg:border-stone-200 dark:lg:border-stone-50/10 lg:pr-12">
              <StatNumber value={player.matches_played} sub={t('playerProfile.season.matchesPlayed')} />
              {isKeeper ? (
                <>
                  <StatNumber value={player.clean_sheets} sub={t('playerProfile.season.cleanSheets')} />
                  <StatNumber value={player.saves} sub={t('playerProfile.season.saves')} />
                  <StatNumber value={minutesPerMatch} suffix="′" sub={t('playerProfile.season.minutesPerMatch')} />
                </>
              ) : (
                <>
                  <StatNumber value={player.goals} sub={t('playerProfile.season.goals')} />
                  <StatNumber value={player.assists} sub={t('playerProfile.season.assists')} />
                  <StatNumber value={minutesPerMatch} suffix="′" sub={t('playerProfile.season.minutesPerMatch')} />
                </>
              )}
            </div>

            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-3xl bg-zinc-950 text-stone-100 p-6 lg:p-8 relative overflow-hidden">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-12 w-56 h-56 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(30, 64, 175,0.55), transparent 70%)' }}
                />
                <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
                  {t('playerProfile.season.playVolume')}
                </div>
                <div className="mt-4 font-mono text-4xl lg:text-5xl tabular-nums text-stone-50">
                  {player.minutes_played.toLocaleString(i18n.resolvedLanguage)}
                  <span className="text-stone-400 text-2xl ml-1">min</span>
                </div>
                <div className="mt-2 text-sm text-stone-400">
                  {t('playerProfile.season.overAppearances', { count: player.matches_played })}
                </div>
              </div>

              {!isKeeper && (
                <div className="rounded-3xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-6 lg:p-8">
                  <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-4">
                    {t('playerProfile.season.performanceVsExpected')}
                  </div>
                  <div className="flex items-baseline gap-6">
                    <div>
                      <div className="text-xs text-zinc-500 dark:text-stone-400 mb-1">{t('playerProfile.season.goalsMinusXG')}</div>
                      <div className={`font-mono text-2xl tabular-nums ${Number(xgDelta) >= 0 ? 'text-turf-700 dark:text-turf-300' : 'text-rose-700 dark:text-rose-300'}`}>
                        {Number(xgDelta) >= 0 ? '+' : ''}{xgDelta}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 dark:text-stone-400 mb-1">{t('playerProfile.season.assistsMinusXA')}</div>
                      <div className={`font-mono text-2xl tabular-nums ${Number(xaDelta) >= 0 ? 'text-turf-700 dark:text-turf-300' : 'text-rose-700 dark:text-rose-300'}`}>
                        {Number(xaDelta) >= 0 ? '+' : ''}{xaDelta}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Terrain - only shown when a real heatmap was painted (not the generic
          position fallback, which would mislead for very young players). */}
      {vis.terrain && (
      <section className="bg-stone-50 dark:bg-zinc-950 border-y border-stone-200/80 dark:border-stone-50/10 py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading id="terrain" eyebrow={eyebrow('terrain')} title={sectionTitle('terrain')} />
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-4 space-y-4">
              <p className="text-zinc-700 dark:text-stone-300 leading-relaxed">
                {t('playerProfile.terrain.description', { firstName: player.name.split(' ')[0] })}
              </p>
              <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200 dark:border-stone-50/10">
                <div>
                  <dt className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500 dark:text-stone-400">{t('playerProfile.terrain.referencePosition')}</dt>
                  <dd className="mt-1 font-display text-lg text-zinc-950 dark:text-stone-50">{player.position}</dd>
                </div>
                <div>
                  <dt className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500 dark:text-stone-400">{t('playerProfile.terrain.preferredFoot')}</dt>
                  <dd className="mt-1 font-display text-lg text-zinc-950 dark:text-stone-50">{player.preferred_foot ?? '-'}</dd>
                </div>
              </dl>
            </div>
            <div className="lg:col-span-8">
              <Pitch
                mode="view"
                grid={isValidGrid(player.heatmap_grid)
                  ? player.heatmap_grid
                  : heatmapFromPosition(player.position, player.slug)}
              />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Création (champ) ou Activité (gardien) - gated by vis.creation/vis.gardien. */}
      {vis.creation ? (
        <section className="container-page py-16 lg:py-24">
          <SectionHeading id="creation" eyebrow={eyebrow('creation')} title={sectionTitle('creation')} />

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
            <div className="space-y-6">
              <StatBar label={t('playerProfile.creation.shotAccuracy')} raw={shotAccuracy.toFixed(0)} pct={shotAccuracy} suffix="%" />
              <StatBar label={t('playerProfile.creation.conversion')} raw={conversion.toFixed(1)} pct={conversion} suffix="%" />
              <StatBar
                label={t('playerProfile.creation.passAccuracy')}
                raw={Number(player.pass_accuracy ?? 0).toFixed(1)}
                pct={Number(player.pass_accuracy ?? 0)}
                suffix="%"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500 dark:text-stone-400">{t('playerProfile.creation.cumulativeXG')}</div>
                <div className="mt-1 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                  {Number(player.xg ?? 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500 dark:text-stone-400">{t('playerProfile.creation.cumulativeXA')}</div>
                <div className="mt-1 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                  {Number(player.xa ?? 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500 dark:text-stone-400">{t('playerProfile.creation.keyPasses')}</div>
                <div className="mt-1 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">{player.key_passes}</div>
              </div>
              <div>
                <div className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500 dark:text-stone-400">{t('playerProfile.creation.dribblesCompleted')}</div>
                <div className="mt-1 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">{player.dribbles_completed}</div>
              </div>
            </div>
          </div>
        </section>
      ) : vis.gardien ? (
        <section className="container-page py-16 lg:py-24">
          <SectionHeading id="gardien" eyebrow={eyebrow('gardien')} title={sectionTitle('gardien')} />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-6">
              <Shield size={20} weight="regular" className="text-turf-800 dark:text-turf-300" />
              <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">{player.clean_sheets}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400 font-mono uppercase tracking-wider">{t('playerProfile.keeper.cleanSheets')}</div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-6">
              <Sparkle size={20} weight="regular" className="text-turf-800 dark:text-turf-300" />
              <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">{player.saves}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400 font-mono uppercase tracking-wider">{t('playerProfile.keeper.saves')}</div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-6">
              <ListMagnifyingGlass size={20} weight="regular" className="text-turf-800 dark:text-turf-300" />
              <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                {Number(player.pass_accuracy ?? 0).toFixed(1)}
                <span className="text-stone-400 text-xl">%</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400 font-mono uppercase tracking-wider">{t('playerProfile.keeper.passAccuracy')}</div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-6">
              <Person size={20} weight="regular" className="text-turf-800 dark:text-turf-300" />
              <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">{player.duels_won}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400 font-mono uppercase tracking-wider">{t('playerProfile.keeper.duelsWon')}</div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Défense (champ uniquement) - hidden when no defensive action recorded. */}
      {vis.defense && (
        <section className="bg-white border-y border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/10">
          <div className="container-page">
            <SectionHeading id="defense" eyebrow={eyebrow('defense')} title={sectionTitle('defense')} />

            <div className="grid lg:grid-cols-3 gap-5 lg:gap-6">
              <div className="rounded-3xl border border-stone-200/80 dark:border-stone-50/10 dark:bg-zinc-900/40 p-6 lg:p-8">
                <Shield size={22} weight="regular" className="text-turf-800 dark:text-turf-300" />
                <div className="mt-5 font-mono text-4xl tabular-nums text-zinc-950 dark:text-stone-50">{player.tackles}</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400 font-mono uppercase tracking-wider">{t('playerProfile.defense.tackles')}</div>
              </div>
              <div className="rounded-3xl border border-stone-200/80 dark:border-stone-50/10 dark:bg-zinc-900/40 p-6 lg:p-8">
                <ListMagnifyingGlass size={22} weight="regular" className="text-turf-800 dark:text-turf-300" />
                <div className="mt-5 font-mono text-4xl tabular-nums text-zinc-950 dark:text-stone-50">{player.interceptions}</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400 font-mono uppercase tracking-wider">{t('playerProfile.defense.interceptions')}</div>
              </div>
              {/* Carte d'accent (toujours sombre) - en dark mode on lui donne une bordure
                  subtile et un fond légèrement plus clair que le `section` parent (zinc-950)
                  pour qu'elle ne se fonde pas dans le background. */}
              <div className="rounded-3xl bg-zinc-950 dark:bg-zinc-900 text-stone-100 p-6 lg:p-8 relative overflow-hidden border border-transparent dark:border-stone-50/10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-12 -right-10 w-48 h-48 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(30, 64, 175,0.55), transparent 70%)' }}
                />
                <Person size={22} weight="regular" className="text-turf-300" />
                <div className="mt-5 font-mono text-4xl tabular-nums text-stone-50">{player.duels_won}</div>
                <div className="mt-1 text-xs text-stone-400 font-mono uppercase tracking-wider">{t('playerProfile.defense.duelsWon')}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Profil physique - gated by vis.physique (at least one tracking value > 0). */}
      {vis.physique && (
        <section className="bg-white border-y border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/10">
          <div className="container-page">
            <SectionHeading
              id="physique"
              eyebrow={eyebrow('physique')}
              title={sectionTitle('physique')}
            />
            <p className="text-sm text-zinc-600 dark:text-stone-400 mb-6 max-w-[60ch]">
              {t('playerProfile.physique.gpsAverage')}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {player.distance_avg_km != null && (
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-900/40 p-5">
                  <Path size={20} weight="regular" className="text-turf-700 dark:text-turf-300" />
                  <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                    {player.distance_avg_km.toLocaleString(i18n.resolvedLanguage, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    <span className="text-stone-400 dark:text-stone-500 text-base ml-1">km</span>
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-400">
                    {t('playerProfile.physique.distancePerMatch')}
                  </div>
                </div>
              )}
              {player.sprints_avg != null && (
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-900/40 p-5">
                  <Lightning size={20} weight="regular" className="text-turf-700 dark:text-turf-300" />
                  <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                    {player.sprints_avg}
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-400">
                    {t('playerProfile.physique.sprintsPerMatch')}
                  </div>
                </div>
              )}
              {player.top_speed_kmh != null && (
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-900/40 p-5">
                  <Wind size={20} weight="regular" className="text-turf-700 dark:text-turf-300" />
                  <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                    {player.top_speed_kmh.toLocaleString(i18n.resolvedLanguage, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    <span className="text-stone-400 dark:text-stone-500 text-base ml-1">km/h</span>
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-400">
                    {t('playerProfile.physique.topSpeed')}
                  </div>
                </div>
              )}
              {player.high_intensity_runs_avg != null && (
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-900/40 p-5">
                  <PersonSimpleRun size={20} weight="regular" className="text-turf-700 dark:text-turf-300" />
                  <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                    {player.high_intensity_runs_avg}
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-400">
                    {t('playerProfile.physique.highIntensityRuns')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Discipline - hidden when no card has ever been recorded (also drops the
          0/0 cards card for U9 / U13 profiles where it would be meaningless). */}
      {vis.discipline && (
      <section className="container-page py-16 lg:py-24">
        <SectionHeading
          id="discipline"
          eyebrow={eyebrow('discipline')}
          title={sectionTitle('discipline')}
        />

        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl">
          <div className="rounded-2xl border border-amber-200/70 dark:border-amber-400/20 bg-amber-50/40 dark:bg-amber-500/[0.08] p-6">
            <Cards size={20} weight="regular" className="text-amber-700 dark:text-amber-300" />
            <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-amber-50">{player.yellow_cards}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-amber-200/80 font-mono uppercase tracking-wider">{t('playerProfile.discipline.yellowCards')}</div>
          </div>
          <div className="rounded-2xl border border-rose-200/70 dark:border-rose-400/20 bg-rose-50/40 dark:bg-rose-500/[0.08] p-6">
            <Cards size={20} weight="regular" className="text-rose-700 dark:text-rose-300" />
            <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-rose-50">{player.red_cards}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-rose-200/80 font-mono uppercase tracking-wider">{t('playerProfile.discipline.redCards')}</div>
          </div>
        </div>
      </section>
      )}

      {/* Match log - last 8 appearances. Gated by vis.matchs (= appearances.length > 0). */}
      {vis.matchs && (
        <section className="bg-white border-y border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/10">
          <div className="container-page">
            <SectionHeading
              id="matchs"
              eyebrow={eyebrow('matchs')}
              title={sectionTitle('matchs')}
            />
            <p className="text-sm text-zinc-600 dark:text-stone-400 mb-6 max-w-[60ch]">
              {t('playerProfile.matchs.description')}
            </p>
            <AppearancesTable appearances={appearances} />
          </div>
        </section>
      )}

      {/* Annotated key moments - frame snapshots, no source video. */}
      {vis.moments && (
        <section className="container-page py-16 lg:py-24">
          <SectionHeading
            id="moments"
            eyebrow={eyebrow('moments')}
            title={sectionTitle('moments')}
          />
          <p className="text-sm text-zinc-600 dark:text-stone-400 mb-6 max-w-[60ch]">
            {t('playerProfile.moments.description')}
          </p>
          <ClipsGalleryPublic clips={clips} />
        </section>
      )}

      {/* CTA bottom - the two shortcut buttons deep-link into the Contact
         wizard pre-configured with the player already picked, so a club or
         a journalist doesn't have to re-tell us who they're interested in. */}
      <section className="text-stone-100 py-16 lg:py-24 relative overflow-hidden">
        <MeshGradient intensity="subtle" />
        <div className="container-page grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
            <span className="eyebrow text-turf-300">{t('playerProfile.cta.eyebrow')}</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-tight tracking-tight">
              {t('playerProfile.cta.title', { firstName: player.name.split(' ')[0] })}
            </h2>
            <p className="mt-4 max-w-[55ch] text-stone-400 leading-relaxed">
              {t('playerProfile.cta.paragraph', { name: player.name })}
            </p>
          </div>
          <div className="lg:col-span-5 lg:justify-self-end flex flex-col gap-2.5 w-full lg:max-w-[380px]">
            <Link
              to={`/contact?reason=club&interest=player&player_id=${player.id}`}
              className="group inline-flex items-center gap-3 rounded-2xl border border-stone-50/15 bg-stone-50 text-zinc-950 hover:bg-stone-200 px-5 py-4 transition-colors ease-premium"
            >
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-zinc-950/5 text-zinc-950 shrink-0">
                <Buildings size={16} weight="regular" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-sm">{t('playerProfile.cta.club.label')}</span>
                <span className="block text-[0.7rem] text-zinc-600">{t('playerProfile.cta.club.hint')}</span>
              </span>
              <ArrowUpRight
                size={14}
                weight="bold"
                className="text-zinc-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <Link
              to={`/contact?reason=medias&purpose=interview_player&player_id=${player.id}`}
              className="group inline-flex items-center gap-3 rounded-2xl border border-stone-50/15 bg-stone-50/[0.04] hover:bg-stone-50/[0.08] text-stone-100 px-5 py-4 transition-colors ease-premium"
            >
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-stone-50/10 text-turf-300 shrink-0">
                <MegaphoneSimple size={16} weight="regular" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-sm">{t('playerProfile.cta.media.label')}</span>
                <span className="block text-[0.7rem] text-stone-400">{t('playerProfile.cta.media.hint')}</span>
              </span>
              <ArrowUpRight
                size={14}
                weight="bold"
                className="text-stone-500 group-hover:text-turf-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 mt-1 text-xs uppercase tracking-[0.18em] font-mono text-stone-400 hover:text-stone-50 transition-colors self-start"
            >
              {t('playerProfile.cta.other')}
              <ArrowRight size={11} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

interface PlayerResponse {
  data: Player
  percentiles?: Record<string, number> | null
  peers_count?: number
  appearances?: Appearance[]
  clips?: PlayerClip[]
}

function PlayerProfilePage() {
  useDarkHero()
  const { slug } = useParams<{ slug: string }>()
  const [player, setPlayer] = useState<Player | null>(null)
  const [percentiles, setPercentiles] = useState<Record<string, number> | null>(null)
  const [peersCount, setPeersCount] = useState<number>(0)
  const [appearances, setAppearances] = useState<Appearance[]>([])
  const [clips, setClips] = useState<PlayerClip[]>([])
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [status, setStatus] = useState<ProfileStatus>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setPlayer(null)
    setPercentiles(null)
    setAppearances([])
    setClips([])
    setPresentations([])
    api.get<PlayerResponse>(`/players/${slug}`)
      .then((res) => {
        if (!cancelled) {
          setPlayer(res.data)
          setPercentiles(res.percentiles ?? null)
          setPeersCount(res.peers_count ?? 0)
          setAppearances(res.appearances ?? [])
          setClips(res.clips ?? [])
          setStatus('ready')
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) setStatus('not-found')
        else setStatus('error')
      })
    // Presentations live behind a separate, optional endpoint - it's fine if
    // it 404s or stays empty, the profile renders without it.
    api.get<{ data: Presentation[] }>(`/players/${slug}/presentations`)
      .then((res) => { if (!cancelled) setPresentations(res.data) })
      .catch(() => { /* non-fatal */ })
    return () => { cancelled = true }
  }, [slug])

  if (status === 'loading') return <PlayerSkeleton />
  if (status === 'not-found' || status === 'error' || !player) return <NotFoundView />

  return (
    <PlayerDetail
      player={player}
      percentiles={percentiles}
      peersCount={peersCount}
      appearances={appearances}
      clips={clips}
      presentations={presentations}
    />
  )
}

export default PlayerProfilePage
