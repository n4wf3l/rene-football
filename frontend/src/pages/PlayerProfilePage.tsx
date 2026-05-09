import { useEffect, useRef, useState } from 'react'
import type { MotionValue } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUpRight,
  Cards,
  FilePdf,
  Flag,
  Lightning,
  ListMagnifyingGlass,
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
import { ApiError, api, pdfUrl } from '../api/client'
import type { Player } from '../types/player'
import MeshGradient from '../components/MeshGradient'
import AnimatedNumber from '../components/AnimatedNumber'
import Pitch from '../components/Pitch'
import ScoutReport from '../components/ScoutReport'
import PlayerRadar from '../components/PlayerRadar'
import PercentileBars from '../components/PercentileBars'
import AppearancesTable from '../components/AppearancesTable'
import ClipsGalleryPublic from '../components/ClipsGalleryPublic'
import type { Appearance } from '../types/appearance'
import type { PlayerClip } from '../types/clip'
import { heatmapFromPosition, isValidGrid } from '../lib/heatmap'

interface SectionEntry {
  id: string
  label: string
}

type ProfileStatus = 'loading' | 'ready' | 'not-found' | 'error'

const SECTIONS_FIELD: SectionEntry[] = [
  { id: 'identite',   label: 'Identité' },
  { id: 'scout',      label: 'Scout' },
  { id: 'saison',     label: 'Saison' },
  { id: 'terrain',    label: 'Terrain' },
  { id: 'creation',   label: 'Création' },
  { id: 'defense',    label: 'Défense' },
  { id: 'physique',   label: 'Physique' },
  { id: 'discipline', label: 'Discipline' },
  { id: 'matchs',     label: 'Match log' },
  { id: 'moments',    label: 'Moments' },
]
const SECTIONS_KEEPER: SectionEntry[] = [
  { id: 'identite',   label: 'Identité' },
  { id: 'scout',      label: 'Scout' },
  { id: 'saison',     label: 'Saison' },
  { id: 'terrain',    label: 'Terrain' },
  { id: 'gardien',    label: 'Activité' },
  { id: 'physique',   label: 'Physique' },
  { id: 'discipline', label: 'Discipline' },
  { id: 'matchs',     label: 'Match log' },
  { id: 'moments',    label: 'Moments' },
]

function safeRatio(num: number, den: number): number {
  if (!den) return 0
  return Math.max(0, Math.min(100, (num / den) * 100))
}

/* Pick the rows shown in the public-facing PercentileBars by category.
   Field players: ~10 rows centered on creation/defense/discipline.
   Keepers: 5 rows focused on the GK essentials. */
function percentileMetricsFor(_category: string, isKeeper: boolean): { key: string; label: string }[] {
  if (isKeeper) {
    return [
      { key: 'matches_played', label: 'Matchs joués' },
      { key: 'minutes_played', label: 'Minutes' },
      { key: 'clean_sheets',   label: 'Clean sheets' },
      { key: 'saves',          label: 'Arrêts' },
      { key: 'pass_accuracy',  label: '% passes' },
    ]
  }
  return [
    { key: 'matches_played',     label: 'Matchs joués' },
    { key: 'goals',              label: 'Buts' },
    { key: 'assists',            label: 'Passes décisives' },
    { key: 'xg',                 label: 'xG' },
    { key: 'xa',                 label: 'xA' },
    { key: 'key_passes',         label: 'Passes clés' },
    { key: 'pass_accuracy',      label: '% passes' },
    { key: 'dribbles_completed', label: 'Dribbles réussis' },
    { key: 'tackles',            label: 'Tacles' },
    { key: 'duels_won',          label: 'Duels gagnés' },
    { key: 'yellow_cards',       label: 'Cartons jaunes' },
  ]
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
  sections: SectionEntry[]
  scrollYProgress: MotionValue<number>
}

