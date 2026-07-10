import type { ReactElement } from 'react'
import type { Player } from '../types/player'
import type { PresentationOptions, PresentationStatChoice, PresentationTemplateKey } from '../types/presentation'

/**
 * Live, A4-shaped preview of a PDF presentation. Mirrors the visual
 * decisions of the server-side DomPDF templates so the user can iterate on
 * colours, photo cropping and stat selection without round-tripping to the
 * backend.
 *
 * Every dimension is expressed as a percentage of the locked aspect-ratio
 * container so the preview scales smoothly with its parent width. Photo
 * cropping uses object-cover - exactly what DomPDF renders.
 */

export interface PresentationPreviewProps {
  template: PresentationTemplateKey
  player: Player | null
  options: PresentationOptions
  title: string
  statCatalogue: PresentationStatChoice[]
}

interface StatRow { label: string; value: string | number; suffix: string }

function defaultStatsFor(category: string | undefined): string[] {
  return category === 'Gardien'
    ? ['matches_played', 'clean_sheets', 'saves', 'pass_accuracy']
    : ['matches_played', 'goals', 'assists', 'xg']
}

function computeStats(
  player: Player | null,
  options: PresentationOptions,
  catalogue: PresentationStatChoice[],
): StatRow[] {
  if (!player) return []
  const byKey = new Map(catalogue.map((c) => [c.key, c]))
  let selected = (options.selected_stats ?? []).filter((k) => byKey.has(k))
  if (selected.length === 0) selected = defaultStatsFor(player.category)
  return selected.slice(0, 4).map((k) => {
    const meta = byKey.get(k)
    const raw = (player as unknown as Record<string, unknown>)[k]
    return {
      label: meta?.label ?? k,
      value: typeof raw === 'number' || typeof raw === 'string' ? raw : 0,
      suffix: meta?.suffix ?? '',
    }
  })
}

function pickPhoto(player: Player | null, options: PresentationOptions): string | null {
  if (options.photo_source === 'custom' && options.custom_photo_url) return options.custom_photo_url
  return player?.photo_url ?? null
}

/** Standard football heatmap ramp: yellow → orange → red → deep red. Used
 *  instead of the template accent so blobs stay visible on the green pitch. */
function heatColor(v: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v / 100))
  const stops: Array<[number, number, number, number]> = [
    [0.00, 250, 204,  21],
    [0.33, 249, 115,  22],
    [0.66, 239,  68,  68],
    [1.00, 190,  18,  60],
  ]
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, r0, g0, b0] = stops[i]
    const [t1, r1, g1, b1] = stops[i + 1]
    if (t >= t0 && t <= t1) {
      const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0)
      return [
        Math.round(r0 + (r1 - r0) * k),
        Math.round(g0 + (g1 - g0) * k),
        Math.round(b0 + (b1 - b0) * k),
      ]
    }
  }
  return [190, 18, 60]
}

