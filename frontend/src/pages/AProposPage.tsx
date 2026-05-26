import { useRef } from 'react'
import type { RefObject } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionTemplate, useScroll, useSpring, useTransform } from 'framer-motion'
import {
  ArrowUpRight,
  Compass,
  Handshake,
  Person,
  ScanSmiley,
  ShieldCheck,
} from '@phosphor-icons/react'
import MeshGradient from '../components/MeshGradient'
import AnimatedNumber from '../components/AnimatedNumber'
import AnimatedUnderline from '../components/AnimatedUnderline'
import Skeleton from '../components/Skeleton'
import { usePublicStaff } from '../lib/usePublicStaff'

const PILLARS = [
  {
    Icon: Handshake,
    title: 'Représentation',
    text: "Une équipe restreinte par joueur - agent, conseiller juridique, préparateur mental - qui suit chaque mandat au quotidien.",
  },
  {
    Icon: ScanSmiley,
    title: 'Scouting',
    text: "Un réseau de scouts à travers l'Europe - Benelux, Allemagne, France, Pays-Bas - avec des grilles d'évaluation calibrées pour chaque poste.",
  },
  {
    Icon: ShieldCheck,
    title: 'Accompagnement long terme',
    text: "Trajectoire de carrière, image, partenariats. Nous pensons une carrière comme un projet, pas comme un transfert.",
  },
]

const STATS: { value: number; label: string; suffix?: string }[] = [
  { value: 127, label: 'Joueurs représentés', suffix: '+' },
  { value: 16,  label: "Années d'expérience" },
  { value: 38,  label: 'Clubs partenaires',  suffix: '+' },
  { value: 14,  label: 'Pays couverts' },
]

