import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CalendarBlank, Tag } from '@phosphor-icons/react'
import MeshGradient from '../components/MeshGradient'
import AnimatedUnderline from '../components/AnimatedUnderline'

type ArticleCategory = 'Mercato' | 'Talents' | 'Profils' | 'Coulisses' | 'Agence'
type CategoryFilter = 'Tous' | ArticleCategory

interface Article {
  id: string
  category: ArticleCategory
  title: string
  excerpt: string
  date: string
  seed: string
  playerSlug?: string
  featured?: boolean
}

const CATEGORIES: CategoryFilter[] = ['Tous', 'Mercato', 'Talents', 'Profils', 'Coulisses', 'Agence']

const ARTICLES: Article[] = [
  {
    id: 'toure-dortmund',
    category: 'Mercato',
    title: 'Karim Touré signe au Borussia Dortmund pour quatre saisons',
    excerpt:
      "Notre attaquant rejoint la Bundesliga pour franchir un nouveau palier européen. Une signature actée après six mois de discussions discrètes.",
    date: '2026-04-28',
    seed: 'karim-toure',
    playerSlug: 'karim-toure',
    featured: true,
  },
  {
    id: 'lefevre-genk',
    category: 'Talents',
    title: "Yanis Lefèvre rejoint le KRC Genk et signe son premier contrat pro",
    excerpt: "Le milieu défensif luxembourgeois de 19 ans s'engage avec le club belge pour trois saisons, projet de développement à la clé.",
    date: '2026-04-22',
    seed: 'yanis-lefevre',
    playerSlug: 'yanis-lefevre',
  },
  {
    id: 'boukar-metz',
    category: 'Mercato',
    title: 'Mehdi Boukar prêté au FC Metz pour la saison',
    excerpt: "Notre milieu offensif rejoint la Ligue 2 française avec une option d'achat — un pas idéal à 22 ans pour gagner du temps de jeu de haut niveau.",
    date: '2026-04-15',
    seed: 'mehdi-boukar',
    playerSlug: 'mehdi-boukar',
  },
  {
    id: 'ndiaye-profil',
    category: 'Profils',
    title: "Idriss N'Diaye, l'avant-centre qui ne lâche jamais une surface",
    excerpt: "Portrait du Sénégalais qui termine la saison avec 17 buts en 33 matchs — et un appétit intact.",
    date: '2026-04-09',
    seed: 'idriss-ndiaye',
    playerSlug: 'idriss-ndiaye',
  },
  {
    id: 'preparation-mentale',
    category: 'Coulisses',
    title: 'Comment nous travaillons la préparation mentale avec nos joueurs',
    excerpt: "Chaque profil sous mandat bénéficie d'un suivi spécifique — de la salle d'entraînement au plateau télé.",
    date: '2026-04-02',
    seed: 'rene-coulisses-mental',
  },
  {
    id: 'mercato-hivernal',
    category: 'Agence',
    title: 'Mercato hivernal : ce que nous retenons de cette fenêtre',
    excerpt: "Cinq mouvements, deux prolongations, un transfert avorté à la dernière heure. Bilan d'une fenêtre dense.",
    date: '2026-03-21',
    seed: 'rene-mercato-bilan',
  },
  {
    id: 'vasseur-capitaine',
    category: 'Profils',
    title: 'Théo Vasseur, brassard de capitaine au Gym à 26 ans',
    excerpt: "Le défenseur central niçois prend une dimension nouvelle dans le vestiaire rouge et noir.",
    date: '2026-03-12',
    seed: 'theo-vasseur',
    playerSlug: 'theo-vasseur',
  },
  {
    id: 'centres-formation',
    category: 'Agence',
    title: 'Centres de formation : notre méthode pour identifier les profils',
    excerpt: "Un réseau de scouts à travers l'Europe — Benelux, Bundesliga, Ligue 1, Eredivisie — avec des grilles d'évaluation calibrées.",
    date: '2026-02-28',
    seed: 'rene-centres-formation',
  },
]