function HeatmapGrid({ grid }: { grid: number[][] | null | undefined; accent?: string }) {
  // Real football heatmap: SVG pitch with markings + soft radial-gradient
  // blobs sized by the intensity of each grid cell. Mirrors the PHP renderer
  // 1-for-1 (radialGradient, no feGaussianBlur/pattern) so the preview
  // matches what DomPDF will output.
  const safe = (grid && grid.length === 4 ? grid : Array.from({ length: 4 }, () => Array(6).fill(0))) as number[][]
  const stroke = 'rgba(255,255,255,0.22)'

  const gradients: ReactElement[] = []
  const blobs: ReactElement[] = []
  let idx = 0
  safe.forEach((row, rowI) => {
    row.forEach((raw, colI) => {
      const v = Math.max(0, Math.min(100, raw))
      if (v < 5) return
      const cx = colI * 50 + 25
      const cy = rowI * 50 + 25
      const r  = 32 + (v / 100) * 12
      const core = Math.min(0.85, 0.35 + (v / 100) * 0.5)
      const mid  = Math.min(0.60, 0.20 + (v / 100) * 0.4)
      const [cr, cg, cb] = heatColor(v)
      const rgb = `rgb(${cr},${cg},${cb})`
      const gid = `hb${idx}`
      gradients.push(
        <radialGradient key={gid} id={gid} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%"   stopColor={rgb} stopOpacity={core} />
          <stop offset="55%"  stopColor={rgb} stopOpacity={mid} />
          <stop offset="100%" stopColor={rgb} stopOpacity={0} />
        </radialGradient>,
      )
      blobs.push(
        <circle key={`c-${gid}`} cx={cx} cy={cy} r={r} fill={`url(#${gid})`} />,
      )
      idx++
    })
  })

  // Wrap in aspect-locked container (3:2 landscape pitch) so the preview
  // reflects the fixed footprint the PDF uses.
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 2', overflow: 'hidden', borderRadius: 4 }}>
      <svg
        viewBox="0 0 300 200"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id="hm-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0e3f22" />
            <stop offset="1" stopColor="#082616" />
          </linearGradient>
          {gradients}
        </defs>

        {/* Turf */}
        <rect x="0" y="0" width="300" height="200" fill="url(#hm-grass)" />

        {/* Pitch markings */}
        <rect x="1" y="1" width="298" height="198" fill="none" stroke={stroke} strokeWidth="1" />
        <line x1="150" y1="1" x2="150" y2="199" stroke={stroke} strokeWidth="1" />
        <circle cx="150" cy="100" r="22" fill="none" stroke={stroke} strokeWidth="1" />
        <circle cx="150" cy="100" r="1.2" fill={stroke} />
        <rect x="1"   y="55" width="42" height="90" fill="none" stroke={stroke} strokeWidth="1" />
        <rect x="1"   y="80" width="14" height="40" fill="none" stroke={stroke} strokeWidth="1" />
        <circle cx="30"  cy="100" r="1.2" fill={stroke} />
        <rect x="257" y="55" width="42" height="90" fill="none" stroke={stroke} strokeWidth="1" />
        <rect x="285" y="80" width="14" height="40" fill="none" stroke={stroke} strokeWidth="1" />
        <circle cx="270" cy="100" r="1.2" fill={stroke} />

        {/* Heat blobs (soft radial gradients) */}
        {blobs}
      </svg>
    </div>
  )
}

function PhotoOrPlaceholder({
  src,
  fallbackBg,
  fit = 'contain',
  zoom = 100,
  posX = 50,
  posY = 50,
}: {
  src: string | null
  fallbackBg: string
  fit?: 'contain' | 'cover'
  zoom?: number
  posX?: number
  posY?: number
}) {
  if (src) {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ background: fallbackBg }}>
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: fit,
            objectPosition: `${posX}% ${posY}%`,
            transform: `scale(${Math.max(100, zoom) / 100})`,
            transformOrigin: `${posX}% ${posY}%`,
          }}
        />
      </div>
    )
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center text-[8px] uppercase tracking-wider opacity-50"
         style={{ background: fallbackBg, color: '#fff' }}>
      Photo
    </div>
  )
}

// --------------------------------------------------------------------------
// Classic - 2-col, photo+identity left, KPIs + heatmap right
// --------------------------------------------------------------------------

