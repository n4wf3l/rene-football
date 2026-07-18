import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  Copy,
  Eye,
  FilePdf,
  PencilSimpleLine,
  Plus,
  Trash,
  X as XIcon,
} from '@phosphor-icons/react'
import { api } from '../../api/client'
import type { Presentation } from '../../types/presentation'
import Skeleton from '../../components/Skeleton'

interface PresentationListResponse { data: Presentation[] }
interface ToastState { kind: 'success' | 'error'; message: string }

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

const TEMPLATE_LABEL: Record<string, string> = {
  classic:   'Carte d\'identité',
  signature: 'Signature',
  magazine:  'Magazine',
  minimal:   'Minimal',
  stadium:   'Stadium',
}

/** Accent tint per template so cards get a colored spine that matches the
 *  aesthetic of the PDF they'll produce. */
const TEMPLATE_ACCENT: Record<string, string> = {
  classic:   'from-turf-700/85 to-turf-800/85',
  signature: 'from-rose-600/85 to-zinc-950/85',
  magazine:  'from-red-500/85 to-zinc-950/85',
  minimal:   'from-stone-700/85 to-stone-900/85',
  stadium:   'from-blue-700/85 to-blue-950/85',
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminPresentations() {
  const navigate = useNavigate()
  const location = useLocation()
  const [rows, setRows] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)

  const reload = () => {
    setLoading(true)
    return api.get<PresentationListResponse>('/admin/presentations', { auth: true })
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const showToast = (kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast
    if (msg) {
      showToast('success', msg)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  /** Copy the public landing-page URL to the clipboard. Falls back to a
   *  textarea select-and-copy on environments without navigator.clipboard
   *  (older browsers, non-HTTPS local IP access). */
  const copyPublicLink = async (token: string) => {
    const url = `${window.location.origin}/p/${token}`
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      showToast('success', 'Lien public copié dans le presse-papiers.')
    } catch {
      showToast('error', "Impossible de copier le lien.")
    }
  }

  const onDelete = async (p: Presentation) => {
    if (!confirm(`Supprimer définitivement la présentation « ${p.title} » ?`)) return
    try {
      await api.delete(`/admin/presentations/${p.id}`, { auth: true })
      await reload()
      showToast('success', 'Présentation supprimée.')
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  return (
    <div className="px-6 lg:px-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">Outils</span>
          <h1 className="mt-2 font-display font-semibold text-3xl lg:text-4xl tracking-tight text-zinc-950 dark:text-stone-50">
            Présentations PDF
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-stone-400">
            Générez automatiquement des fiches PDF d'un joueur à destination d'un club, depuis un template.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/presentations/nouvelle')}
          className="btn btn-primary text-sm"
        >
          <Plus size={14} weight="bold" /> Nouvelle présentation
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/15 bg-white/60 dark:bg-zinc-900/40 py-16 text-center">
          <FilePdf size={32} weight="regular" className="mx-auto text-zinc-400 dark:text-stone-500 mb-3" />
          <p className="text-sm text-zinc-600 dark:text-stone-400">
            Aucune présentation. Cliquez sur « Nouvelle présentation » pour en générer une.
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {rows.map((p) => {
            const accent = TEMPLATE_ACCENT[p.template_key] ?? 'from-turf-700/85 to-turf-800/85'
            const photo = p.player?.photo_url || (p.player ? `https://picsum.photos/seed/${p.player.slug}/400` : null)
            return (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 overflow-hidden hover:shadow-diffusion hover:-translate-y-0.5 transition-all"
              >
                {/* Hero photo */}
                <button
                  type="button"
                  onClick={() => navigate(`/admin/presentations/${p.id}/edit`)}
                  className="block w-full text-left relative h-40 overflow-hidden"
                  aria-label={`Éditer ${p.title}`}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-b ${accent} opacity-70 mix-blend-multiply`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Top row: template + status pills */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6rem] font-mono uppercase tracking-[0.18em] bg-white/90 text-zinc-900 backdrop-blur">
                      {TEMPLATE_LABEL[p.template_key] ?? p.template_key}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.6rem] font-mono uppercase tracking-[0.14em] backdrop-blur ${
                      p.is_published
                        ? 'bg-turf-500/90 text-white'
                        : 'bg-black/40 text-white/90'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.is_published ? 'bg-white' : 'bg-white/70'}`} />
                      {p.is_published ? 'Publique' : 'Privée'}
                    </span>
                  </div>
                  {/* Bottom row: title */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="font-display font-bold text-white text-base leading-tight line-clamp-2 drop-shadow-md">
                      {p.title}
                    </h3>
                  </div>
                </button>

                {/* Meta + actions */}
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    {p.player?.photo_url && (
                      <img
                        src={p.player.photo_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-stone-200 dark:ring-stone-50/10"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-900 dark:text-stone-100 truncate">
                        {p.player?.name ?? '—'}
                      </div>
                      <div className="text-[0.65rem] text-zinc-500 dark:text-stone-500 tabular-nums">
                        {fmtDate(p.generated_at)}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 inline-flex items-center gap-0.5">
                    {p.file_path && (
                      <a
                        href={p.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
                        title="Télécharger le PDF"
                      >
                        <FilePdf size={14} weight="bold" />
                      </a>
                    )}
                    {p.is_published && p.public_token && (
                      <>
                        <button
                          type="button"
                          onClick={() => copyPublicLink(p.public_token!)}
                          className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-turf-100 hover:text-turf-800 dark:text-stone-400 dark:hover:bg-turf-300/15 dark:hover:text-turf-300 transition"
                          title="Copier le lien à envoyer au club"
                        >
                          <Copy size={14} weight="bold" />
                        </button>
                        <a
                          href={`/p/${p.public_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
                          title="Aperçu de ce que le club verra"
                        >
                          <Eye size={14} weight="bold" />
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/presentations/${p.id}/edit`)}
                      className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
                      title="Éditer"
                    >
                      <PencilSimpleLine size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p)}
                      className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-rose-100 hover:text-rose-700 dark:text-stone-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 transition"
                      title="Supprimer"
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      )}

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