function ScrollRail({ sections, scrollYProgress }: ScrollRailProps) {
  const scaleY = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.4 })
  return (
    <div
      aria-hidden="true"
      className="hidden xl:block fixed left-6 top-1/2 -translate-y-1/2 z-20 h-72 pointer-events-none"
    >
      <div className="relative h-full w-px bg-stone-200">
        <motion.span
          className="absolute inset-0 origin-top bg-turf-700 w-px"
          style={{ scaleY }}
        />
        {sections.map((s, i) => (
          <span
            key={s.id}
            className="absolute -left-[3px] w-1.5 h-1.5 rounded-full bg-stone-300"
            style={{ top: `${(i / (sections.length - 1)) * 100}%` }}
          />
        ))}
        <div className="absolute -right-2 top-0 translate-x-full -translate-y-1/2">
          <span className="font-mono uppercase tracking-[0.18em] text-[0.6rem] text-zinc-500 whitespace-nowrap">
            Profil
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
  return (
    <section className="bg-stone-50 min-h-[70vh] py-24 lg:py-32">
      <div className="container-page max-w-page">
        <div className="max-w-[60ch]">
          <span className="font-mono uppercase tracking-[0.2em] text-xs text-turf-700">
            Joueur introuvable
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest text-zinc-950 leading-[1.05]">
            Cette fiche n'est plus disponible.
          </h1>
          <p className="mt-6 text-base lg:text-lg text-zinc-600 leading-relaxed">
            Le joueur que vous cherchez a peut-être été retiré du roster
            public. Revenez à la liste pour découvrir les autres profils
            que nous représentons.
          </p>
          <Link to="/joueurs" className="btn btn-outline mt-10">
            <ArrowLeft size={16} weight="bold" />
            Retour au roster
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
  player: Player
}

function PlayerDetail({ player, percentiles, peersCount, appearances = [], clips = [] }: PlayerDetailProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isKeeper = player.category === 'Gardien'
  const sections = isKeeper ? SECTIONS_KEEPER : SECTIONS_FIELD

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
              <span>Retour au roster</span>
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
                  Joueur représenté
                </span>
                <span className="text-stone-600">·</span>
                <span className="text-xs text-stone-400">Depuis {player.since}</span>
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
                  <dt className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-500">Âge</dt>
                  <dd className="mt-1 font-mono text-xl tabular-nums text-stone-50">{player.age}</dd>
                </div>
                {player.height && (
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-500">Taille</dt>
                    <dd className="mt-1 font-mono text-xl tabular-nums text-stone-50">{player.height}</dd>
                  </div>
                )}
                {player.preferred_foot && (
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-500">Pied fort</dt>
                    <dd className="mt-1 font-mono text-xl text-stone-50">{player.preferred_foot}</dd>
                  </div>
                )}
                {player.nationality && (
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-500">Nationalité</dt>
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
                  src={player.photo_url || `https://picsum.photos/seed/${player.slug}/600/800`}
                  alt={player.name}
                  loading="eager"
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
                      Saison en cours
                    </div>
                    <div className="mt-1 font-mono text-xl text-stone-50 tabular-nums">
                      {player.matches_played} matchs
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-stone-50/10 backdrop-blur px-3 py-1.5 border border-stone-50/15">
                    <span className="w-2 h-2 rounded-full bg-turf-300 animate-pulse" />
                    <span className="text-[0.7rem] text-stone-100">Sous mandat</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sub-nav (sticky) */}
      <nav
        aria-label="Sections du profil"
        className="sticky nav-sticky z-30 bg-stone-50/90 dark:bg-zinc-950/85 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-50/10"
      >
        <div className="container-page py-3 flex items-center gap-2 overflow-x-auto">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:text-stone-50 dark:hover:bg-stone-50/5 transition whitespace-nowrap"
            >
              {s.label}
            </a>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden lg:inline font-mono uppercase tracking-[0.18em] text-[0.6rem] text-zinc-500 dark:text-stone-400 whitespace-nowrap">
              {player.matches_played} matchs · {player.minutes_played.toLocaleString('fr-FR')} min
            </span>
            <a
              href={pdfUrl(player.slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-300 dark:border-stone-50/15 text-zinc-900 dark:text-stone-100 hover:bg-zinc-900 hover:text-stone-50 hover:border-zinc-900 dark:hover:bg-stone-50/10 dark:hover:border-stone-50/30 transition whitespace-nowrap"
            >
              <FilePdf size={13} weight="regular" />
              Fiche PDF
            </a>
          </div>
        </div>
      </nav>

      {/* Identité */}
      <section className="container-page py-16 lg:py-24">
        <SectionHeading id="identite" eyebrow="01 — Profil" title="Identité du joueur." />

        <div className="grid lg:grid-cols-5 gap-5">
          {[
            { Icon: Person,     label: 'Catégorie',     value: player.category },
            { Icon: SoccerBall, label: 'Poste',          value: player.position },
            { Icon: Flag,       label: 'Nationalité',    value: player.nationality ?? '—' },
            { Icon: Ruler,      label: 'Taille',         value: player.height ?? '—' },
            { Icon: Calendar,   label: 'Suivi depuis',   value: player.since ?? '—' },
          ].map(({ Icon, label, value }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              className="rounded-2xl border border-stone-200/80 bg-white p-5 dark:bg-zinc-900 dark:border-stone-50/8"
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

      {/* Profil scout */}
      <section className="bg-white border-y border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/8">
        <div className="container-page">
          <SectionHeading id="scout" eyebrow="02 — Évaluation" title="Profil scout." />
          <ScoutReport
            comparisons={player.comparisons}
            strengths={player.strengths}
            potentialRating={player.potential_rating}
            potentialLabel={player.potential_label}
            scoutQuote={player.scout_quote}
          />

          {/* Radar empreinte + percentiles vs catégorie */}
          <div className="mt-12 lg:mt-16 grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            <div className="lg:col-span-5 rounded-3xl border border-stone-200/80 dark:border-stone-50/8 bg-stone-50/60 dark:bg-zinc-900/40 p-6 lg:p-8 flex flex-col">
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-2">
                Empreinte statistique
              </div>
              <h3 className="font-display font-semibold text-xl lg:text-2xl tracking-tight text-zinc-950 dark:text-stone-50 leading-tight mb-2">
                Six axes-clés du poste.
              </h3>
              <p className="text-xs text-zinc-600 dark:text-stone-400 leading-relaxed mb-4">
                Normalisé sur des références saison standards.
              </p>
              <div className="flex-1 flex justify-center items-center">
                <PlayerRadar players={[player]} size={300} showLegend={false} />
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-stone-200/80 dark:border-stone-50/8 bg-white dark:bg-zinc-900/40 p-6 lg:p-8">
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-2">
                Position dans la catégorie
              </div>
              <h3 className="font-display font-semibold text-xl lg:text-2xl tracking-tight text-zinc-950 dark:text-stone-50 leading-tight mb-2">
                {player.name.split(' ')[0]} vs autres {player.category.toLowerCase()}s.
              </h3>
              <p className="text-xs text-zinc-600 dark:text-stone-400 leading-relaxed mb-5">
                Pour chaque métrique, son pourcentile dans la population des
                joueurs de la même catégorie. <span className="text-turf-700 dark:text-turf-300 font-medium">100 = meilleur</span>,
                <span className="text-rose-700 dark:text-rose-300 font-medium ml-1">0 = dernier</span>.
              </p>
              <PercentileBars
                percentiles={percentiles}
                populationSize={peersCount}
                metrics={percentileMetricsFor(player.category, player.category === 'Gardien')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Saison */}
      <section className="bg-stone-50 border-b border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/8">
        <div className="container-page">
          <SectionHeading id="saison" eyebrow="03 — Volume" title="Saison en cours." />

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-7 grid grid-cols-2 gap-y-10 gap-x-8 lg:border-r lg:border-stone-200 lg:pr-12">
              <StatNumber value={player.matches_played} sub="Matchs joués" />
              {isKeeper ? (
                <>
                  <StatNumber value={player.clean_sheets} sub="Clean sheets" />
                  <StatNumber value={player.saves} sub="Arrêts" />
                  <StatNumber value={minutesPerMatch} suffix="′" sub="Min / match" />
                </>
              ) : (
                <>
                  <StatNumber value={player.goals} sub="Buts" />
                  <StatNumber value={player.assists} sub="Passes décisives" />
                  <StatNumber value={minutesPerMatch} suffix="′" sub="Min / match" />
                </>
              )}
            </div>

            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-3xl bg-zinc-950 text-stone-100 p-6 lg:p-8 relative overflow-hidden">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-12 w-56 h-56 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(15,81,50,0.55), transparent 70%)' }}
                />
                <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
                  Volume de jeu
                </div>
                <div className="mt-4 font-mono text-4xl lg:text-5xl tabular-nums text-stone-50">
                  {player.minutes_played.toLocaleString('fr-FR')}
                  <span className="text-stone-400 text-2xl ml-1">min</span>
                </div>
                <div className="mt-2 text-sm text-stone-400">
                  Sur {player.matches_played} apparitions cette saison.
                </div>
              </div>

              {!isKeeper && (
                <div className="rounded-3xl border border-stone-200/80 bg-white p-6 lg:p-8">
                  <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 mb-4">
                    Performance vs attendu
                  </div>
                  <div className="flex items-baseline gap-6">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Buts − xG</div>
                      <div className={`font-mono text-2xl tabular-nums ${Number(xgDelta) >= 0 ? 'text-turf-700' : 'text-rose-700'}`}>
                        {Number(xgDelta) >= 0 ? '+' : ''}{xgDelta}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Passes − xA</div>
                      <div className={`font-mono text-2xl tabular-nums ${Number(xaDelta) >= 0 ? 'text-turf-700' : 'text-rose-700'}`}>
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

      {/* Terrain — heatmap des zones d'activité (commun field + gardien) */}
      <section className="bg-stone-50 dark:bg-zinc-950 border-y border-stone-200/80 dark:border-stone-50/8 py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading id="terrain" eyebrow="04 — Terrain" title="Zones d'activité." />
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-4 space-y-4">
              <p className="text-zinc-700 dark:text-stone-300 leading-relaxed">
                Carte d'occupation moyenne sur la saison. Les zones les plus
                vertes sont celles où {player.name.split(' ')[0]} est le plus
                actif — touches, courses, duels confondus. Le joueur attaque
                de gauche à droite.
              </p>
              <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200 dark:border-stone-50/10">
                <div>
                  <dt className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500 dark:text-stone-400">Poste de référence</dt>
                  <dd className="mt-1 font-display text-lg text-zinc-950 dark:text-stone-50">{player.position}</dd>
                </div>
                <div>
                  <dt className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500 dark:text-stone-400">Pied fort</dt>
                  <dd className="mt-1 font-display text-lg text-zinc-950 dark:text-stone-50">{player.preferred_foot ?? '—'}</dd>
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

      {/* Création (champ) ou Activité (gardien) */}
      {!isKeeper ? (
        <section className="container-page py-16 lg:py-24">
          <SectionHeading id="creation" eyebrow="05 — Création" title="Création offensive." />

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
            <div className="space-y-6">
              <StatBar label="Précision de tir" raw={shotAccuracy.toFixed(0)} pct={shotAccuracy} suffix="%" />
              <StatBar label="Conversion (buts / tirs)" raw={conversion.toFixed(1)} pct={conversion} suffix="%" />
              <StatBar
                label="% de passes réussies"
                raw={Number(player.pass_accuracy ?? 0).toFixed(1)}
                pct={Number(player.pass_accuracy ?? 0)}
                suffix="%"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500">xG cumulé</div>
                <div className="mt-1 font-mono text-3xl tabular-nums text-zinc-950">
                  {Number(player.xg ?? 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500">xA cumulé</div>
                <div className="mt-1 font-mono text-3xl tabular-nums text-zinc-950">
                  {Number(player.xa ?? 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500">Passes clés</div>
                <div className="mt-1 font-mono text-3xl tabular-nums text-zinc-950">{player.key_passes}</div>
              </div>
              <div>
                <div className="font-mono uppercase tracking-wider text-[0.65rem] text-zinc-500">Dribbles réussis</div>
                <div className="mt-1 font-mono text-3xl tabular-nums text-zinc-950">{player.dribbles_completed}</div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="container-page py-16 lg:py-24">
          <SectionHeading id="gardien" eyebrow="05 — Activité" title="Activité dans la surface." />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6">
              <Shield size={20} weight="regular" className="text-turf-800" />
              <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950">{player.clean_sheets}</div>
              <div className="mt-1 text-xs text-zinc-500 font-mono uppercase tracking-wider">Clean sheets</div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6">
              <Sparkle size={20} weight="regular" className="text-turf-800" />
              <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950">{player.saves}</div>
              <div className="mt-1 text-xs text-zinc-500 font-mono uppercase tracking-wider">Arrêts</div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6">
              <ListMagnifyingGlass size={20} weight="regular" className="text-turf-800" />
              <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950">
                {Number(player.pass_accuracy ?? 0).toFixed(1)}
                <span className="text-stone-400 text-xl">%</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500 font-mono uppercase tracking-wider">Passes réussies</div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6">
              <Person size={20} weight="regular" className="text-turf-800" />
              <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950">{player.duels_won}</div>
              <div className="mt-1 text-xs text-zinc-500 font-mono uppercase tracking-wider">Duels gagnés</div>
            </div>
          </div>
        </section>
      )}

      {/* Défense (champ uniquement) */}
      {!isKeeper && (
        <section className="bg-white border-y border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/8">
          <div className="container-page">
            <SectionHeading id="defense" eyebrow="06 — Défense" title="Travail défensif." />

            <div className="grid lg:grid-cols-3 gap-5 lg:gap-6">
              <div className="rounded-3xl border border-stone-200/80 p-6 lg:p-8">
                <Shield size={22} weight="regular" className="text-turf-800" />
                <div className="mt-5 font-mono text-4xl tabular-nums text-zinc-950">{player.tackles}</div>
                <div className="mt-1 text-xs text-zinc-500 font-mono uppercase tracking-wider">Tacles</div>
              </div>
              <div className="rounded-3xl border border-stone-200/80 p-6 lg:p-8">
                <ListMagnifyingGlass size={22} weight="regular" className="text-turf-800" />
                <div className="mt-5 font-mono text-4xl tabular-nums text-zinc-950">{player.interceptions}</div>
                <div className="mt-1 text-xs text-zinc-500 font-mono uppercase tracking-wider">Interceptions</div>
              </div>
              <div className="rounded-3xl bg-zinc-950 text-stone-100 p-6 lg:p-8 relative overflow-hidden">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-12 -right-10 w-48 h-48 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(15,81,50,0.55), transparent 70%)' }}
                />
                <Person size={22} weight="regular" className="text-turf-300" />
                <div className="mt-5 font-mono text-4xl tabular-nums text-stone-50">{player.duels_won}</div>
                <div className="mt-1 text-xs text-stone-400 font-mono uppercase tracking-wider">Duels gagnés</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Profil physique — affiché seulement si au moins une donnée tracking est présente */}
      {(player.distance_avg_km != null
        || player.sprints_avg != null
        || player.top_speed_kmh != null
        || player.high_intensity_runs_avg != null) && (
        <section className="bg-white border-y border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/8">
          <div className="container-page">
            <SectionHeading
              id="physique"
              eyebrow={isKeeper ? '06 — Physique' : '07 — Physique'}
              title="Profil physique."
            />
            <p className="text-sm text-zinc-600 dark:text-stone-400 mb-6 max-w-[60ch]">
              Moyennes par match issues du tracking GPS.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {player.distance_avg_km != null && (
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/8 bg-stone-50/60 dark:bg-zinc-900/40 p-5">
                  <Path size={20} weight="regular" className="text-turf-700 dark:text-turf-300" />
                  <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                    {player.distance_avg_km.toFixed(1).replace('.', ',')}
                    <span className="text-stone-400 dark:text-stone-500 text-base ml-1">km</span>
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-400">
                    Distance / match
                  </div>
                </div>
              )}
              {player.sprints_avg != null && (
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/8 bg-stone-50/60 dark:bg-zinc-900/40 p-5">
                  <Lightning size={20} weight="regular" className="text-turf-700 dark:text-turf-300" />
                  <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                    {player.sprints_avg}
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-400">
                    Sprints / match
                  </div>
                </div>
              )}
              {player.top_speed_kmh != null && (
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/8 bg-stone-50/60 dark:bg-zinc-900/40 p-5">
                  <Wind size={20} weight="regular" className="text-turf-700 dark:text-turf-300" />
                  <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                    {player.top_speed_kmh.toFixed(1).replace('.', ',')}
                    <span className="text-stone-400 dark:text-stone-500 text-base ml-1">km/h</span>
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-400">
                    Vitesse max
                  </div>
                </div>
              )}
              {player.high_intensity_runs_avg != null && (
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/8 bg-stone-50/60 dark:bg-zinc-900/40 p-5">
                  <PersonSimpleRun size={20} weight="regular" className="text-turf-700 dark:text-turf-300" />
                  <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950 dark:text-stone-50">
                    {player.high_intensity_runs_avg}
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-400">
                    Courses haute intensité
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Discipline */}
      <section className="container-page py-16 lg:py-24">
        <SectionHeading
          id="discipline"
          eyebrow={isKeeper ? '07 — Discipline' : '08 — Discipline'}
          title="Discipline."
        />

        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl">
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-6">
            <Cards size={20} weight="regular" className="text-amber-700" />
            <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950">{player.yellow_cards}</div>
            <div className="mt-1 text-xs text-zinc-500 font-mono uppercase tracking-wider">Cartons jaunes</div>
          </div>
          <div className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-6">
            <Cards size={20} weight="regular" className="text-rose-700" />
            <div className="mt-4 font-mono text-3xl tabular-nums text-zinc-950">{player.red_cards}</div>
            <div className="mt-1 text-xs text-zinc-500 font-mono uppercase tracking-wider">Cartons rouges</div>
          </div>
        </div>
      </section>

      {/* Match log — last 8 appearances */}
      {appearances.length > 0 && (
        <section className="bg-white border-y border-stone-200/80 py-16 lg:py-24 dark:bg-zinc-950 dark:border-stone-50/8">
          <div className="container-page">
            <SectionHeading
              id="matchs"
              eyebrow={isKeeper ? '08 — Match log' : '09 — Match log'}
              title="Derniers matchs."
            />
            <p className="text-sm text-zinc-600 dark:text-stone-400 mb-6 max-w-[60ch]">
              Les huit dernières apparitions du joueur, du plus récent au plus
              ancien. La courbe à droite trace l'évolution de la note (gauche = ancien, droite = récent).
            </p>
            <AppearancesTable appearances={appearances} />
          </div>
        </section>
      )}

      {/* Annotated key moments — frame snapshots, no source video. */}
      {clips.length > 0 && (
        <section className="container-page py-16 lg:py-24">
          <SectionHeading
            id="moments"
            eyebrow={isKeeper ? '09 — Moments' : '10 — Moments'}
            title="Moments clés annotés."
          />
          <p className="text-sm text-zinc-600 dark:text-stone-400 mb-6 max-w-[60ch]">
            Captures de moments précis sélectionnés par notre cellule scout —
            cliquez sur une vignette pour zoomer.
          </p>
          <ClipsGalleryPublic clips={clips} />
        </section>
      )}

      {/* CTA bottom */}
      <section className="text-stone-100 py-16 lg:py-24 relative overflow-hidden">
        <MeshGradient intensity="subtle" />
        <div className="container-page grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <span className="eyebrow text-turf-300">Échanger sur ce profil</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-tight tracking-tight">
              Une question sur {player.name.split(' ')[0]} ?
            </h2>
            <p className="mt-4 max-w-[55ch] text-stone-400 leading-relaxed">
              Notre équipe répond aux clubs et représentants sous 48 heures.
              Les échanges sont confidentiels.
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="btn bg-stone-50 text-zinc-950 hover:bg-stone-200 text-sm px-5 py-3"
            >
              Contacter l'agent
              <ArrowUpRight size={16} weight="bold" />
            </Link>
            <Link to="/joueurs" className="btn btn-ghost text-sm">
              Voir tout le roster
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
  const { slug } = useParams<{ slug: string }>()
  const [player, setPlayer] = useState<Player | null>(null)
  const [percentiles, setPercentiles] = useState<Record<string, number> | null>(null)
  const [peersCount, setPeersCount] = useState<number>(0)
  const [appearances, setAppearances] = useState<Appearance[]>([])
  const [clips, setClips] = useState<PlayerClip[]>([])
  const [status, setStatus] = useState<ProfileStatus>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setPlayer(null)
    setPercentiles(null)
    setAppearances([])
    setClips([])
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
    />
  )
}

export default PlayerProfilePage
