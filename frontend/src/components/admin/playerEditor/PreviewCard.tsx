import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowCounterClockwise, Camera, CheckCircle, Trash, UploadSimple } from '@phosphor-icons/react'
import { completenessTone, playerCompleteness } from '../../../lib/playerCompleteness'
import { isPlaceholderPhoto } from '../../../lib/playerImage'
import { useImageDrop } from './controls'
import { ageFromBirthDate, CATEGORY_LABELS, type PlayerFormState } from './model'

interface PreviewCardProps {
  form: PlayerFormState
  /** Main photo chosen but not saved yet (uploaded with the player). */
  photoPreview: string | null
  photoRemove: boolean
  onPhotoFile: (file: File) => void
  onPhotoRemove: () => void
  onPhotoRestore: () => void
  onGoTo: (field: string) => void
}

const RING_COLORS = { red: '#e11d48', orange: '#ea580c', green: '#059669' } as const

/** Completeness as a ring around the percentage. */
function CompletenessRing({ pct }: { pct: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const tone = completenessTone(pct)
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-stone-200 dark:stroke-stone-50/10" />
        <motion.circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          stroke={RING_COLORS[tone]}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-stone-50">{pct}%</span>
    </div>
  )
}

/**
 * Left column of the editor: the player as the site will show him, updated
 * while typing. The photo zone takes a dropped file; the completeness ring
 * lists what is missing and jumps to the field.
 */
export default function PreviewCard({ form, photoPreview, photoRemove, onPhotoFile, onPhotoRemove, onPhotoRestore, onGoTo }: PreviewCardProps) {
  const { pct, missing } = playerCompleteness(photoPreview ? { ...form, photo_url: 'pending' } : photoRemove ? { ...form, photo_url: null } : form)
  const [showAll, setShowAll] = useState(false)
  const { over, pick, handlers, input } = useImageDrop(onPhotoFile)

  const photo = photoPreview ?? (photoRemove ? null : (isPlaceholderPhoto(form.photo_url) ? null : form.photo_url))
  const age = ageFromBirthDate(form.date_of_birth) ?? form.age
  const shown = showAll ? missing : missing.slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Photo */}
      <div
        {...handlers}
        className={`group relative aspect-[16/10] overflow-hidden rounded-3xl border transition sm:aspect-[4/3] lg:aspect-[4/5] ${
          over ? 'border-turf-500 ring-4 ring-turf-500/20' : 'border-stone-200/80 dark:border-stone-50/10'
        } bg-gradient-to-b from-stone-100 to-stone-200 dark:from-zinc-900 dark:to-zinc-950`}
        data-field="photo_url"
      >
        {input}
        <AnimatePresence mode="wait">
          {photo ? (
            <motion.img
              key={photo}
              src={photo}
              alt=""
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ) : (
            <motion.button
              key="empty"
              type="button"
              onClick={pick}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 transition hover:text-turf-700 dark:text-stone-400 dark:hover:text-turf-300"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/80 shadow-sm dark:bg-zinc-800">
                <Camera size={26} weight="duotone" />
              </span>
              <span className="text-sm font-medium">Glisser la photo ici</span>
              <span className="text-xs text-zinc-400 dark:text-stone-500">ou cliquer · JPG, PNG, WebP · 4 Mo</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Name over the photo, like on the site */}
        {photo && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/40 to-transparent p-5 pt-16">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-200">
              {CATEGORY_LABELS[form.category ?? ''] ?? form.category}
            </div>
            <div className="mt-1 font-display text-xl font-semibold leading-tight text-white">{form.name || 'Nouveau joueur'}</div>
          </div>
        )}

        {/* Photo actions */}
        {photo && (
          <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button type="button" onClick={pick} title="Remplacer la photo" aria-label="Remplacer la photo"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-zinc-900 shadow hover:bg-white">
              <UploadSimple size={15} weight="bold" />
            </button>
            <button type="button" onClick={onPhotoRemove} title="Retirer la photo" aria-label="Retirer la photo"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-rose-600 shadow hover:bg-white">
              <Trash size={15} weight="bold" />
            </button>
          </div>
        )}
        {over && <div className="absolute inset-0 grid place-items-center bg-turf-600/20 text-sm font-semibold text-white backdrop-blur-[1px]">Déposer pour remplacer</div>}
      </div>

      {photoRemove && !photoPreview && (
        <button type="button" onClick={onPhotoRestore} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100">
          <ArrowCounterClockwise size={12} /> Garder la photo actuelle
        </button>
      )}

      {/* Identity summary */}
      <div className="hidden rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-50/[0.07] dark:bg-zinc-900/60 lg:block">
        {!photo && <div className="font-display text-lg font-semibold text-zinc-950 dark:text-stone-50">{form.name || 'Nouveau joueur'}</div>}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="col-span-2">
            <dt className="text-[0.7rem] uppercase tracking-[0.1em] text-zinc-400 dark:text-stone-500">Poste</dt>
            <dd className="mt-0.5 font-medium text-zinc-900 dark:text-stone-100">{form.position || '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[0.7rem] uppercase tracking-[0.1em] text-zinc-400 dark:text-stone-500">Club</dt>
            <dd className="mt-0.5 flex items-center gap-2 font-medium text-zinc-900 dark:text-stone-100">
              {form.club_logo_url && <img src={form.club_logo_url} alt="" className="h-5 w-5 object-contain" />}
              {form.club || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[0.7rem] uppercase tracking-[0.1em] text-zinc-400 dark:text-stone-500">Âge</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-zinc-900 dark:text-stone-100">{age ? `${age} ans` : '—'}</dd>
          </div>
          <div>
            <dt className="text-[0.7rem] uppercase tracking-[0.1em] text-zinc-400 dark:text-stone-500">Nationalité</dt>
            <dd className="mt-0.5 truncate font-medium text-zinc-900 dark:text-stone-100">{form.nationality || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Completeness */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-50/[0.07] dark:bg-zinc-900/60">
        <div className="flex items-center gap-4">
          <CompletenessRing pct={pct} />
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-stone-100">Profil complété</div>
            <div className="text-xs text-zinc-500 dark:text-stone-400">
              {missing.length === 0 ? 'Rien à ajouter.' : `${missing.length} élément${missing.length > 1 ? 's' : ''} à compléter`}
            </div>
          </div>
        </div>
        {missing.length > 0 ? (
          <ul className="mt-4 space-y-1">
            {shown.map((item) => (
              <li key={item.field}>
                <button
                  type="button"
                  onClick={() => onGoTo(item.field)}
                  className="group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm text-zinc-700 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/5"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                    {item.label}
                  </span>
                  <span className="font-mono text-[0.7rem] text-zinc-400 group-hover:text-turf-700 dark:text-stone-500 dark:group-hover:text-turf-300">+{item.weight}</span>
                </button>
              </li>
            ))}
            {missing.length > 5 && (
              <li>
                <button type="button" onClick={() => setShowAll((v) => !v)} className="px-2.5 py-1 text-xs font-medium text-turf-700 hover:underline dark:text-turf-300">
                  {showAll ? 'Voir moins' : `Voir les ${missing.length - 5} autres`}
                </button>
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle size={16} weight="fill" /> Profil complet
          </p>
        )}
      </div>
    </div>
  )
}
