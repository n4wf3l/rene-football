import { CheckCircle } from '@phosphor-icons/react'
import { HERO_META, HERO_VARIANTS, type HeroVariant } from '../../lib/heroVariants'

interface HeroVariantPickerProps {
  value: HeroVariant
  onChange: (v: HeroVariant) => void
}

/** Wireframe of each hero, drawn small so the choice reads at a glance. */
function Thumb({ variant }: { variant: HeroVariant }) {
  const ink = 'currentColor'
  const accent = '#3b82f6'
  const beige = '#ece4d6'
  const line = (y: number, w: number, x = 10, h = 4) => <rect x={x} y={y} width={w} height={h} rx="1" fill={ink} opacity="0.85" />
  const text = (
    <>
      {line(30, 46)}{line(37, 38)}{line(44, 30)}
      <rect x="10" y="56" width="18" height="6" fill={ink} />
      <rect x="31" y="56" width="18" height="6" fill="none" stroke={ink} strokeWidth="0.8" />
    </>
  )
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true">
      {variant === 'spotlight' && (<>
        {text}
        <path d="M100 18 h34 l8 8 v58 h-42 z" fill={beige} />
        <text x="103" y="34" fontSize="13" fontWeight="700" fill="#09090b">06</text>
        <circle cx="121" cy="48" r="8" fill="#a8a29e" /><rect x="109" y="57" width="24" height="27" rx="3" fill="#a8a29e" />
      </>)}
      {variant === 'poster' && (<>
        <text x="62" y="52" fontSize="30" fontWeight="800" fill="none" stroke={ink} strokeWidth="0.7" opacity="0.5">NAME</text>
        <circle cx="118" cy="42" r="12" fill="#a8a29e" /><rect x="100" y="55" width="36" height="45" rx="6" fill="#a8a29e" />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={102 + i * 11} y="12" width="9" height="1.6" fill={i === 0 ? ink : ink} opacity={i === 0 ? 1 : 0.3} />)}
        {line(34, 40)}{line(41, 32)}{line(48, 26)}
        <rect x="10" y="60" width="16" height="6" fill={ink} />
      </>)}
      {variant === 'mosaic' && (<>
        {line(34, 34)}{line(41, 28)}{line(48, 22)}
        <rect x="10" y="60" width="16" height="6" fill={ink} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const col = i % 4, row = Math.floor(i / 4)
          const offs = [0, 6, 2, 8][col]
          return <rect key={i} x={62 + col * 23} y={12 + row * 38 + offs} width="20" height="32" fill={beige} opacity={i === 2 ? 1 : 0.55} stroke={i === 2 ? accent : 'none'} />
        })}
      </>)}
      {variant === 'lineup' && (<>
        {text}
        <rect x="96" y="8" width="54" height="84" rx="5" fill="#13285a" />
        <rect x="101" y="13" width="44" height="74" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.6" />
        <line x1="101" y1="50" x2="145" y2="50" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.6" />
        {[[112, 24], [134, 24], [108, 42], [123, 40], [138, 42], [114, 62], [132, 62], [123, 80]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.4" fill={beige} stroke="#fff" strokeWidth="0.8" />
        ))}
      </>)}
      {variant === 'cover' && (<>
        <line x1="10" y1="10" x2="150" y2="10" stroke={ink} strokeWidth="0.6" /><line x1="10" y1="17" x2="150" y2="17" stroke={ink} strokeWidth="0.6" />
        <rect x="10" y="24" width="120" height="9" fill={ink} /><rect x="10" y="36" width="90" height="9" fill={accent} />
        {line(62, 28)}{line(68, 24)}
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={50 + i * 20} y="58" width="17" height="24" fill={beige} />)}
      </>)}
      {variant === 'marquee' && (<>
        {line(14, 60)}{line(22, 48)}
        {line(16, 30, 100, 3)}{line(22, 24, 100, 3)}
        <g transform="rotate(-4 80 60)">
          <rect x="-10" y="44" width="180" height="16" fill={ink} />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={2 + i * 42} y="49" width="30" height="6" fill="#fafaf9" opacity="0.85" />)}
        </g>
        <g transform="rotate(3 80 72)">
          {[0, 1, 2, 3].map((i) => <rect key={i} x={10 + i * 42} y="68" width="30" height="7" fill="none" stroke={ink} strokeWidth="0.8" />)}
        </g>
      </>)}
    </svg>
  )
}

/** Réglages → Page d'accueil: pick the hero (the live preview sits beside it). */
export default function HeroVariantPicker({ value, onChange }: HeroVariantPickerProps) {
  return (
    <div className="grid gap-2.5" role="radiogroup" aria-label="Mise en page du haut de l'accueil">
      {HERO_VARIANTS.map((key) => {
        const active = value === key
        const { label, description } = HERO_META[key]
        return (
          <div
            key={key}
            className={`relative rounded-xl border bg-white p-2.5 transition dark:bg-zinc-900 ${
              active
                ? 'border-turf-700 ring-2 ring-turf-700/20 dark:border-turf-300 dark:ring-turf-300/20'
                : 'border-stone-200 hover:border-stone-400 dark:border-stone-50/10 dark:hover:border-stone-50/30'
            }`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(key)}
              className="flex w-full items-center gap-3 text-left focus:outline-none"
            >
              <span className="block aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-lg bg-stone-100 text-zinc-800 dark:bg-zinc-950 dark:text-stone-200">
                <Thumb variant={key} />
              </span>
              <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-display text-base font-semibold text-zinc-950 dark:text-stone-50">{label}</span>
                {key === 'spotlight' && (
                  <span className="rounded-full bg-stone-100 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-zinc-500 dark:bg-stone-50/10 dark:text-stone-400">Par défaut</span>
                )}
                {active && <CheckCircle size={16} weight="fill" className="ml-auto text-turf-700 dark:text-turf-300" />}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-stone-400">{description}</span>
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
