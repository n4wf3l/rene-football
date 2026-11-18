import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribeToApiActivity } from '../api/client'
import RFLoader, { subscribeToPageLoaders } from './RFLoader'

/** A request must last this long before the badge shows (fast loads stay silent). */
const SHOW_AFTER_MS = 350
/** Once shown, the badge stays at least this long so it never blinks. */
const MIN_VISIBLE_MS = 700
/** Time the "done" state (full monogram) stays before the badge leaves. */
const DONE_HOLD_MS = 320

/**
 * Animated RF monogram, bottom center, while data loads.
 *
 * Listens to every `api.*` request (same tracker as TopLoadingBar). It only
 * appears when loading actually takes time, stays long enough to be read,
 * then fills the monogram completely before fading out, so the end of a
 * load is felt rather than cut. Bottom center stays clear of the toasts
 * (bottom-right) and the privacy notice (bottom-left);
 * a page-size RFLoader already on screen hides it.
 */
export default function LoadingBadge() {
  const [visible, setVisible] = useState(false)
  const [done, setDone] = useState(false)
  const [pageLoaderShown, setPageLoaderShown] = useState(false)
  const showTimer = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)
  const shownAt = useRef(0)
  const isVisible = useRef(false)

  useEffect(() => subscribeToPageLoaders((count) => setPageLoaderShown(count > 0)), [])

  useEffect(() => {
    const clear = (ref: { current: number | null }) => {
      if (ref.current != null) {
        window.clearTimeout(ref.current)
        ref.current = null
      }
    }

    const unsubscribe = subscribeToApiActivity((count) => {
      if (count > 0) {
        // A new request while leaving: stay up and resume the loop.
        clear(hideTimer)
        setDone(false)
        if (!isVisible.current && showTimer.current == null) {
          showTimer.current = window.setTimeout(() => {
            showTimer.current = null
            isVisible.current = true
            shownAt.current = Date.now()
            setVisible(true)
          }, SHOW_AFTER_MS)
        }
        return
      }

      // Everything settled before the delay: never show.
      clear(showTimer)
      if (!isVisible.current || hideTimer.current != null) return

      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current))
      hideTimer.current = window.setTimeout(() => {
        setDone(true)
        hideTimer.current = window.setTimeout(() => {
          hideTimer.current = null
          isVisible.current = false
          setVisible(false)
          setDone(false)
        }, DONE_HOLD_MS)
      }, wait)
    })

    return () => {
      unsubscribe()
      clear(showTimer)
      clear(hideTimer)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center">
      <AnimatePresence>
        {visible && !pageLoaderShown && (
          <motion.div
            key="rf-loading-badge"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="rounded-2xl border border-stone-200/80 bg-white/85 p-2.5 shadow-[0_12px_30px_-14px_rgba(29,78,216,0.35)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/85 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_30px_-14px_rgba(0,0,0,0.6)]"
          >
            <RFLoader size={30} label={null} done={done} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
