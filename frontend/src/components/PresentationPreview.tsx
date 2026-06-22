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
  return selected.slice(0, 6).map((k) => {
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

/** Convert a hex like #0f5132 to "15,81,50" so we can build rgba(...). */
function hexToRgbTuple(hex: string): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function HeatmapGrid({ grid, accent }: { grid: number[][] | null | undefined; accent: string }) {
  // Fall back to a flat 4x6 if no grid is set on the player.
  const safe = (grid && grid.length === 4 ? grid : Array.from({ length: 4 }, () => Array(6).fill(0))) as number[][]
  const rgb = hexToRgbTuple(accent)
  return (
    <div className="grid grid-cols-6 gap-[2%] w-full">
      {safe.flatMap((row, i) =>
        row.map((v, j) => (
          <div
            key={`${i}-${j}`}
            className="aspect-square rounded-[2px]"
            style={{ background: `rgba(${rgb},${Math.max(0, Math.min(100, v)) / 100})`, minHeight: 6 }}
          />
        )),
      )}
    </div>
  )
}

function PhotoOrPlaceholder({
  src,
  fallbackBg,
  zoom = 100,
  posX = 50,
  posY = 50,
}: {
  src: string | null
  fallbackBg: string
  zoom?: number
  posX?: number
  posY?: number
}) {
  if (src) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: 'cover',
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
            <PhotoOrPlaceholder src={photo} fallbackBg={secondary} zoom={options.photo_zoom ?? 100} posX={options.photo_position_x ?? 50} posY={options.photo_position_y ?? 50} />
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
        <PhotoOrPlaceholder src={photo} fallbackBg={secondary} zoom={options.photo_zoom ?? 100} posX={options.photo_position_x ?? 50} posY={options.photo_position_y ?? 50} />
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
            <PhotoOrPlaceholder src={photo} fallbackBg={secondary} zoom={options.photo_zoom ?? 100} posX={options.photo_position_x ?? 50} posY={options.photo_position_y ?? 50} />
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
  void title; void statCatalogue
  const accent     = options.accent_color ?? '#3b82f6'
  const secondary  = options.secondary_color ?? '#facc15'
  const text       = options.text_color ?? '#fafaf9'
  const bg         = options.background_color ?? '#0a1220'
  const photo      = pickPhoto(player, options)
  const tagline    = options.tagline ?? ''
  const strengths  = (player?.strengths ?? []).slice(0, 6)
  const clubs      = (options.previous_clubs ?? []).filter((c) => c.name || c.logo_url).slice(0, 6)
  const articleSlug = options.article_slug
  const youtubeUrl  = options.youtube_url

  // Stadium lights effect built with stacked radial gradients on the
  // background. Same recipe as the PHP template so the preview matches.
  const stageBg = `
    radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.18) 0%, transparent 35%),
    radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 40%),
    radial-gradient(ellipse at 80% 0%, rgba(255,255,255,0.18) 0%, transparent 35%),
    radial-gradient(ellipse at 50% 100%, rgba(15,81,50,0.45) 0%, transparent 55%),
    ${bg}
  `

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: stageBg, color: text, fontFamily: 'system-ui, sans-serif' }}>
      <div className="px-[5%] pt-[5%] pb-[3%] flex gap-[4%]">
        <div className="w-[35%] relative" style={{ height: '37%' }}>
          <PhotoOrPlaceholder src={photo} fallbackBg="transparent" zoom={options.photo_zoom ?? 100} posX={options.photo_position_x ?? 50} posY={options.photo_position_y ?? 50} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-[22px] font-black leading-[0.95] tracking-tight uppercase truncate">
            {player?.name ?? 'NOM JOUEUR'}
          </div>
          {tagline && (
            <div className="text-[6px] tracking-[3px] uppercase mt-[2%]" style={{ color: secondary }}>{tagline}</div>
          )}
          <div className="mt-[4%] space-y-[2%] text-[6px]">
            {[
              ['NATIONALITÉ', player?.nationality ?? '-'],
              ['ÂGE',         player ? `${player.age} ans` : '-'],
              ['POSTE',       (player?.position ?? '-').toUpperCase()],
              ['CATÉGORIE',   (player?.category ?? '-').toUpperCase()],
              player?.height ? ['TAILLE', player.height] : null,
              player?.preferred_foot ? ['PIED FORT', player.preferred_foot.toUpperCase()] : null,
            ].filter(Boolean).slice(0, 6).map((row) => {
              const [k, v] = row as [string, string]
              return (
                <div key={k} className="flex justify-between items-baseline pb-[1%]" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.12)' }}>
                  <span className="opacity-60 tracking-[1px] font-semibold">{k}</span>
                  <span className="font-bold ml-2 truncate">{v}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {strengths.length > 0 && (
        <div className="px-[5%] py-[2.5%]" style={{ background: 'rgba(0,0,0,0.35)', borderTop: `1px solid ${accent}`, borderBottom: `1px solid ${accent}` }}>
          <div className="text-[5px] tracking-[3px] mb-[2%]" style={{ color: secondary }}>POINTS FORTS</div>
          <div className="grid grid-cols-3 gap-[3%]">
            {strengths.map((s) => (
              <div key={s.key} className="flex items-center gap-[6%]">
                <span className="inline-block rounded-full shrink-0" style={{ background: secondary, width: 6, height: 6 }} />
                <span className="font-bold uppercase text-[5.5px] tracking-[1px] truncate">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {clubs.length > 0 && (
        <div className="px-[5%] py-[3%]">
          <div className="text-[5px] tracking-[3px] mb-[2%]" style={{ color: secondary }}>CLUBS PRÉCÉDENTS</div>
          <div className="flex items-center justify-around gap-[3%] flex-wrap">
            {clubs.map((c, i) => (
              <div key={i} className="flex items-center justify-center" style={{ height: 30, minWidth: 30 }}>
                {c.logo_url
                  ? <img src={c.logo_url} alt="" style={{ height: 28, maxWidth: 56, objectFit: 'contain' }} />
                  : <span className="font-bold uppercase text-[6px] tracking-[1px]">{c.name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(articleSlug || youtubeUrl) && (
        <div className="mt-auto px-[5%] py-[3%]">
          <div className="text-[5px] tracking-[3px] mb-[2%]" style={{ color: secondary }}>SCANNEZ POUR EN VOIR PLUS</div>
          <div className="flex gap-[3%]">
            {articleSlug && (
              <div className="flex-1 flex items-center gap-[4%] p-[2.5%] rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="w-[22%] aspect-square bg-white grid place-items-center text-[4px] text-black">QR</div>
                <div className="min-w-0">
                  <div className="text-[5px] tracking-[2px] font-bold" style={{ color: secondary }}>ARTICLE</div>
                  <div className="text-[5px] opacity-80 truncate">/actualites/{articleSlug}</div>
                </div>
              </div>
            )}
            {youtubeUrl && (
              <div className="flex-1 flex items-center gap-[4%] p-[2.5%] rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="w-[22%] aspect-square bg-white grid place-items-center text-[4px] text-black">QR</div>
                <div className="min-w-0">
                  <div className="text-[5px] tracking-[2px] font-bold" style={{ color: secondary }}>VIDÉO</div>
                  <div className="text-[5px] opacity-80 truncate">{youtubeUrl}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-[4px] tracking-[3px] text-center opacity-40 pb-[1.5%]">RENE FOOTBALL</div>
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
