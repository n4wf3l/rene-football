import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Handshake,
  ScanSmiley,
  ShieldCheck,
  TrendUp,
} from '@phosphor-icons/react'
import MercatoTicker from '../components/MercatoTicker'
import HeroTrail from '../components/HeroTrail'
import YouTubeEmbed from '../components/YouTubeEmbed'
import MeshGradient from '../components/MeshGradient'
import FloatingAccents from '../components/FloatingAccents'
import AnimatedNumber from '../components/AnimatedNumber'
import AnimatedUnderline from '../components/AnimatedUnderline'
import { usePublicPlayers, pickShowcase } from '../lib/usePublicPlayers'
import { playerImage } from '../lib/playerImage'
import heroPortrait from '../assets/player2.png'

/** Local portrait overrides - keyed by slug. Lets us pin the agency's
 *  hand-shot photos for specific players without breaking the rest of the
 *  roster (which falls back to playerImage()).
 *  Currently empty (the previous Karim override was removed when the
 *  demo pro was pulled from the seed). */
const LOCAL_PORTRAITS: Record<string, string> = {}

const HERO_PORTRAIT = heroPortrait

const STATS: { value: number; label: string; suffix?: string }[] = [
  { value: 127, label: 'Joueurs représentés', suffix: '+' },
  { value: 16,  label: "Années d'expérience" },
  { value: 38,  label: 'Clubs partenaires',  suffix: '+' },
  { value: 14,  label: 'Pays couverts' },
]

const SERVICES = [
  {
    Icon: Handshake,
    title: 'Représentation de joueurs',
    text: 'Du centre de formation au sommet de la carrière professionnelle, nous accompagnons chaque joueur avec rigueur et discrétion.',
    span: 'lg:col-span-3 lg:row-span-2',
    accent: true,
  },
  {
    Icon: ShieldCheck,
    title: 'Négociation de contrats',
    text: 'Notre expertise juridique sécurise transferts, prolongations et droits à l’image.',
    span: 'lg:col-span-2',
  },
  {
    Icon: ScanSmiley,
    title: 'Scouting & recrutement',
    text: 'Un réseau de scouts à travers l\'Europe - du Benelux à la Bundesliga - pour détecter les profils qui changent une équipe.',
    span: 'lg:col-span-2',
  },
  {
    Icon: TrendUp,
    title: 'Gestion de carrière',
    text: 'Trajectoire long terme, image, partenariats : nous pensons une carrière comme un projet, pas comme un transfert.',
    span: 'lg:col-span-3',
  },
]

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
}