const TIMELINE = [
  { year: '2010', title: "Création de l'agence", text: "Hélène Marchetti fonde Rene Football à Luxembourg avec deux mandats." },
  { year: '2015', title: "Premier transfert majeur", text: "Signature d'un milieu offensif en première division belge - premier mandat en Bundesliga la même année." },
  { year: '2020', title: "Ouverture du pôle scouting", text: "Recrutement d'un réseau de 8 scouts à travers l'Europe (Benelux, France, Allemagne, Pays-Bas)." },
  { year: '2024', title: "Le roster atteint 100+ joueurs", text: "L'agence accompagne désormais joueurs pros et talents émergents." },
]

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
  const c1 = useTransform(scrollYProgress, [0, 0.5, 1], ['#84b896', '#2d7d4f', '#175133'])
  const c2 = useTransform(scrollYProgress, [0, 0.5, 1], ['#52996d', '#0f5132', '#06251a'])
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
  const timelineRef = useRef<HTMLOListElement | null>(null)
  // Module-level cache via usePublicStaff() — a second visit to /a-propos
  // does NOT re-fetch the API, which was the main cause of the perceived
  // "éternité" load.
  const { staff, loading: staffLoading } = usePublicStaff()

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden text-stone-100">
        <MeshGradient intensity="medium" />
        <div className="container-page pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
              À propos
            </span>
            <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest leading-[1.05] text-stone-50 max-w-[18ch]">
              Une agence pensée comme un cabinet.
            </h1>
            <p className="mt-6 max-w-[58ch] text-base lg:text-lg text-stone-400 leading-relaxed">
              Rene Football accompagne joueurs, familles et clubs depuis
              2010. Notre approche : un nombre limité de mandats, une
              équipe dédiée par profil, et la conviction qu'une carrière
              se construit sur la durée - pas sur un transfert.
            </p>
          </div>
          <div className="lg:col-span-5 lg:justify-self-end self-end">
            <div className="grid grid-cols-2 gap-y-6 gap-x-10 border-t border-stone-50/10 pt-8">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="font-mono text-3xl text-stone-50 tabular-nums inline-flex items-baseline">
                    <AnimatedNumber value={s.value} duration={1.4} />
                    {s.suffix && <span className="text-turf-300 ml-0.5">{s.suffix}</span>}
                  </div>
                  <div className="mt-1 text-xs text-stone-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-stone-50 dark:bg-zinc-950 py-20 lg:py-28 transition-colors">
        <div className="container-page">
          <div className="max-w-[44ch] mb-12">
            <span className="eyebrow">Notre approche</span>
            <AnimatedUnderline className="mt-2" />
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
              Trois piliers, et c'est tout.
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-stone-400 leading-relaxed">
              Nous avons délibérément resserré nos métiers pour rester
              excellents sur ce qui compte vraiment dans la vie d'un joueur.
            </p>
          </div>

          <motion.ul
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="grid lg:grid-cols-3 gap-5 lg:gap-6"
          >
            {PILLARS.map(({ Icon, title, text }) => (
              <motion.li
                key={title}
                variants={FADE_UP}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                className="rounded-3xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-7 lg:p-8"
              >
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-turf-50 dark:bg-turf-800/30 text-turf-800 dark:text-turf-300 border border-turf-100 dark:border-turf-300/20">
                  <Icon size={22} weight="regular" />
                </div>
                <h3 className="mt-5 font-display font-semibold text-xl tracking-tight text-zinc-950 dark:text-stone-50">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-stone-400 max-w-[40ch]">
                  {text}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* Staff — hidden entirely once we know there is no staff to show.
          We keep the section visible during the initial fetch so the layout
          doesn't pop ; the skeleton fills the slot until we have the answer. */}
      {(staffLoading || staff.length > 0) && (
      <section className="bg-white dark:bg-zinc-950 border-y border-stone-200/80 dark:border-stone-50/10 py-20 lg:py-28 transition-colors">
        <div className="container-page">
          <div className="flex items-end justify-between gap-6 mb-12 flex-wrap">
            <div className="max-w-[44ch]">
              <span className="eyebrow">L'équipe</span>
              <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
                Une cellule restreinte, choisie.
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-stone-400 max-w-[42ch]">
              Quatre profils complémentaires. Pas d'intermédiaires entre
              vous et la personne qui suit votre dossier.
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

      {/* Timeline */}
      <section className="bg-stone-50 dark:bg-zinc-950 py-20 lg:py-28 transition-colors">
        <div className="container-page">
          <div className="max-w-[44ch] mb-12">
            <span className="eyebrow">Notre histoire</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
              Quinze ans, sans presser.
            </h2>
          </div>

          <ol ref={timelineRef} className="relative pl-10 sm:pl-14 max-w-3xl">
            <TimelineRail targetRef={timelineRef} />
            {TIMELINE.map((t, i) => (
              <motion.li
                key={t.year}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ type: 'spring', stiffness: 110, damping: 22, delay: i * 0.05 }}
                className="relative pb-12 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-[34px] sm:-left-[42px] top-1.5 grid place-items-center w-6 h-6 rounded-full bg-turf-700 border-2 border-stone-50 dark:border-zinc-950 shadow-[0_0_8px_rgba(15,81,50,0.6)]"
                >
                  <Compass size={11} weight="bold" className="text-stone-50" />
                </span>
                <div className="font-mono tabular-nums text-turf-700 dark:text-turf-300 text-sm uppercase tracking-wider">
                  {t.year}
                </div>
                <h3 className="mt-1 font-display font-medium text-xl lg:text-2xl text-zinc-950 dark:text-stone-50 tracking-tight">
                  {t.title}
                </h3>
                <p className="mt-2 text-base text-zinc-600 dark:text-stone-400 leading-relaxed max-w-[55ch]">
                  {t.text}
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
            <span className="eyebrow text-turf-300">Travailler ensemble</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-tight tracking-tight">
              Vous représentez un club ou un joueur ?
            </h2>
            <p className="mt-4 max-w-[55ch] text-stone-400 leading-relaxed">
              Notre équipe revient vers vous sous 48 heures. Échange
              confidentiel, sans engagement.
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Link
              to="/contact"
              className="btn bg-stone-50 text-zinc-950 hover:bg-stone-200 text-sm px-5 py-3"
            >
              Démarrer la conversation
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default AProposPage
