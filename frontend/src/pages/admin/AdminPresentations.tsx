import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle,
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
  classic:  'Carte d\'identité',
  magazine: 'Magazine',
  minimal:  'Minimal',
  stadium:  'Stadium',
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

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/10">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 dark:bg-zinc-950">
            <tr className="text-left text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-600 dark:text-stone-400">
              <th className="px-4 py-2.5">Présentation</th>
              <th className="px-4 py-2.5">Joueur</th>
              <th className="px-4 py-2.5">Template</th>
              <th className="px-4 py-2.5">Générée le</th>
              <th className="px-4 py-2.5 text-right">Statut</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-50/10">
            {loading && [0, 1, 2].map((i) => (
              <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td></tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-stone-500">
                  Aucune présentation. Cliquez sur « Nouvelle présentation » pour en générer une.
                </td>
              </tr>
            )}
            {!loading && rows.map((p) => (
              <tr key={p.id} className="hover:bg-stone-50 dark:hover:bg-stone-50/5 transition-colors">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/presentations/${p.id}/edit`)}
                    className="text-left font-medium text-zinc-950 dark:text-stone-50 hover:text-turf-700 dark:hover:text-turf-300 transition"
                  >
                    {p.title}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {p.player ? (
                    <span className="inline-flex items-center gap-2">
                      <img
                        src={p.player.photo_url || `https://picsum.photos/seed/${p.player.slug}/40`}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs text-zinc-700 dark:text-stone-300 truncate">{p.player.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-stone-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-700 dark:text-stone-300">
                  {TEMPLATE_LABEL[p.template_key] ?? p.template_key}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600 dark:text-stone-400 tabular-nums">
                  {fmtDate(p.generated_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.65rem] font-mono uppercase tracking-wider ${
                    p.is_published
                      ? 'bg-turf-100 text-turf-800 dark:bg-turf-300/15 dark:text-turf-300'
                      : 'bg-stone-200/80 text-zinc-700 dark:bg-stone-50/10 dark:text-stone-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.is_published ? 'bg-turf-700 dark:bg-turf-300' : 'bg-stone-400 dark:bg-stone-500'}`} />
                    {p.is_published ? 'Publique' : 'Privée'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    {p.file_path && (
                      <a
                        href={p.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
                        title="Télécharger le PDF"
                      >
                        <FilePdf size={14} weight="bold" />
                      </a>
                    )}
                    {p.is_published && p.public_token && (
                      <a
                        href={`/api/presentations/${p.public_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
                        title="Lien public"
                      >
                        <Eye size={14} weight="bold" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/presentations/${p.id}/edit`)}
                      className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
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
