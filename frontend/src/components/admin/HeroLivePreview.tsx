import { useEffect, useRef, useState } from 'react'
import { ArrowClockwise, ArrowSquareOut, DeviceMobile, Monitor } from '@phosphor-icons/react'
import { HERO_META, type HeroVariant } from '../../lib/heroVariants'

type Device = 'desktop' | 'mobile'

const VIEWPORT: Record<Device, { w: number; h: number }> = {
  desktop: { w: 1440, h: 900 },
  mobile: { w: 390, h: 844 },
}

/**
 * The real home page, shown live in Réglages with the hero being chosen
 * (unsaved choices included). It is the public site in an iframe, scaled
 * down to the panel, in preview mode: no visit counted, no cookie notice.
 */
export default function HeroLivePreview({ variant }: { variant: HeroVariant }) {
  const [device, setDevice] = useState<Device>('desktop')
  const [loaded, setLoaded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const src = `/?hero=${variant}&apercu=1`
  useEffect(() => { setLoaded(false) }, [src, device, reloadKey])

  const vp = VIEWPORT[device]
  const chrome = device === 'desktop' ? 36 : 0
  const scale = box.w && box.h
    ? Math.min(box.w / vp.w, (box.h - chrome) / vp.h)
    : 0

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-50/10 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-50/10">
        <div className="min-w-0">
          <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400">Aperçu en direct</div>
          <div className="truncate font-display text-sm font-semibold text-zinc-950 dark:text-stone-50">
            Page d’accueil · {HERO_META[variant].label}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-full border border-stone-300 p-0.5 dark:border-stone-50/15" role="group" aria-label="Appareil">
            {([['desktop', Monitor, 'Ordinateur'], ['mobile', DeviceMobile, 'Mobile']] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDevice(key)}
                aria-pressed={device === key}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  device === key
                    ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-stone-300 dark:hover:text-stone-50'
                }`}
              >
                <Icon size={13} weight="bold" /> {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            title="Rejouer l’animation"
            aria-label="Rejouer l’animation"
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-950 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50"
          >
            <ArrowClockwise size={15} weight="bold" />
          </button>
          <a
            href={`/?hero=${variant}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir dans un nouvel onglet"
            aria-label="Ouvrir dans un nouvel onglet"
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-950 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50"
          >
            <ArrowSquareOut size={15} weight="bold" />
          </a>
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-b-2xl bg-[radial-gradient(circle_at_1px_1px,rgba(120,113,108,0.18)_1px,transparent_0)] bg-[length:18px_18px] p-4"
      >
        {scale > 0 && (
          <div
            className={`relative overflow-hidden bg-stone-50 shadow-2xl dark:bg-zinc-950 ${
              device === 'mobile' ? 'rounded-[2rem] ring-[6px] ring-zinc-900 dark:ring-zinc-700' : 'rounded-lg ring-1 ring-stone-300 dark:ring-stone-50/15'
            }`}
            style={{ width: vp.w * scale, height: vp.h * scale + chrome * (device === 'desktop' ? 1 : 0) }}
          >
            {device === 'desktop' && (
              <div className="flex h-9 items-center gap-2 border-b border-stone-200 bg-stone-100 px-3 dark:border-stone-50/10 dark:bg-zinc-900">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 truncate rounded-md bg-white px-3 py-0.5 font-mono text-[0.65rem] text-zinc-500 dark:bg-zinc-800 dark:text-stone-400">
                  renefootball.com
                </span>
              </div>
            )}
            <iframe
              key={`${src}-${device}-${reloadKey}`}
              src={src}
              title={`Aperçu de la page d’accueil · ${HERO_META[variant].label}`}
              onLoad={() => window.setTimeout(() => setLoaded(true), 250)}
              className={`pointer-events-none origin-top-left border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ width: vp.w, height: vp.h, transform: `scale(${scale})` }}
              tabIndex={-1}
            />
            {!loaded && (
              <div className={`absolute inset-0 grid place-items-center text-xs text-zinc-500 dark:text-stone-400 ${device === 'desktop' ? 'top-9' : ''}`}>
                Chargement de l’aperçu…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