const FADE_UP = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0 },
}

const FR_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
function formatDate(iso: string): string {
  return FR_DATE.format(new Date(iso))
}

interface CategoryBadgeProps {
  category: string
  tone?: 'dark' | 'light'
}

function CategoryBadge({ category, tone = 'dark' }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-mono uppercase tracking-wider ${
        tone === 'dark'
          ? 'bg-turf-800/40 border border-turf-300/30 text-turf-200'
          : 'bg-turf-50 border border-turf-100 text-turf-800'
      }`}
    >
      <Tag size={10} weight="bold" />
      {category}
    </span>
  )
}

interface ArticleCardWrapperProps {
  article: Article
  children: ReactNode
}

function ArticleCardWrapper({ article, children }: ArticleCardWrapperProps) {
  if (article.playerSlug) {
    return (
      <Link to={`/joueurs/${article.playerSlug}`} className="group block">
        {children}
      </Link>
    )
  }
  return <article className="group block">{children}</article>
}

interface HeroArticleProps {
  article: Article
}

function HeroArticle({ article }: HeroArticleProps) {
  return (
    <ArticleCardWrapper article={article}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 110, damping: 22 }}
        className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-center"
      >
        <div className="lg:col-span-7">
          <div className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-stone-200/80 dark:border-stone-50/10 bg-stone-200">
            <img
              src={`https://picsum.photos/seed/${article.seed}/1200/750`}
              alt=""
              loading="eager"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.03]"
            />
            <div className="absolute top-4 left-4">
              <CategoryBadge category={article.category} tone="dark" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-stone-400">
            <CalendarBlank size={13} weight="regular" />
            <span className="font-mono">{formatDate(article.date)}</span>
          </div>
          <h2 className="mt-4 font-display font-semibold text-3xl lg:text-5xl tracking-tight leading-[1.08] text-zinc-950 dark:text-stone-50 max-w-[18ch]">
            {article.title}
          </h2>
          <p className="mt-5 text-base lg:text-lg text-zinc-600 dark:text-stone-400 leading-relaxed max-w-[55ch]">
            {article.excerpt}
          </p>
          <div className="mt-7 inline-flex items-center gap-2 text-sm text-zinc-950 dark:text-stone-100 font-medium border-b border-zinc-950/30 dark:border-stone-50/30 pb-1 group-hover:border-turf-700 dark:group-hover:border-turf-300 transition">
            {article.playerSlug ? 'Voir le profil joueur' : 'Lire la suite'}
            <ArrowUpRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </motion.div>
    </ArticleCardWrapper>
  )
}

interface ArticleCardProps {
  article: Article
  span?: string
}

function ArticleCard({ article, span = '' }: ArticleCardProps) {
  return (
    <motion.li variants={FADE_UP} transition={{ type: 'spring', stiffness: 110, damping: 22 }} className={span}>
      <ArticleCardWrapper article={article}>
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-200">
          <img
            src={`https://picsum.photos/seed/${article.seed}/800/600`}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.04]"
          />
          <div className="absolute top-3 left-3">
            <CategoryBadge category={article.category} tone="dark" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-stone-400">
            <CalendarBlank size={12} weight="regular" />
            <span className="font-mono">{formatDate(article.date)}</span>
          </div>
          <h3 className="mt-2 font-display font-medium text-lg lg:text-xl tracking-tight leading-snug text-zinc-950 dark:text-stone-50 group-hover:text-turf-800 dark:group-hover:text-turf-300 transition-colors">
            {article.title}
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed line-clamp-2">
            {article.excerpt}
          </p>
        </div>
      </ArticleCardWrapper>
    </motion.li>
  )
}

