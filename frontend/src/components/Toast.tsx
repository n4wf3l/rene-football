import { motion } from 'framer-motion'
import { CheckCircle, X as XIcon } from '@phosphor-icons/react'

export interface ToastState {
  kind: 'success' | 'error'
  message: string
}

interface ToastProps extends ToastState {
  onDismiss: () => void
}

/**
 * Bottom-right notification used across admin modules. Same animation
 * (slide+fade) and dismissable via the X. The caller controls visibility +
 * timeout - wrap in <AnimatePresence> for graceful exits.
 */
function Toast({ kind = 'success', message, onDismiss }: ToastProps) {
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

export default Toast
