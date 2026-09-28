import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Info, WarningCircle, X as XIcon } from '@phosphor-icons/react'

/**
 * Global toast notifications, anchored bottom-right.
 *
 * Any component can grab `useToast()` and call:
 *   toast.success('Joueur créé')
 *   toast.error('Envoi impossible')
 *   toast.info('Fichier attaché')
 *
 * Every CRUD mutation on the site is expected to surface one of these on
 * success or failure — no silent success, no silent error.
 */

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastEntry {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error:   (message: string) => void
  info:    (message: string) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const DISMISS_MS = 4200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(1)

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, kind, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, DISMISS_MS)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push('success', m),
    error:   (m) => push('error',   m),
    info:    (m) => push('info',    m),
  }), [push])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-diffusion text-sm max-w-[380px] border ${
                t.kind === 'success'
                  ? 'bg-turf-800 text-stone-50 border-turf-300/20'
                  : t.kind === 'error'
                  ? 'bg-rose-700 text-stone-50 border-rose-300/20'
                  : 'bg-zinc-900 text-stone-50 border-stone-50/15'
              }`}
              role="status"
            >
              <span className="shrink-0 mt-0.5">
                {t.kind === 'success' ? <CheckCircle size={16} weight="fill" />
                  : t.kind === 'error' ? <WarningCircle size={16} weight="fill" />
                  : <Info size={16} weight="fill" />}
              </span>
              <span className="min-w-0 leading-relaxed">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="ml-1 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <XIcon size={14} weight="bold" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