function ActualitesPage() {
  const [category, setCategory] = useState<CategoryFilter>('Tous')

  const featured = ARTICLES.find((a) => a.featured)
  const rest = ARTICLES.filter((a) => !a.featured)

  const filtered = useMemo(() => {
    if (category === 'Tous') return rest
    return rest.filter((a) => a.category === category)
  }, [category, rest])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden text-stone-100">
        <MeshGradient intensity="medium" />
        <div className="container-page pt-16 pb-12 lg:pt-24 lg:pb-16">
          <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
            Actualités
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest leading-[1.05] text-stone-50 max-w-[20ch]">
            Transferts, signatures, profils.
          </h1>
          <p className="mt-6 max-w-[58ch] text-base lg:text-lg text-stone-400 leading-relaxed">
            Les nouvelles du roster, les coulisses de l'agence, et nos
            choix éditoriaux sur ce qui compte vraiment dans la vie d'une
            carrière professionnelle.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section className="sticky nav-sticky z-30 bg-stone-50/90 dark:bg-zinc-950/85 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-50/10">
        <div className="container-page py-4 flex items-center gap-2 overflow-x-auto">
          {CATEGORIES.map((c) => {
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`relative px-4 py-1.5 rounded-full text-sm transition-colors duration-200 ease-premium whitespace-nowrap ${
                  active
                    ? 'text-stone-50'
                    : 'text-zinc-700 dark:text-stone-300 hover:text-zinc-950 dark:hover:text-stone-50'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="actualites-pill"
                    className="absolute inset-0 rounded-full bg-zinc-950 dark:bg-turf-800"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{c}</span>
              </button>
            )
          })}
          <span className="ml-auto hidden md:inline-flex font-mono text-[0.65rem] uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-500">
            <span className="text-zinc-900 dark:text-stone-100 tabular-nums mr-2">{filtered.length + (category === 'Tous' && featured ? 1 : 0)}</span>
            articles
          </span>
        </div>
      </section>

      {/* Featured */}
      {featured && (category === 'Tous' || category === featured.category) && (
        <section className="bg-stone-50 dark:bg-zinc-950 pt-12 lg:pt-16 pb-8 lg:pb-10 transition-colors">
          <div className="container-page">
            <span className="eyebrow mb-6 inline-block">À la une</span>
            <HeroArticle article={featured} />
          </div>
        </section>
      )}

      {/* Grid */}
      <section className="bg-stone-50 dark:bg-zinc-950 pb-24 lg:pb-32 transition-colors">
        <div className="container-page">
          <div className="flex items-center justify-between mb-8">
            <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-500">
              {category === 'Tous' ? 'Tous les sujets' : `Catégorie : ${category}`}
            </span>
          </div>

          <motion.ul
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.li
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="col-span-full text-center py-20 text-zinc-500 dark:text-stone-400"
                >
                  Aucun article dans cette catégorie pour le moment.
                </motion.li>
              ) : (
                filtered.map((a, i) => (
                  <ArticleCard
                    key={a.id}
                    article={a}
                    span={i === 0 && filtered.length > 4 ? 'md:col-span-2 lg:col-span-2' : ''}
                  />
                ))
              )}
            </AnimatePresence>
          </motion.ul>
        </div>
      </section>

      {/* Newsletter / contact CTA */}
      <section className="text-stone-100 py-16 lg:py-24 relative overflow-hidden">
        <MeshGradient intensity="subtle" />
        <div className="container-page grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <span className="eyebrow text-turf-300">Restons en contact</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-tight tracking-tight">
              Vous suivez l'agence ? Échangeons.
            </h2>
            <p className="mt-4 max-w-[55ch] text-stone-400 leading-relaxed">
              Journaliste, recruteur, joueur intéressé : notre équipe
              répond personnellement à toute demande argumentée.
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Link
              to="/contact"
              className="btn bg-stone-50 text-zinc-950 hover:bg-stone-200 text-sm px-5 py-3"
            >
              Nous contacter
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default ActualitesPage
