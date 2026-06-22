import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  ImageSquare,
  MagnifyingGlass,
  PencilSimpleLine,
  Plus,
  SoccerBall,
  Star,
  Trash,
  X as XIcon,
} from '@phosphor-icons/react'
import { api } from '../../api/client'
import type { Article, ArticleCategory } from '../../types/article'
import { ARTICLE_CATEGORIES } from '../../types/article'
import Skeleton from '../../components/Skeleton'
import { playerImage } from '../../lib/playerImage'

interface ArticleListResponse {
  data: Article[]
}

interface ToastState {
  kind: 'success' | 'error'
  message: string
}

function Toast({ kind, message, onDismiss }: ToastState & { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-diffusion text-sm ${
        kind === 'success' ? 'bg-turf-800 text-stone-50' : 'bg-red-600 text-white'
      }`}
      role="status"
    >
      <CheckCircle size={16} weight="bold" />
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
        <XIcon size={14} weight="bold" />
      </button>
    </motion.div>
  )
}

function fmtDate(value: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return value
  }
}

type StatusFilter = 'Tous' | 'online' | 'offline'

export default function AdminArticles() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ArticleCategory | 'Tous'>('Tous')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Tous')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null)

  const reload = () => {
    setLoading(true)
    return api.get<ArticleListResponse>('/admin/articles', { auth: true })
      .then((res) => setArticles(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const showToast = (kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3500)
  }

  // Pick up a toast handed off by the editor via navigation state, then clear
  // it from history so a refresh doesn't re-show the same message.
  const location = useLocation()
  useEffect(() => {
    const toastMsg = (location.state as { toast?: string } | null)?.toast
    if (toastMsg) {
      showToast('success', toastMsg)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return articles.filter((a) => {
      if (categoryFilter !== 'Tous' && a.category !== categoryFilter) return false
      if (statusFilter === 'online' && !a.is_published) return false
      if (statusFilter === 'offline' && a.is_published) return false
      if (q) {
        const hay = `${a.title} ${a.excerpt ?? ''} ${a.player?.name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [articles, query, categoryFilter, statusFilter])

  const onDelete = async (article: Article) => {
    if (!confirm(`Supprimer définitivement l'article « ${article.title} » ?`)) return
    try {
      await api.delete(`/admin/articles/${article.slug}`, { auth: true })
      await reload()
      showToast('success', 'Article supprimé.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Suppression impossible.'
      showToast('error', message)
    }
  }

  const togglePublished = async (article: Article) => {
    if (togglingSlug) return
    const next = !article.is_published
    const previous = articles
    setTogglingSlug(article.slug)
    setArticles((prev) => prev.map((a) => (a.slug === article.slug ? { ...a, is_published: next } : a)))
    try {
      const fd = new FormData()
      fd.append('_method', 'PUT')
      fd.append('title', article.title)
      fd.append('category', article.category)
      fd.append('is_published', next ? '1' : '0')
      await api.post(`/admin/articles/${article.slug}`, fd, { auth: true })
      showToast('success', next ? 'Article publié.' : 'Article masqué.')
    } catch (err: unknown) {
      setArticles(previous)
      const message = err instanceof Error ? err.message : 'Modification impossible.'
      showToast('error', message)
    } finally {
      setTogglingSlug(null)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">CMS</span>
          <h1 className="mt-2 font-display font-semibold text-3xl lg:text-4xl tracking-tight text-zinc-950 dark:text-stone-50">
            Actualités
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-stone-400">
            Publiez des articles, faites un loop sur un joueur, attachez des captures d'annotations et une galerie photo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/articles/nouveau')}
          className="btn btn-primary text-sm"
        >
          <Plus size={14} weight="bold" /> Nouvel article
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <MagnifyingGlass size={14} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article"
            className="pl-9 pr-3 py-2 rounded-full border border-stone-300 bg-white text-sm w-64 focus:outline-none focus:border-zinc-900 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ArticleCategory | 'Tous')}
          className="rounded-full border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-stone-300 focus:outline-none focus:border-zinc-900 dark:focus:border-turf-300"
        >
          <option value="Tous">Toutes catégories</option>
          {ARTICLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-full border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-stone-300 focus:outline-none focus:border-zinc-900 dark:focus:border-turf-300"
        >
          <option value="Tous">Tous statuts</option>
          <option value="online">En ligne</option>
          <option value="offline">Hors ligne</option>
        </select>

        <span className="ml-auto text-xs text-zinc-500 dark:text-stone-400 font-mono tabular-nums">
          {filtered.length} / {articles.length} articles
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/10">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 dark:bg-zinc-950">
            <tr className="text-left text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-600 dark:text-stone-400">
              <th className="px-4 py-2.5">Article</th>
              <th className="px-4 py-2.5">Catégorie</th>
              <th className="px-4 py-2.5">Loop joueur</th>
              <th className="px-4 py-2.5 text-right">Médias</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5 text-right">Statut</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-50/10">
            {loading && (
              [0, 1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td>
                </tr>
              ))
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-stone-500">
                  Aucun article.
                </td>
              </tr>
            )}
            {!loading && filtered.map((a) => (
              <tr key={a.slug} className="hover:bg-stone-50 dark:hover:bg-stone-50/5 transition-colors">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/articles/${a.slug}/edit`)}
                    className="flex items-start gap-3 text-left max-w-md"
                  >
                    <div className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-50/5">
                      {a.cover_url ? (
                        <img src={a.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-zinc-400 dark:text-stone-500">
                          <ImageSquare size={18} weight="regular" />
                        </div>
                      )}
                    </div>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        {a.featured && (
                          <Star size={12} weight="fill" className="text-amber-500 shrink-0" aria-label="À la une" />
                        )}
                        <span className="font-medium text-zinc-950 dark:text-stone-50 truncate">{a.title}</span>
                      </span>
                      {a.excerpt && (
                        <span className="block text-xs text-zinc-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                          {a.excerpt}
                        </span>
                      )}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[0.65rem] font-mono uppercase tracking-wider bg-stone-200/70 text-zinc-700 dark:bg-stone-50/10 dark:text-stone-300">
                    {a.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.player ? (
                    <span className="inline-flex items-center gap-2">
                      <img
                        src={playerImage(a.player)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs text-zinc-700 dark:text-stone-300 truncate">{a.player.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-stone-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-3 text-[0.7rem] font-mono text-zinc-600 dark:text-stone-400 tabular-nums">
                    <span title="Photos en galerie" className="inline-flex items-center gap-1">
                      <ImageSquare size={11} weight="regular" />
                      {a.images?.length ?? 0}
                    </span>
                    <span title="Captures attachées" className="inline-flex items-center gap-1">
                      <SoccerBall size={11} weight="regular" />
                      {a.clips?.length ?? 0}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600 dark:text-stone-400 tabular-nums">
                  {fmtDate(a.published_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => togglePublished(a)}
                    disabled={togglingSlug === a.slug}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.65rem] font-mono uppercase tracking-wider transition ${
                      a.is_published
                        ? 'bg-turf-100 text-turf-800 hover:bg-turf-200 dark:bg-turf-300/15 dark:text-turf-300 dark:hover:bg-turf-300/25'
                        : 'bg-stone-200/80 text-zinc-700 hover:bg-stone-300/80 dark:bg-stone-50/10 dark:text-stone-300 dark:hover:bg-stone-50/15'
                    } ${togglingSlug === a.slug ? 'opacity-60 cursor-not-allowed' : ''}`}
                    title={a.is_published ? 'Cliquer pour masquer' : 'Cliquer pour publier'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${a.is_published ? 'bg-turf-700 dark:bg-turf-300' : 'bg-stone-400 dark:bg-stone-500'}`} />
                    {a.is_published ? 'En ligne' : 'Hors ligne'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/articles/${a.slug}/edit`)}
                      className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
                      aria-label="Éditer"
                      title="Éditer"
                    >
                      <PencilSimpleLine size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(a)}
                      className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-rose-100 hover:text-rose-700 dark:text-stone-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 transition"
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
