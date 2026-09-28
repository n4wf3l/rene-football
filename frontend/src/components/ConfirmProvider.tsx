import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WarningCircle } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

/**
 * Global confirmation modal, matching the site's design system.
 *
 * Replaces native `window.confirm()` — never use the browser dialog. Callers:
 *
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: 'Supprimer ?', body: 'Action irréversible.', danger: true }))) return
 *
 * The dialog is rendered once at app root, so any component can trigger it
 * without owning modal state.
 */

export interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button + warning icon (delete-style flows). */
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmCtx = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx)
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>')
  return ctx
}

interface Pending {
  opts: ConfirmOptions
  resolve: (v: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve })
    })
  }, [])

  const resolveWith = useCallback((v: boolean) => {
    if (!pending) return
    pending.resolve(v)
    setPending(null)
  }, [pending])

  const api = useMemo(() => confirm, [confirm])

  return (
    <ConfirmCtx.Provider value={api}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => resolveWith(false)}
          >
            <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" aria-hidden="true" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 shadow-diffusion p-6"
            >
              <div className="flex items-start gap-4">
                {pending.opts.danger && (
                  <span className="grid place-items-center w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 dark:bg-rose-500/15 dark:border-rose-400/25 dark:text-rose-300 shrink-0">
                    <WarningCircle size={20} weight="regular" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2
                    id="confirm-title"
                    className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 leading-tight"
                  >
                    {pending.opts.title}
                  </h2>
                  {pending.opts.body && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
                      {pending.opts.body}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => resolveWith(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/5 transition-colors"
                >
                  {pending.opts.cancelLabel ?? t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => resolveWith(true)}
                  autoFocus
                  className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                    pending.opts.danger
                      ? 'bg-rose-700 hover:bg-rose-800'
                      : 'bg-zinc-950 hover:bg-zinc-900 dark:bg-stone-50 dark:text-zinc-950 dark:hover:bg-stone-200'
                  }`}
                >
                  {pending.opts.confirmLabel ?? t('common.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmCtx.Provider>
  )
}
