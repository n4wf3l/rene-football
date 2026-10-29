import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api/client'
import type { Article } from '../../types/article'

interface ArticlesResponse { data: Article[] }

const EASE_OUT = [0.16, 1, 0.3, 1] as const
/** Lead story + up to three follow-ups. */
const MAX_ARTICLES = 4

/**
 * Latest news on the home page: the agency's proof (signings, partnerships)
 * rather than a second list of the players the hero already shows. Order
 * comes from the API (featured first, then most recent). Hidden when no
 * article is published.
 */
function HomeNews() {
  const { t, i18n } = useTranslation()
  const reduce = useReducedMotion()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.get<ArticlesResponse>('/articles')
      .then((res) => { if (!cancelled) setArticles((res.data ?? []).slice(0, MAX_ARTICLES)) })
      .catch(() => { if (!cancelled) setArticles([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (!loading && articles.length === 0) return null

  const date = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return isNaN(d.getTime())
      ? ''
      : new Intl.DateTimeFormat(i18n.resolvedLanguage, { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  }
  const category = (c: string) => t(`news.categories.${c}`, { defaultValue: c })

  const [lead, ...others] = articles

  return (
    <section className="bg-stone-50 py-20 dark:bg-zinc-950 lg:py-32">
      <div className="container-page">
        <div className="mb-12 grid gap-6 lg:mb-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <span className="eyebrow">{t('home.news.eyebrow')}</span>
            <h2 className="mt-4 max-w-[18ch] font-display text-4xl font-semibold leading-[0.98] tracking-tightest text-zinc-950 dark:text-stone-50 lg:text-6xl">
              {t('home.news.title')}
            </h2>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Link
              to="/actualites"
              className="inline-flex items-center gap-2 border-b border-zinc-950/30 pb-1 font-medium text-zinc-950 transition hover:border-zinc-950 dark:border-stone-50/30 dark:text-stone-50 dark:hover:border-stone-50"
            >
              {t('home.news.viewAll')}
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="aspect-[16/10] animate-pulse bg-stone-200 dark:bg-zinc-800 lg:col-span-7" />
            <div className="space-y-6 lg:col-span-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse bg-stone-200 dark:bg-zinc-800" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Lead story */}
            <motion.article
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
              className={others.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}
            >
              <Link to={`/actualites/${lead.slug}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-200 dark:bg-zinc-800">
                  {lead.cover_url && (
                    <img
                      src={lead.cover_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.03]"
                    />
                  )}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.68rem] uppercase tracking-[0.22em]">
                  <span className="text-turf-700 dark:text-turf-300">{category(lead.category)}</span>
                  <span className="text-zinc-500 dark:text-stone-500">{date(lead.published_at)}</span>
                </div>
                <h3 className="mt-3 max-w-[26ch] font-display text-2xl font-semibold leading-tight tracking-tight text-zinc-950 transition-colors group-hover:text-turf-700 dark:text-stone-50 dark:group-hover:text-turf-300 lg:text-4xl">
                  {lead.title}
                </h3>
                {lead.excerpt && (
                  <p className="mt-4 max-w-[60ch] leading-relaxed text-zinc-600 dark:text-stone-400">{lead.excerpt}</p>
                )}
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-950 dark:text-stone-50">
                  {t('home.news.readArticle')}
                  <ArrowUpRight size={14} weight="bold" className="transition-transform duration-300 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.article>

            {/* Follow-ups */}
            {others.length > 0 && (
              <ol className="border-t border-stone-300/70 dark:border-stone-50/10 lg:col-span-5">
                {others.map((a, i) => (
                  <motion.li
                    key={a.slug}
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 + i * 0.08 }}
                    className="border-b border-stone-300/70 dark:border-stone-50/10"
                  >
                    <Link to={`/actualites/${a.slug}`} className="group grid grid-cols-[1fr_auto] items-start gap-5 py-6">
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-3 font-mono text-[0.65rem] uppercase tracking-[0.22em]">
                          <span className="text-turf-700 dark:text-turf-300">{category(a.category)}</span>
                          <span className="text-zinc-500 dark:text-stone-500">{date(a.published_at)}</span>
                        </span>
                        <span className="mt-2 block font-display text-lg font-semibold leading-snug tracking-tight text-zinc-950 transition-colors group-hover:text-turf-700 dark:text-stone-50 dark:group-hover:text-turf-300 lg:text-xl">
                          {a.title}
                        </span>
                      </span>
                      {a.cover_url && (
                        <img
                          src={a.cover_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-20 w-28 bg-stone-200 object-cover dark:bg-zinc-800"
                        />
                      )}
                    </Link>
                  </motion.li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default HomeNews
