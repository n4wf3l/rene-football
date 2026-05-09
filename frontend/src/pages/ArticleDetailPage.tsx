import * as React from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ImageSquare,
  Star,
  Tag,
  X,
} from '@phosphor-icons/react'
import MeshGradient from '../components/MeshGradient'
import Skeleton from '../components/Skeleton'
import ClipsGalleryPublic from '../components/ClipsGalleryPublic'
import { api, ApiError } from '../api/client'
import type { Article, ArticleImage } from '../types/article'

interface ArticleResponse { data: Article }

const FR_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : FR_DATE.format(d)
}

/**
 * Render the article body as a sequence of paragraphs. We keep this lightweight
 * (split on blank lines) because the admin textarea uses plain text — anything
 * fancier than that should land via dedicated rich blocks later.
 */
function renderContent(content: string | null): React.ReactElement | null {
  if (!content) return null
  const blocks = content.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  if (blocks.length === 0) return null
  return (
    <div className="space-y-5 text-base lg:text-lg leading-[1.7] text-zinc-800 dark:text-stone-300">
      {blocks.map((b, i) => {
        const lines = b.split('\n')
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

interface GalleryProps {
  images: ArticleImage[]
}

/** Local lightbox for the photo gallery (separate from the clips lightbox). */
function Gallery({ images }: GalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const open = openIndex != null ? images[openIndex] : null

  useEffect(() => {
    if (openIndex == null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null)
      else if (e.key === 'ArrowRight') setOpenIndex((i) => (i == null ? null : (i + 1) % images.length))
      else if (e.key === 'ArrowLeft') setOpenIndex((i) => (i == null ? null : (i - 1 + images.length) % images.length))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openIndex, images.length])

  if (images.length === 0) return null

  return (
    <>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
        {images.map((img, i) => (
          <li key={img.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative block w-full aspect-[4/3] overflow-hidden rounded-2xl bg-stone-200 dark:bg-zinc-900 border border-stone-200/80 dark:border-stone-50/8 hover:border-zinc-400 dark:hover:border-stone-50/30 transition"
            >
              <img
                src={img.image_path}
                alt={img.caption ?? ''}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.04]"
              />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/80 to-transparent p-2">
                  <span className="text-[0.7rem] text-stone-50 line-clamp-1">{img.caption}</span>
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {open && (
          <motion.div
            key="gallery-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setOpenIndex(null)}
          >
            <button
              type="button"
              aria-label="Fermer"
              onClick={(e) => { e.stopPropagation(); setOpenIndex(null) }}
              className="absolute top-4 right-4 grid place-items-center w-10 h-10 rounded-full bg-stone-50/10 hover:bg-stone-50/20 text-stone-50 backdrop-blur transition"
            >
              <X size={18} weight="bold" />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Photo précédente"
                  onClick={(e) => { e.stopPropagation(); setOpenIndex((i) => (i == null ? null : (i - 1 + images.length) % images.length)) }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-stone-50/10 hover:bg-stone-50/20 text-stone-50 backdrop-blur transition"
                >
                  <CaretLeft size={18} weight="bold" />
                </button>
                <button
                  type="button"
                  aria-label="Photo suivante"
                  onClick={(e) => { e.stopPropagation(); setOpenIndex((i) => (i == null ? null : (i + 1) % images.length)) }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-stone-50/10 hover:bg-stone-50/20 text-stone-50 backdrop-blur transition"
                >
                  <CaretRight size={18} weight="bold" />
                </button>
              </>
            )}
            <motion.figure
              key={open.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl w-full"
            >
              <img
                src={open.image_path}
                alt={open.caption ?? ''}
                className="w-full max-h-[75dvh] object-contain rounded-xl bg-black"
              />
              {open.caption && (
                <figcaption className="mt-4 text-center text-stone-300 text-sm">
                  {open.caption}
                </figcaption>
              )}
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    api.get<ArticleResponse>(`/articles/${slug}`)
      .then((res) => { if (!cancelled) setArticle(res.data) })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setNotFound(true)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="bg-stone-50 dark:bg-zinc-950 min-h-[100dvh]">
        <div className="container-page pt-12 pb-16 space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="aspect-[16/9] w-full rounded-3xl" />
          <div className="space-y-3 max-w-3xl">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-display font-semibold text-3xl lg:text-5xl tracking-tight text-zinc-950 dark:text-stone-50">
          Article introuvable
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-stone-400">
          Cet article a peut-être été retiré ou son URL a changé.
        </p>
        <button
          type="button"
          onClick={() => navigate('/actualites')}
          className="btn btn-primary text-sm mt-8"
        >
          <ArrowLeft size={14} weight="bold" /> Retour aux actualités
        </button>
      </div>
    )
  }

  const cover = article.cover_url || `https://picsum.photos/seed/${article.slug}/1600/900`
  const images = article.images ?? []
  const clips = article.clips ?? []

  return (
    <>
      {/* Hero with cover */}
      <section className="relative overflow-hidden text-stone-100">
        <MeshGradient intensity="subtle" />
        <div className="container-page pt-10 lg:pt-14 pb-8">
          <Link
            to="/actualites"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.16em] text-stone-300 hover:text-stone-50 transition"
          >
            <ArrowLeft size={12} weight="bold" />
            Toutes les actualités
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-mono uppercase tracking-wider bg-turf-800/40 border border-turf-300/30 text-turf-200">
              <Tag size={10} weight="bold" />
              {article.category}
            </span>
            {article.featured && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-mono uppercase tracking-wider bg-amber-500/20 border border-amber-400/40 text-amber-200">
                <Star size={10} weight="fill" />
                À la une
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
              <CalendarBlank size={13} weight="regular" />
              <span className="font-mono">{formatDate(article.published_at)}</span>
            </span>
          </div>

          <h1 className="mt-5 font-display font-semibold text-4xl lg:text-6xl tracking-tightest leading-[1.05] text-stone-50 max-w-[24ch]">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-6 max-w-[65ch] text-base lg:text-lg text-stone-300 leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </div>

        {/* Cover image, full-bleed-ish inside the page container */}
        <div className="container-page pb-12 lg:pb-16">
          <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-stone-50/10 bg-zinc-900">
            <img
              src={cover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Body + sidebar (loop) */}
      <section className="bg-stone-50 dark:bg-zinc-950 transition-colors py-12 lg:py-16">
        <div className="container-page grid lg:grid-cols-12 gap-10 lg:gap-12">
          <article className="lg:col-span-8 min-w-0">
            {renderContent(article.content) ?? (
              <p className="text-zinc-500 dark:text-stone-500 italic">
                Aucun contenu textuel pour cet article.
              </p>
            )}
          </article>

          <aside className="lg:col-span-4 space-y-6">
            {article.player && (
              <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/8 bg-white dark:bg-zinc-900 p-5">
                <span className="font-mono uppercase tracking-[0.18em] text-[0.6rem] text-turf-700 dark:text-turf-300">
                  Loop sur un joueur
                </span>
                <Link
                  to={`/joueurs/${article.player.slug}`}
                  className="mt-4 group flex items-center gap-3"
                >
                  <img
                    src={article.player.photo_url || `https://picsum.photos/seed/${article.player.slug}/120`}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover border border-stone-200 dark:border-stone-50/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold text-zinc-950 dark:text-stone-50 truncate group-hover:text-turf-800 dark:group-hover:text-turf-300 transition">
                      {article.player.name}
                    </div>
                    {(article.player.position || article.player.club) && (
                      <div className="text-[0.65rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
                        {article.player.position}
                        {article.player.position && article.player.club ? ' · ' : ''}
                        {article.player.club ?? ''}
                      </div>
                    )}
                  </div>
                  <ArrowUpRight size={14} weight="bold" className="text-zinc-500 dark:text-stone-400 group-hover:text-turf-700 dark:group-hover:text-turf-300 transition" />
                </Link>
              </div>
            )}

            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-50/8 bg-white dark:bg-zinc-900 p-5">
              <span className="font-mono uppercase tracking-[0.18em] text-[0.6rem] text-zinc-500 dark:text-stone-500">
                En bref
              </span>
              <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-stone-300">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-stone-500">Catégorie</span>
                  <span className="font-medium">{article.category}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-stone-500">Publié le</span>
                  <span className="font-mono tabular-nums">{formatDate(article.published_at) || '—'}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-stone-500">Photos</span>
                  <span className="font-mono tabular-nums">{images.length}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-stone-500">Captures</span>
                  <span className="font-mono tabular-nums">{clips.length}</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Gallery */}
      {images.length > 0 && (
        <section className="bg-stone-50 dark:bg-zinc-950 transition-colors pb-12 lg:pb-16">
          <div className="container-page">
            <div className="flex items-center gap-3 mb-6">
              <ImageSquare size={16} weight="regular" className="text-turf-700 dark:text-turf-300" />
              <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-500">
                Galerie photos
              </span>
            </div>
            <Gallery images={images} />
          </div>
        </section>
      )}

      {/* Attached clips */}
      {clips.length > 0 && (
        <section className="bg-stone-100 dark:bg-zinc-900/40 transition-colors py-14 lg:py-20 border-y border-stone-200/80 dark:border-stone-50/8">
          <div className="container-page">
            <span className="eyebrow">Captures d'analyse</span>
            <h2 className="mt-2 font-display font-semibold text-2xl lg:text-3xl tracking-tight text-zinc-950 dark:text-stone-50 max-w-[24ch]">
              Les moments-clés annotés autour de l'article
            </h2>
            <p className="mt-3 max-w-[58ch] text-sm text-zinc-600 dark:text-stone-400">
              Captures issues de l'analyse vidéo de notre staff — flèches et zones tracées sur les images-clés.
            </p>
            <div className="mt-8">
              <ClipsGalleryPublic clips={clips} />
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="text-stone-100 py-16 lg:py-24 relative overflow-hidden">
        <MeshGradient intensity="subtle" />
        <div className="container-page grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <span className="eyebrow text-turf-300">Continuer</span>
            <h2 className="mt-3 font-display font-semibold text-3xl lg:text-5xl leading-tight tracking-tight">
              Plus d'actualités du roster.
            </h2>
            <p className="mt-4 max-w-[55ch] text-stone-400 leading-relaxed">
              Transferts, signatures, profils de joueurs — toutes nos publications.
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Link
              to="/actualites"
              className="btn bg-stone-50 text-zinc-950 hover:bg-stone-200 text-sm px-5 py-3"
            >
              Voir toutes les actualités
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