function HomePage() {
  const heroRef = useRef<HTMLElement | null>(null)
  const { players, loading } = usePublicPlayers()
  // Top 4 showcase roster picked from the real DB - sorts by minutes_played
  // so the visible cards always reflect the agency's active stars, not seed order.
  const roster = useMemo(() => pickShowcase(players, 4), [players])
  return (
    <>
      {/* HERO - asymmetric 60/40 split. Theme-aware : light mode keeps the
          editorial layout with high-contrast dark text, dark mode keeps the
          stadium-at-night feel that defines the brand. */}
      <section ref={heroRef} className="relative overflow-hidden text-zinc-900 dark:text-stone-100">
        <MeshGradient intensity="medium" tone="auto" />
        <FloatingAccents />
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
              Agence de football
            </motion.span>

            <motion.h1
              variants={FADE_UP}
              transition={{ type: 'spring', stiffness: 110, damping: 18 }}
              className="mt-5 font-display font-semibold leading-[1.05] tracking-tightest text-zinc-950 dark:text-stone-50"
              style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.25rem)' }}
            >
              Nous façonnons les{' '}
              <span className="text-turf-700 dark:text-turf-300">carrières</span> qui marquent
              le football européen.
            </motion.h1>

            <motion.p
              variants={FADE_UP}
              transition={{ type: 'spring', stiffness: 110, damping: 18 }}
              className="mt-5 max-w-[58ch] text-base lg:text-lg text-zinc-600 dark:text-stone-400 leading-relaxed"
            >
              Basée au Luxembourg, Rene Football accompagne jeunes talents,
              joueurs confirmés et clubs partout en Europe - de la signature
              du premier contrat professionnel jusqu'au sommet de la carrière.
            </motion.p>

            <motion.div
              variants={FADE_UP}
              transition={{ type: 'spring', stiffness: 110, damping: 18 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                to="/joueurs"
                className="btn bg-zinc-950 text-stone-50 hover:bg-zinc-800 dark:bg-stone-50 dark:text-zinc-950 dark:hover:bg-stone-200 ease-premium"
              >
                Découvrir nos joueurs
                <ArrowUpRight size={18} weight="bold" />
              </Link>
              <Link to="/contact" className="btn btn-ghost">
                Nous contacter
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
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-3">
                <div>
                  <div className="font-mono text-[0.7rem] uppercase tracking-wider text-turf-300">
                    Joueur représenté
                  </div>
                  <div className="mt-1 font-display font-semibold text-stone-50 text-xl">
                    Hamzath Mohamadou
                  </div>
                  <div className="text-stone-400 text-sm">Ailier droit - 21 ans</div>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-stone-50/10 backdrop-blur px-3 py-1.5 border border-stone-50/15">
                  <span className="w-2 h-2 rounded-full bg-turf-300 animate-pulse" />
                  <span className="text-xs text-stone-100">Signé en 2025</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats line - filiform, mono numbers, divided by 1px lines.
           Sits BELOW the 100dvh hero box so it never competes for vertical space
           with the headline + portrait. Visible on scroll-down. */}
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
      </section>

      {/* MERCATO TICKER */}
      <MercatoTicker />

      {/* ROSTER PREVIEW - light section, gallery feel */}
      <section className="bg-stone-50 dark:bg-zinc-950 py-20 lg:py-28">
        <div className="container-page">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div>
              <span className="eyebrow">Notre roster</span>
              <AnimatedUnderline className="mt-2" />
              <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50 max-w-[18ch]">
                Une nouvelle génération que nous suivons au quotidien.
              </h2>
            </div>
            <Link
              to="/joueurs"
              className="inline-flex items-center gap-2 text-zinc-950 dark:text-stone-50 font-medium border-b border-zinc-950/30 dark:border-stone-50/30 hover:border-zinc-950 dark:hover:border-stone-50 transition pb-1 self-start"
            >
              Voir tous nos joueurs
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </div>

          {loading && roster.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-stone-200 dark:bg-zinc-900 animate-pulse" />
              ))}
            </div>
          ) : roster.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-stone-400">
              Aucun joueur publié pour le moment.
            </p>
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

      {/* BRAND VIDEO - dark editorial break between roster (light) and services (light).
         Facade YouTube : poster only at first paint, iframe loaded on click. */}
      <section className="relative overflow-hidden bg-zinc-950 text-stone-100 py-20 lg:py-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 15% 30%, rgba(15,81,50,0.30), transparent 60%),' +
              'radial-gradient(ellipse 50% 50% at 85% 80%, rgba(15,81,50,0.18), transparent 55%),' +
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
              <span className="eyebrow text-turf-300">L'agence en mouvement</span>
              <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-[1.05] tracking-tight max-w-[18ch]">
                Plus qu'une agence, <span className="text-turf-300">un projet de vie.</span>
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 110, damping: 20, delay: 0.08 }}
              className="lg:col-span-5 text-stone-400 leading-relaxed lg:pb-2"
            >
              Notre méthode, nos joueurs, notre vision du métier d'agent - en une
              minute. Une parenthèse pour comprendre qui nous sommes avant de
              parler de votre projet.
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
              title="Rene Football - présentation de l'agence"
            />
          </motion.div>
        </div>
      </section>

      {/* SERVICES - bento asymétrique, pas de 4 cards alignées */}
      <section className="bg-stone-50 dark:bg-zinc-950 pt-4 pb-20 lg:pb-28">
        <div className="container-page">
          <div className="max-w-[44ch] mb-12">
            <span className="eyebrow">Nos métiers</span>
            <AnimatedUnderline className="mt-2" />
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
              Une expertise complète, pensée comme un cabinet.
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-stone-400 leading-relaxed">
              De la détection à la fin de carrière, chaque étape est suivie
              par une équipe restreinte, choisie pour sa connaissance fine
              du jeu et du droit du sport.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 lg:auto-rows-[14rem] gap-4 lg:gap-5">
            {SERVICES.map(({ Icon, title, text, span, accent }) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ type: 'spring', stiffness: 110, damping: 20 }}
                className={`relative overflow-hidden rounded-3xl border p-7 lg:p-8 flex flex-col justify-between ${span} ${
                  accent
                    ? 'bg-zinc-950 text-stone-100 border-stone-950/10 shadow-diffusion'
                    : 'bg-white text-zinc-900 border-stone-200/80 dark:bg-zinc-900 dark:text-stone-50 dark:border-stone-50/8'
                }`}
              >
                <div
                  className={`grid place-items-center w-11 h-11 rounded-xl ${
                    accent
                      ? 'bg-turf-800/40 text-turf-200 border border-turf-300/30'
                      : 'bg-turf-50 text-turf-800 border border-turf-100 dark:bg-turf-800/40 dark:text-turf-200 dark:border-turf-300/30'
                  }`}
                >
                  <Icon size={22} weight="regular" />
                </div>
                <div>
                  <h3
                    className={`font-display font-semibold text-xl lg:text-2xl tracking-tight ${
                      accent ? 'text-stone-50' : 'text-zinc-950 dark:text-stone-50'
                    }`}
                  >
                    {title}
                  </h3>
                  <p
                    className={`mt-3 text-sm leading-relaxed max-w-[40ch] ${
                      accent ? 'text-stone-400' : 'text-zinc-600 dark:text-stone-400'
                    }`}
                  >
                    {text}
                  </p>
                </div>
                {accent && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(15,81,50,0.55), transparent 70%)' }}
                  />
                )}
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-stone-100 py-20 lg:py-28 relative overflow-hidden">
        <MeshGradient intensity="subtle" />
        <div className="container-page grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <span className="eyebrow text-turf-300">Prendre contact</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-tight tracking-tight">
              Vous êtes joueur, club ou famille ?
              <br />
              <span className="text-stone-400">
                Échangeons sur votre projet.
              </span>
            </h2>
            <p className="mt-6 max-w-[55ch] text-stone-400 leading-relaxed">
              Notre équipe revient vers vous sous 48 heures. Échange
              confidentiel, sans engagement.
            </p>
          </div>
          <div className="lg:col-span-5 lg:justify-self-end">
            <Link
              to="/contact"
              className="btn bg-stone-50 text-zinc-950 hover:bg-stone-200 text-base px-7 py-4"
            >
              Démarrer la conversation
              <ArrowUpRight size={18} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default HomePage
