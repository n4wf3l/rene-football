import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, FilePdf } from '@phosphor-icons/react'

/**
 * Full-screen overlay shown while a PDF is being generated on the backend.
 * Simulates a 3-step progress (save + compile + render) so the wait feels
 * intentional instead of a frozen button. The actual request finishes
 * whenever the fetch resolves - we just fade the overlay away then.
 */

const STEPS = [
  { label: 'Enregistrement des options',       hint: 'sauvegarde du template et de la palette' },
  { label: 'Compilation du template',          hint: 'assemblage HTML et calcul du cadrage photo' },
  { label: 'Rendu de la heatmap et du PDF',    hint: 'rasterisation GD + génération DomPDF' },
] as const

interface Props {
  open: boolean
}

export default function PdfGenerationOverlay({ open }: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!open) { setStep(0); return }
    // Advance a step every ~900ms until the last one, which stays "in progress"
    // until the real fetch settles and the overlay is dismissed.
    const t1 = window.setTimeout(() => setStep(1), 900)
    const t2 = window.setTimeout(() => setStep(2), 1800)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/60 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Génération du PDF en cours"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative w-full max-w-md mx-4 rounded-2xl border border-stone-50/10 bg-zinc-900 text-stone-100 shadow-2xl overflow-hidden"
          >
            {/* Subtle radial ambient light in the card background. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 0%, rgba(45,125,79,0.20) 0%, transparent 55%),' +
                  'radial-gradient(ellipse at 100% 100%, rgba(15,81,50,0.18) 0%, transparent 60%)',
              }}
            />

            <div className="relative p-7">
              {/* Header - pulsing PDF icon + title */}
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative grid place-items-center w-14 h-14 rounded-xl bg-turf-800/60 border border-turf-300/30 text-turf-200"
                >
                  <div aria-hidden="true" className="absolute inset-0 rounded-xl bg-turf-500/20 blur-xl" />
                  <FilePdf size={26} weight="duotone" className="relative" />
                </motion.div>
                <div className="min-w-0">
                  <div className="text-[0.65rem] font-mono uppercase tracking-[0.24em] text-turf-300">
                    Aperçu PDF
                  </div>
                  <div className="mt-0.5 font-display font-semibold text-lg tracking-tight text-stone-50">
                    Génération en cours
                  </div>
                </div>
              </div>

              {/* Steps */}
              <ol className="mt-6 space-y-2.5">
                {STEPS.map((s, i) => {
                  const state = i < step ? 'done' : i === step ? 'active' : 'pending'
                  return (
                    <li key={s.label} className="flex items-start gap-3">
                      <div className="pt-0.5">
                        {state === 'done' && (
                          <CheckCircle size={16} weight="fill" className="text-turf-300" />
                        )}
                        {state === 'active' && (
                          <span className="relative grid place-items-center w-4 h-4">
                            <motion.span
                              className="absolute inset-0 rounded-full border-2 border-turf-300/40 border-t-turf-300"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                            />
                          </span>
                        )}
                        {state === 'pending' && (
                          <span className="grid place-items-center w-4 h-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-50/25" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm ${state === 'active' ? 'text-stone-50 font-medium' : state === 'done' ? 'text-stone-300' : 'text-stone-500'}`}>
                          {s.label}
                        </div>
                        <div className="text-[0.7rem] text-stone-500 mt-0.5 leading-relaxed">
                          {s.hint}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>

              {/* Indeterminate bar */}
              <div className="mt-6 h-[3px] rounded-full overflow-hidden bg-stone-50/8 relative">
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-turf-400 to-transparent"
                  animate={{ x: ['-100%', '350%'] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <p className="mt-4 text-[0.7rem] text-stone-400 leading-relaxed text-center">
                Le PDF s'ouvrira dans un nouvel onglet dès qu'il est prêt. Cela prend
                généralement 2 à 5 secondes.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
