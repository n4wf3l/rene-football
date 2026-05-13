import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../api/client'
import {
  EMPTY_PLAYER,
  PlayerEditor,
  type AdminPlayer,
  type PlayerFormState,
  type SaveKind,
} from './AdminPlayers'
import Skeleton from '../../components/Skeleton'

interface AdminPlayerResponse { data: AdminPlayer }

/**
 * Full-page editor wrapper. Uses the same <PlayerEditor> as the modal but
 * passes mode="page" so it renders inline rather than as a slide-from-right
 * panel. Supports both creation (`/admin/joueurs/nouveau`) and edition
 * (`/admin/joueurs/:slug/edit`) via the same component.
 */
export default function AdminPlayerEdit({ creating = false }: { creating?: boolean }) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<PlayerFormState | null>(null)
  const [loading, setLoading] = useState(!creating)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (creating) {
      setPlayer(EMPTY_PLAYER)
      setLoading(false)
      return
    }
    if (!slug) return
    let cancelled = false
    setLoading(true)
    api.get<AdminPlayerResponse>(`/admin/players/${slug}`, { auth: true })
      .then((res) => { if (!cancelled) setPlayer(res.data) })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setError('Joueur introuvable.')
        } else {
          setError('Erreur de chargement.')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug, creating])

  const onClose = () => navigate('/admin/joueurs')

  const onSaved = (saved: AdminPlayer, kind: SaveKind) => {
    navigate('/admin/joueurs', {
      state: {
        toast: kind === 'created'
          ? `« ${saved.name} » créé.`
          : `« ${saved.name} » mis à jour.`,
      },
    })
  }

  const onDelete = async (p: PlayerFormState) => {
    if (!p.slug || !confirm(`Supprimer ${p.name} ?`)) return
    try {
      await api.delete(`/admin/players/${p.slug}`, { auth: true })
      navigate('/admin/joueurs')
    } catch {
      setError('Suppression impossible.')
    }
  }

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-5xl w-full mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-2 gap-3 mt-8">
          {[0,1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="px-6 lg:px-10 py-12 max-w-3xl w-full mx-auto text-center">
        <h1 className="font-display font-semibold text-3xl text-zinc-950 dark:text-stone-50">
          {error ?? 'Joueur introuvable'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/admin/joueurs')}
          className="btn btn-primary text-sm mt-6"
        >
          Retour à la liste
        </button>
      </div>
    )
  }

  return (
    <PlayerEditor
      player={player}
      isNew={creating}
      mode="page"
      onClose={onClose}
      onSaved={onSaved}
      onDelete={onDelete}
    />
  )
}
