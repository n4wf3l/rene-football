import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FilmSlate, Plus, Trash, X } from '@phosphor-icons/react'
import { api, ApiError } from '../api/client'
import type { ClipAnnotation, PlayerClip } from '../types/clip'
import ClipAnnotator from './ClipAnnotator'

export interface ClipsGalleryAdminProps {
  /** Slug of the player whose clips we manage. When empty (new player not saved yet),
     the gallery shows a placeholder asking to save first. */
  playerSlug: string | null
}

interface ClipsResponse { data: PlayerClip[] }
interface SingleClipResponse { data: PlayerClip }

const FR_DURATION = (sec: number | null): string => {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ClipsGalleryAdmin({ playerSlug }: ClipsGalleryAdminProps) {
  const [clips, setClips] = useState<PlayerClip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [annotating, setAnnotating] = useState(false)

  useEffect(() => {
    if (!playerSlug) return
    let cancelled = false
    setLoading(true)
    api.get<ClipsResponse>(`/admin/players/${playerSlug}/clips`, { auth: true })
      .then((res) => { if (!cancelled) setClips(res.data) })
      .catch(() => { if (!cancelled) setClips([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [playerSlug])

  if (!playerSlug) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/10 bg-white/40 dark:bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-600 dark:text-stone-400">
        Enregistrez d'abord la fiche du joueur pour pouvoir y ajouter des moments clés.
      </div>
    )
  }

  const onSave = async (payload: {
    blob: Blob
    title: string
    timestamp: number
    width: number
    height: number
    annotations: ClipAnnotation[]
    videoSourceLabel: string
    notes: string
  }) => {
    setError(null)
    const fd = new FormData()
    fd.append('image', payload.blob, 'clip.png')
    fd.append('title', payload.title)
    fd.append('timestamp_seconds', String(payload.timestamp))
    fd.append('width', String(payload.width))
    fd.append('height', String(payload.height))
    fd.append('video_source_label', payload.videoSourceLabel)
    fd.append('notes', payload.notes)
    fd.append('annotations_json', JSON.stringify(payload.annotations))
    try {
      const res = await api.post<SingleClipResponse>(
        `/admin/players/${playerSlug}/clips`,
        fd,
        { auth: true },
      )
      setClips((prev) => [res.data, ...prev])
      setAnnotating(false)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e instanceof Error ? e.message : 'Échec de l\'enregistrement.')
      setError(msg)
      throw e // ClipAnnotator catches it to surface a per-form error
    }
  }

  const onDelete = async (id: number) => {
    if (!confirm('Supprimer ce moment ? L\'image sera effacée du serveur.')) return
    try {
      await api.delete(`/admin/players/${playerSlug}/clips/${id}`, { auth: true })
      setClips((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + add button */}
      <div className="flex items-center justify-between">
        <div className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
          {clips.length} {clips.length > 1 ? 'moments' : 'moment'} · vidéos jamais stockées
        </div>
        {!annotating && (
          <button
            type="button"
            onClick={() => setAnnotating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-950 text-stone-50 hover:bg-zinc-800 dark:bg-stone-50 dark:text-zinc-950 dark:hover:bg-stone-200 transition"
          >
            <Plus size={12} weight="bold" />
            Nouveau moment
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 dark:bg-rose-500/10 dark:border-rose-500/30 px-3 py-2 text-xs text-rose-800 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Annotator panel */}
      <AnimatePresence>
        {annotating && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 p-5"
          >
            <ClipAnnotator
              onSave={onSave}
              onCancel={() => setAnnotating(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing clips */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-video rounded-xl bg-stone-200 dark:bg-stone-50/8 animate-pulse" />
          ))}
        </div>
      ) : clips.length === 0 && !annotating ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/10 bg-white/40 dark:bg-zinc-900/30 px-6 py-10 text-center">
          <FilmSlate size={28} weight="duotone" className="mx-auto text-zinc-400 dark:text-stone-500" />
          <p className="mt-3 text-sm text-zinc-600 dark:text-stone-400">
            Aucun moment annoté pour ce joueur.
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-stone-500">
            Importe une vidéo, mets-la en pause sur un instant clé, dessine, sauvegarde.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clips.map((clip) => (
            <li key={clip.id} className="group relative rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-950 border border-stone-200 dark:border-stone-50/8">
              <div className="relative aspect-video bg-black">
                <img
                  src={clip.image_path}
                  alt={clip.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onDelete(clip.id)}
                  aria-label="Supprimer ce moment"
                  className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full bg-zinc-950/70 hover:bg-rose-700 text-stone-100 backdrop-blur opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash size={12} weight="bold" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-display font-medium text-sm text-zinc-950 dark:text-stone-50 truncate">
                    {clip.title}
                  </h4>
                  <span className="font-mono text-[0.65rem] tabular-nums text-zinc-500 dark:text-stone-500 shrink-0">
                    {FR_DURATION(clip.timestamp_seconds)}
                  </span>
                </div>
                {clip.video_source_label && (
                  <div className="text-[0.7rem] text-zinc-500 dark:text-stone-500 truncate">
                    {clip.video_source_label}
                  </div>
                )}
                {clip.notes && (
                  <p className="text-xs text-zinc-600 dark:text-stone-400 line-clamp-2">{clip.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
