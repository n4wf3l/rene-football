import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, X as XIcon } from '@phosphor-icons/react'
import { scoutingApi } from '../../lib/scoutingApi'
import type { ScoutingValidator } from '../../types/scouting'

/* Action types this modal supports - each maps to a different controller route + UI tone. */
export type ReportAction = 'submit' | 'validate' | 'request_changes'

export interface ReportActionResult {
  /** Picked recipient (submit / request_changes). Null for validate. */
  recipientId?: number | null
  /** Free-form note attached to the transition. */
  comment?: string
}

interface Props {
  action: ReportAction
  /** Default selected recipient - usually the auto-routed validator. */
  defaultRecipientId?: number | null
  /** Show the recipient picker. Disable for `validate` (no recipient). */
  showRecipientPicker?: boolean
  busy?: boolean
  onClose: () => void
  onConfirm: (result: ReportActionResult) => void
}

const COPY: Record<ReportAction, { title: string; eyebrow: string; cta: string; tone: string }> = {
  submit: {
    title:   'Soumettre pour validation',
    eyebrow: 'Soumission',
    cta:     'Soumettre',
    tone:    'bg-turf-700 hover:bg-turf-600 text-stone-50',
  },
  validate: {
    title:   'Valider le rapport',
    eyebrow: 'Validation',
    cta:     'Valider',
    tone:    'bg-turf-700 hover:bg-turf-600 text-stone-50',
  },
  request_changes: {
    title:   'Demander des corrections',
    eyebrow: 'Renvoi pour corrections',
    cta:     'Renvoyer au scout',
    tone:    'bg-amber-600 hover:bg-amber-500 text-stone-50',
  },
}

function ReportActionModal({ action, defaultRecipientId, showRecipientPicker = true, busy, onClose, onConfirm }: Props) {
  const [validators, setValidators] = useState<ScoutingValidator[]>([])
  const [recipientId, setRecipientId] = useState<number | null>(defaultRecipientId ?? null)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!showRecipientPicker) return
    scoutingApi.inbox().then((d) => setValidators(d.validators ?? [])).catch(() => {})
  }, [showRecipientPicker])

  // Lock body scroll while the modal is open - small UX detail but it prevents
  // a long drawer behind from scrolling under the dialog.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const copy = COPY[action]
  const submit = () => onConfirm({
    recipientId: showRecipientPicker ? recipientId : null,
    comment: comment.trim() || undefined,
  })

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={busy ? undefined : onClose}
        className="fixed inset-0 z-[60] bg-zinc-950/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed inset-x-0 top-[10vh] z-[70] mx-auto w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 shadow-2xl overflow-hidden"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-stone-200 dark:border-stone-50/10">
          <div>
            <div className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-turf-700 dark:text-turf-300">
              {copy.eyebrow}
            </div>
            <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">{copy.title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid place-items-center w-8 h-8 rounded-md text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition disabled:opacity-50"
            aria-label="Fermer"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-4">
          {showRecipientPicker && (
            <label className="block">
              <span className="block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-zinc-500 dark:text-stone-400 mb-1.5">
                {action === 'request_changes' ? 'Renvoyer à' : 'Soumettre à'}
              </span>
              <select
                value={recipientId ?? ''}
                onChange={(e) => setRecipientId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 dark:focus:border-turf-300 transition"
                disabled={busy}
              >
                {validators.length === 0 && <option value="">Chargement…</option>}
                {validators.map((v) => {
                  const scope = v.scouting_scope && v.scouting_scope.length > 0 ? v.scouting_scope.join(' · ') : 'tous périmètres'
                  const role = v.is_head_of_scouting ? 'Chef scouting' : v.is_admin ? 'Admin' : ''
                  return (
                    <option key={v.id} value={v.id}>
                      {v.name} - {role} ({scope})
                    </option>
                  )
                })}
              </select>
              <p className="mt-1.5 text-[0.7rem] text-zinc-500 dark:text-stone-400">
                Pré-sélectionné par l'auto-routing selon la catégorie du joueur.
              </p>
            </label>
          )}

          <label className="block">
            <span className="block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-zinc-500 dark:text-stone-400 mb-1.5">
              Note pour le destinataire
              {action === 'request_changes' && <span className="text-amber-700 dark:text-amber-300 ml-1">(recommandé)</span>}
            </span>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                action === 'submit' ? 'Contexte, points à observer, urgence éventuelle…'
                : action === 'request_changes' ? 'Ce qui manque ou doit être retravaillé…'
                : 'Commentaire de validation (optionnel)…'
              }
              className="w-full rounded-lg border border-stone-200 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 dark:focus:border-turf-300 transition resize-none"
              disabled={busy}
            />
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-stone-200 dark:border-stone-50/10 bg-stone-50 dark:bg-zinc-950/30">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/5 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || (showRecipientPicker && !recipientId)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${copy.tone}`}
          >
            {busy ? 'Envoi…' : copy.cta}
            {!busy && <ArrowRight size={13} weight="bold" />}
          </button>
        </footer>
      </motion.div>
    </>
  )
}

export default ReportActionModal