function ClassicPreview({ player, options, title, statCatalogue }: PresentationPreviewProps) {
  const accent     = options.accent_color ?? '#0f5132'
  const secondary  = options.secondary_color ?? '#84b896'
  const text       = options.text_color ?? '#0c0a09'
  const bg         = options.background_color ?? '#fafaf9'
  const photo      = pickPhoto(player, options)
  const stats      = computeStats(player, options, statCatalogue)
  const tagline    = options.tagline ?? ''

  return (
    <div className="absolute inset-0 flex flex-col p-[5%]" style={{ background: bg, color: text, fontFamily: 'system-ui, sans-serif' }}>
      <div className="pb-[2%] mb-[4%]" style={{ borderBottom: `2px solid ${accent}` }}>
        <div className="text-[6px] tracking-[1.5px] uppercase opacity-60">Présentation joueur · Rene Football</div>
        <div className="text-[10px] font-semibold mt-[1%] truncate">{title || 'Titre du document'}</div>
      </div>

      <div className="flex-1 flex gap-[4%]">
        {/* LEFT */}
        <div className="w-[40%]">
          <div className="relative w-full overflow-hidden rounded-[3px]" style={{ paddingTop: '110%', background: secondary }}>
            <PhotoOrPlaceholder src={photo} fallbackBg={secondary} fit={options.photo_fit ?? "contain"} zoom={options.photo_zoom ?? 100} posX={options.photo_position_x ?? 50} posY={options.photo_position_y ?? 50} />
          </div>
          <div className="text-[14px] font-bold leading-none mt-[6%]">{player?.name ?? 'Nom du joueur'}</div>
          {tagline && (
            <div className="text-[6px] uppercase tracking-[1px] mt-[2%]" style={{ color: accent }}>{tagline}</div>
          )}
          <div className="mt-[5%] space-y-[3%] text-[6.5px]">
            {[
              ['Âge', player ? `${player.age} ans` : '-'],
              ['Poste', player?.position ?? '-'],
              player?.height ? ['Taille', player.height] : null,
              player?.preferred_foot ? ['Pied fort', player.preferred_foot] : null,
              player?.club ? ['Club', player.club] : null,
            ].filter(Boolean).slice(0, 5).map((row) => {
              const [k, v] = row as [string, string]
              return (
                <div key={k} className="flex justify-between border-b border-stone-200/70 pb-[2%]">
                  <span className="opacity-50">{k}</span>
                  <span className="font-semibold truncate ml-2">{v}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 flex flex-col gap-[3%]">
          <div className="grid grid-cols-2 gap-[3%]">
            {stats.slice(0, 4).map((s) => (
              <div key={s.label} className="rounded-[2px] p-[6%] bg-white border border-stone-200" style={{ borderLeft: `2px solid ${accent}` }}>
                <div className="text-[14px] font-bold leading-none" style={{ color: accent }}>
                  {String(s.value)}<span className="text-[7px] ml-[2%] opacity-60">{s.suffix}</span>
                </div>
                <div className="text-[5px] uppercase tracking-[1px] opacity-50 mt-[6%]">{s.label}</div>
              </div>
            ))}
          </div>
          {options.show_heatmap && (
            <div className="rounded-[2px] p-[4%] bg-white border border-stone-200">
              <div className="text-[5px] uppercase tracking-[1px] opacity-50 mb-[3%]">Zones d'influence</div>
              <HeatmapGrid grid={player?.heatmap_grid ?? null} accent={accent} />
            </div>
          )}
        </div>
      </div>

      <div className="text-[5px] uppercase tracking-[1.5px] text-center opacity-40 mt-[3%]">
        Rene Football
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Magazine - hero photo + stat strip + body grid
// --------------------------------------------------------------------------

function MagazinePreview({ player, options, title, statCatalogue }: PresentationPreviewProps) {
  const accent     = options.accent_color ?? '#0c0a09'
  const secondary  = options.secondary_color ?? '#ef4444'
  const text       = options.text_color ?? '#fafaf9'
  const bg         = options.background_color ?? '#0c0a09'
  const photo      = pickPhoto(player, options)
  const stats      = computeStats(player, options, statCatalogue)
  const tagline    = options.tagline ?? ''

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: bg, color: text, fontFamily: 'system-ui, sans-serif' }}>
      {/* HERO 145mm / 297mm ≈ 48.8% */}
      <div className="relative w-full" style={{ height: '48.8%', background: secondary }}>
        <PhotoOrPlaceholder src={photo} fallbackBg={secondary} fit={options.photo_fit ?? "contain"} zoom={options.photo_zoom ?? 100} posX={options.photo_position_x ?? 50} posY={options.photo_position_y ?? 50} />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(12,10,9,0.85) 90%)' }}
        />
        <div className="absolute left-[5%] right-[5%] bottom-[5%]">
          <div className="text-[5px] tracking-[2px] uppercase truncate" style={{ color: secondary }}>{title || 'Titre du document'}</div>
          <div className="text-[18px] font-bold leading-none mt-[1%] truncate">{player?.name ?? 'Nom du joueur'}</div>
          <div className="text-[6px] tracking-[1.5px] uppercase mt-[2%] opacity-85 truncate">
            {tagline || `${player?.position ?? ''}${player?.club ? ' · ' + player.club : ''}` || 'Tagline'}
          </div>
        </div>
      </div>

      {/* STRIP */}
      <div className="px-[5%] py-[2%]" style={{ background: secondary }}>
        <div className="flex gap-[3%]">
          {stats.slice(0, 4).map((s) => (
            <div key={s.label} className="flex-1">
              <div className="text-[12px] font-bold leading-none">
                {String(s.value)}<span className="text-[6px] opacity-70 ml-[2%]">{s.suffix}</span>
              </div>
              <div className="text-[4px] uppercase tracking-[1.5px] opacity-85 mt-[8%]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 px-[5%] py-[3%] flex flex-col gap-[3%]">
        <div className="flex gap-[3%]">
          {options.show_heatmap && (
            <div className="flex-1 p-[3%] rounded-[2px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-[4px] uppercase tracking-[1.5px] mb-[3%]" style={{ color: secondary }}>Zones d'influence</div>
              <HeatmapGrid grid={player?.heatmap_grid ?? null} accent={secondary} />
            </div>
          )}
          <div className="flex-1 p-[3%] rounded-[2px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-[4px] uppercase tracking-[1.5px] mb-[3%]" style={{ color: secondary }}>Identité</div>
            <div className="text-[6px] leading-[1.7] space-y-[2%]">
              <div><span className="font-semibold">Âge</span> · {player ? `${player.age} ans` : '-'}</div>
              {player?.height && <div><span className="font-semibold">Taille</span> · {player.height}</div>}
              {player?.preferred_foot && <div><span className="font-semibold">Pied</span> · {player.preferred_foot}</div>}
              {player?.nationality && <div><span className="font-semibold">Nat.</span> · {player.nationality}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[4px] uppercase tracking-[1.5px] text-center opacity-50 py-[1.5%]">Rene Football</div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Minimal - serif, sober, generous whitespace
// --------------------------------------------------------------------------

function MinimalPreview({ player, options, title, statCatalogue }: PresentationPreviewProps) {
  const accent     = options.accent_color ?? '#1c1917'
  const secondary  = options.secondary_color ?? '#a8a29e'
  const text       = options.text_color ?? '#1c1917'
  const bg         = options.background_color ?? '#ffffff'
  const photo      = pickPhoto(player, options)
  const stats      = computeStats(player, options, statCatalogue)
  const tagline    = options.tagline ?? ''

  return (
    <div className="absolute inset-0 flex flex-col p-[6%]" style={{ background: bg, color: text, fontFamily: 'Georgia, serif' }}>
      <div className="pt-[1%] pb-[2%]" style={{ borderTop: `1.5px solid ${accent}`, borderBottom: `0.5px solid ${secondary}` }}>
        <div className="text-[5px] tracking-[3px] uppercase" style={{ color: secondary }}>Rene Football · Présentation joueur</div>
        <div className="text-[8px] font-semibold mt-[1%] truncate">{title || 'Titre du document'}</div>
      </div>

      <div className="text-[20px] font-semibold leading-none mt-[6%] tracking-tight truncate">{player?.name ?? 'Nom du joueur'}</div>
      {tagline && (
        <div className="text-[7px] italic mt-[2%]" style={{ color: secondary }}>{tagline}</div>
      )}
      <div className="text-[6px] uppercase tracking-[1px] mt-[2%]" style={{ color: secondary }}>
        {(player?.position ?? '') + (player?.club ? ' · ' + player.club : '') || 'Poste · Club'}
      </div>

      <div className="flex-1 mt-[5%] flex gap-[4%]">
        <div className="w-[37%]">
          <div className="relative w-full overflow-hidden" style={{ paddingTop: '80%' }}>
            <PhotoOrPlaceholder src={photo} fallbackBg={secondary} fit={options.photo_fit ?? "contain"} zoom={options.photo_zoom ?? 100} posX={options.photo_position_x ?? 50} posY={options.photo_position_y ?? 50} />
          </div>
          <div className="mt-[5%] space-y-[3%] text-[6px]">
            {[
              ['Âge', player ? `${player.age} ans` : '-'],
              ['Poste', player?.position ?? '-'],
              player?.height ? ['Taille', player.height] : null,
              player?.preferred_foot ? ['Pied fort', player.preferred_foot] : null,
            ].filter(Boolean).slice(0, 4).map((row) => {
              const [k, v] = row as [string, string]
              return (
                <div key={k} className="flex justify-between border-b pb-[2%]" style={{ borderColor: secondary }}>
                  <span style={{ color: secondary }}>{k}</span>
                  <span className="font-semibold truncate ml-2">{v}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-[4%]">
            {stats.slice(0, 4).map((s) => (
              <div key={s.label} className="py-[6%]" style={{ borderTop: `0.5px solid ${accent}`, borderBottom: `0.5px solid ${accent}` }}>
                <div className="text-[12px] font-semibold leading-none">
                  {String(s.value)}<span className="text-[6px] ml-[4%]" style={{ color: secondary }}>{s.suffix}</span>
                </div>
                <div className="text-[4px] uppercase tracking-[1.5px] mt-[8%]" style={{ color: secondary }}>{s.label}</div>
              </div>
            ))}
          </div>
          {options.show_heatmap && (
            <div className="mt-[6%]">
              <div className="text-[4px] uppercase tracking-[1.5px] mb-[3%]" style={{ color: secondary }}>Zones d'influence</div>
              <HeatmapGrid grid={player?.heatmap_grid ?? null} accent={accent} />
            </div>
          )}
        </div>
      </div>

      <div className="pt-[2%] mt-[3%] text-[4px] uppercase tracking-[2px]" style={{ borderTop: `1.5px solid ${accent}`, color: secondary }}>
        Document interne
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// Stadium - dark, big name, identity stack, strengths, clubs, QR links
// --------------------------------------------------------------------------

function StadiumPreview({ player, options, title, statCatalogue }: PresentationPreviewProps) {
  void title
  const accent     = options.accent_color ?? '#3b82f6'
  const secondary  = options.secondary_color ?? '#facc15'
  const text       = options.text_color ?? '#fafaf9'
  const bg         = options.background_color ?? '#0a1220'
  const photo      = pickPhoto(player, options)
  const tagline    = options.tagline ?? ''
  const rawStrengths = (player?.strengths ?? []).slice(0, 6)
  const clubs      = (options.previous_clubs ?? []).filter((c) => c.name || c.logo_url).slice(0, 6)
  const articleSlug = options.article_slug
  const youtubeUrl  = options.youtube_url

  // KPI padded to 4 tiles so the strip always has weight.
  const rawStats = computeStats(player, options, statCatalogue).slice(0, 4)
  const stats: StatRow[] = [...rawStats]
  while (stats.length < 4) stats.push({ label: '-', value: '-', suffix: '' })

  // Stadium lights (mirrors the PHP CSS gradient recipe).
  const stageBg = `
    radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.16) 0%, transparent 35%),
    radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 45%),
    radial-gradient(ellipse at 80% 0%, rgba(255,255,255,0.16) 0%, transparent 35%),
    radial-gradient(ellipse at 50% 110%, rgba(15,81,50,0.55) 0%, transparent 60%),
    ${bg}
  `

  const identityRows = [
    ['NATIONALITÉ', player?.nationality ?? '-'],
    ['ÂGE',         player ? `${player.age} ans` : '-'],
    ['POSTE',       (player?.position ?? '-').toUpperCase()],
    ['CATÉGORIE',   (player?.category ?? '-').toUpperCase()],
    player?.height ? ['TAILLE', player.height] : null,
    player?.preferred_foot ? ['PIED FORT', player.preferred_foot.toUpperCase()] : null,
  ].filter(Boolean).slice(0, 6) as [string, string][]

  // Heights map roughly to the PHP layout (in % of 297mm):
  //   hero 135mm ≈ 45.5%, band 34mm ≈ 11.4%, bottom 108mm ≈ 36.4%, footer 10mm ≈ 3.4%
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: stageBg, color: text, fontFamily: 'system-ui, sans-serif' }}>
      {/* HERO */}
      <div style={{ height: '45.5%' }} className="px-[5%] pt-[3.5%] flex flex-col">
        <div className="flex gap-[4%]" style={{ height: '70%' }}>
          <div className="w-[44%] relative rounded-[3px] overflow-hidden">
            <PhotoOrPlaceholder src={photo} fallbackBg="rgba(255,255,255,0.04)" fit={options.photo_fit ?? 'contain'} zoom={options.photo_zoom ?? 100} posX={options.photo_position_x ?? 50} posY={options.photo_position_y ?? 50} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="text-[19px] font-black leading-[0.95] tracking-tight uppercase truncate">
              {player?.name ?? 'NOM JOUEUR'}
            </div>
            {tagline && (
              <div className="text-[6px] tracking-[3px] uppercase mt-[2%]" style={{ color: secondary }}>{tagline}</div>
            )}
            <div className="mt-[4%] space-y-[1.5%] text-[6px]">
              {identityRows.map(([k, v]) => (
                <div key={k} className="flex justify-between items-baseline pb-[1%]" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.14)' }}>
                  <span className="opacity-60 tracking-[1px] font-semibold">{k}</span>
                  <span className="font-bold ml-2 truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPI strip - always 4 tiles */}
        <div className="mt-auto pt-[3%]">
          <div className="grid grid-cols-4 gap-[3%]">
            {stats.map((s, i) => (
              <div key={i} className="p-[6%]" style={{ background: 'rgba(255,255,255,0.06)', borderLeft: `2px solid ${accent}` }}>
                <div className="text-[10px] font-extrabold leading-none">
                  {String(s.value)}<span className="text-[5px] opacity-70 ml-[2%]">{s.suffix}</span>
                </div>
                <div className="text-[3.5px] uppercase tracking-[1.5px] opacity-75 mt-[8%]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BAND - Points forts (toujours affichée) */}
      <div style={{ height: '11.4%', background: 'rgba(0,0,0,0.4)', borderTop: `1px solid ${accent}`, borderBottom: `1px solid ${accent}` }} className="px-[5%] py-[1.5%] flex flex-col justify-center">
        <div className="text-[4.5px] tracking-[3px] mb-[1.5%]" style={{ color: secondary }}>POINTS FORTS</div>
        {rawStrengths.length > 0 ? (
          <div className="grid grid-cols-3 gap-x-[3%] gap-y-[1%]">
            {rawStrengths.map((s) => (
              <div key={s.key} className="flex items-center gap-[4%]">
                <span className="inline-block rounded-full shrink-0" style={{ background: secondary, width: 5, height: 5 }} />
                <span className="font-bold uppercase text-[5.5px] tracking-[1px] truncate">{s.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[5.5px] italic opacity-50 text-center pt-[2%]">
            Aucun point fort renseigné sur la fiche joueur.
          </div>
        )}
      </div>

      {/* BOTTOM - heatmap + clubs/links/quote */}
      <div style={{ height: '36.4%' }} className="px-[5%] py-[3%]">
        <div className="flex gap-[3%] h-full">
          <div className="w-[55%] pr-[3%] flex flex-col">
            <div className="text-[4.5px] tracking-[3px] mb-[2%]" style={{ color: secondary }}>ZONES D'INFLUENCE</div>
            {options.show_heatmap
              ? <HeatmapGrid grid={player?.heatmap_grid ?? null} accent={accent} />
              : <p className="text-[5.5px] opacity-70 italic mt-[2%]">Activez la heatmap dans l'éditeur.</p>
            }
          </div>
          <div className="flex-1 pl-[3%] flex flex-col" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            {(clubs.length > 0 || articleSlug || youtubeUrl) ? (
              <>
                {clubs.length > 0 && (
                  <div className="mb-[4%]">
                    <div className="text-[4.5px] tracking-[3px] mb-[2%]" style={{ color: secondary }}>CLUBS PRÉCÉDENTS</div>
                    <div className="flex flex-wrap gap-[4%] items-center">
                      {clubs.map((c, i) => (
                        <div key={i} className="flex items-center" style={{ height: 20 }}>
                          {c.logo_url
                            ? <img src={c.logo_url} alt="" style={{ height: 18, maxWidth: 36, objectFit: 'contain' }} />
                            : <span className="font-bold uppercase text-[5.5px] tracking-[1px]">{c.name}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(articleSlug || youtubeUrl) && (
                  <>
                    <div className="text-[4.5px] tracking-[3px] mb-[2%]" style={{ color: secondary }}>SCANNEZ POUR EN VOIR PLUS</div>
                    {articleSlug && (
                      <div className="flex items-center gap-[4%] mb-[2%]">
                        <div className="bg-white grid place-items-center text-[4px] text-black shrink-0" style={{ width: 22, height: 22 }}>QR</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[5px] tracking-[2px] font-bold" style={{ color: secondary }}>ARTICLE</div>
                          <div className="text-[5px] opacity-80 truncate">/actualites/{articleSlug}</div>
                        </div>
                      </div>
                    )}
                    {youtubeUrl && (
                      <div className="flex items-center gap-[4%]">
                        <div className="bg-white grid place-items-center text-[4px] text-black shrink-0" style={{ width: 22, height: 22 }}>QR</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[5px] tracking-[2px] font-bold" style={{ color: secondary }}>VIDÉO</div>
                          <div className="text-[5px] opacity-80 truncate">{youtubeUrl}</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="text-[4.5px] tracking-[3px] mb-[2%]" style={{ color: secondary }}>PROFIL SCOUT</div>
                <p className="text-[5.5px] leading-[1.55] opacity-90">
                  {player?.bio || 'Ajoutez une bio dans la fiche joueur pour enrichir cette présentation, ou attachez un article et une vidéo YouTube depuis l\'éditeur.'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ height: '3.4%' }} className="text-[3.5px] tracking-[3px] text-center opacity-50 flex items-center justify-center">
        RENE FOOTBALL
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------

export default function PresentationPreview(props: PresentationPreviewProps) {
  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-2xl border border-stone-300/70 dark:border-stone-50/15"
         style={{ aspectRatio: '210 / 297' }}>
      {props.template === 'magazine' && <MagazinePreview {...props} />}
      {props.template === 'minimal'  && <MinimalPreview  {...props} />}
      {props.template === 'classic'  && <ClassicPreview  {...props} />}
      {props.template === 'stadium'  && <StadiumPreview  {...props} />}
    </div>
  )
}
