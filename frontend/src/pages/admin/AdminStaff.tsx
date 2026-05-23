import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  PencilSimpleLine,
  Person,
  Plus,
  Trash,
  X as XIcon,
} from '@phosphor-icons/react'
import { api } from '../../api/client'
import type { StaffMember } from '../../types/staff'
import Skeleton from '../../components/Skeleton'

interface StaffListResponse { data: StaffMember[] }
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

export default function AdminStaff() {
  const navigate = useNavigate()
  const location = useLocation()
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [busy, setBusy] = useState<number | null>(null)

  const reload = () => {
    setLoading(true)
    return api.get<StaffListResponse>('/admin/staff', { auth: true })
      .then((res) => setMembers(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const showToast = (kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3500)
  }

  // Pick up a toast handed off by the editor via navigation state.
  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast
    if (msg) {
      showToast('success', msg)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const onDelete = async (m: StaffMember) => {
    if (!confirm(`Supprimer définitivement « ${m.name} » ?`)) return
    try {
      await api.delete(`/admin/staff/${m.slug}`, { auth: true })
      await reload()
      showToast('success', 'Membre supprimé.')
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  const togglePublished = async (m: StaffMember) => {
    if (busy != null) return
    const next = !m.is_published
    const previous = members
    setBusy(m.id)
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_published: next } : x)))
    try {
      const fd = new FormData()
      fd.append('_method', 'PUT')
      fd.append('name', m.name)
      fd.append('role', m.role)
      fd.append('is_published', next ? '1' : '0')
      await api.post(`/admin/staff/${m.slug}`, fd, { auth: true })
      showToast('success', next ? 'Membre publié.' : 'Membre masqué.')
    } catch (err: unknown) {
      setMembers(previous)
      showToast('error', err instanceof Error ? err.message : 'Modification impossible.')
    } finally {
      setBusy(null)
    }
  }

  // Move up/down: swap sort_order with the neighbour, persist, then reload.
  const move = async (index: number, direction: -1 | 1) => {
    if (busy != null) return
    const target = members[index + direction]
    const self = members[index]
    if (!target || !self) return
    setBusy(self.id)
    const items = members.slice()
    items[index] = target
    items[index + direction] = self
    setMembers(items.map((m, i) => ({ ...m, sort_order: i })))
    try {
      await api.post(
        '/admin/staff/reorder',
        { items: items.map((m, i) => ({ id: m.id, sort_order: i })) },
        { auth: true },
      )
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Réordonnancement impossible.')
      await reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">À propos</span>
          <h1 className="mt-2 font-display font-semibold text-3xl lg:text-4xl tracking-tight text-zinc-950 dark:text-stone-50">
            L'équipe
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-stone-400">
            Les membres affichés sur la page publique « À propos ». L'ordre détermine l'affichage.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/equipe/nouveau')}
          className="btn btn-primary text-sm"
        >
          <Plus size={14} weight="bold" /> Nouveau membre
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/8">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 dark:bg-zinc-950">
            <tr className="text-left text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-600 dark:text-stone-400">
              <th className="px-4 py-2.5 w-16">Ordre</th>
              <th className="px-4 py-2.5">Membre</th>
              <th className="px-4 py-2.5">Rôle</th>
              <th className="px-4 py-2.5 text-right">Statut</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-50/8">
            {loading && [0, 1, 2, 3].map((i) => (
              <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td></tr>
            ))}
            {!loading && members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-stone-500">
                  Aucun membre. Ajoutez-en un pour qu'il apparaisse sur la page « À propos ».
                </td>
              </tr>
            )}
            {!loading && members.map((m, i) => (
              <tr key={m.id} className="hover:bg-stone-50 dark:hover:bg-stone-50/3 transition-colors">
                <td className="px-4 py-3">
                  <div className="inline-flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || busy != null}
                      className="grid place-items-center w-7 h-7 rounded-md text-zinc-500 hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      aria-label="Monter"
                    >
                      <ArrowUp size={12} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === members.length - 1 || busy != null}
                      className="grid place-items-center w-7 h-7 rounded-md text-zinc-500 hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      aria-label="Descendre"
                    >
                      <ArrowDown size={12} weight="bold" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/equipe/${m.slug}/edit`)}
                    className="flex items-center gap-3 text-left"
                  >
                    <div className="relative shrink-0 w-10 h-10 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-50/5">
                      {m.photo_url ? (
                        <img src={m.photo_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-zinc-400 dark:text-stone-500">
                          <Person size={16} weight="regular" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-zinc-950 dark:text-stone-50">{m.name}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600 dark:text-stone-400">
                  {m.role}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => togglePublished(m)}
                    disabled={busy === m.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.65rem] font-mono uppercase tracking-wider transition ${
                      m.is_published
                        ? 'bg-turf-100 text-turf-800 hover:bg-turf-200 dark:bg-turf-300/15 dark:text-turf-300 dark:hover:bg-turf-300/25'
                        : 'bg-stone-200/80 text-zinc-700 hover:bg-stone-300/80 dark:bg-stone-50/8 dark:text-stone-300 dark:hover:bg-stone-50/15'
                    } ${busy === m.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                    title={m.is_published ? 'Cliquer pour masquer' : 'Cliquer pour publier'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${m.is_published ? 'bg-turf-700 dark:bg-turf-300' : 'bg-stone-400 dark:bg-stone-500'}`} />
                    {m.is_published ? 'En ligne' : 'Hors ligne'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/equipe/${m.slug}/edit`)}
                      className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 transition"
                      aria-label="Éditer"
                      title="Éditer"
                    >
                      <PencilSimpleLine size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(m)}
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
