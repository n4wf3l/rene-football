import type { CSSProperties, ReactElement } from 'react'
import type { Player } from '../types/player'
import type { PresentationOptions, PresentationStatChoice, PresentationTemplateKey } from '../types/presentation'

/**
 * Translations for the fixed chrome labels that PHP renders. Mirrors the T
 * table on the server so the preview matches the PDF word-for-word. Only
 * covers the labels the preview actually paints — free-form fields (title,
 * tagline, bio) stay as the admin typed them.
 */
type Lang = 'fr' | 'en' | 'de' | 'nl'
const T: Record<string, Record<Lang, string>> = {
  presentation_joueur: { fr: 'Présentation joueur', en: 'Player presentation', de: 'Spielervorstellung', nl: 'Spelerpresentatie' },
  age:                 { fr: 'Âge',                 en: 'Age',                 de: 'Alter',                nl: 'Leeftijd' },
  position:            { fr: 'Poste',               en: 'Position',            de: 'Position',             nl: 'Positie' },
  category:            { fr: 'Catégorie',           en: 'Category',            de: 'Kategorie',            nl: 'Categorie' },
  height:              { fr: 'Taille',              en: 'Height',              de: 'Größe',                nl: 'Lengte' },
  preferred_foot:      { fr: 'Pied fort',           en: 'Preferred foot',      de: 'Starker Fuß',          nl: 'Voorkeurvoet' },
  club:                { fr: 'Club',                en: 'Club',                de: 'Verein',               nl: 'Club' },
  nationality:         { fr: 'Nationalité',         en: 'Nationality',         de: 'Nationalität',         nl: 'Nationaliteit' },
  years_old:           { fr: 'ans',                 en: 'yrs',                 de: 'Jahre',                nl: 'jaar' },
  zones_influence:     { fr: "Zones d'influence",   en: 'Areas of influence',  de: 'Einflusszonen',        nl: 'Invloedszones' },
  scout_summary:       { fr: 'Résumé scout',        en: 'Scout summary',       de: 'Scout-Zusammenfassung', nl: 'Scout samenvatting' },
  scout_profile:       { fr: 'Profil scout',        en: 'Scout profile',       de: 'Scout-Profil',         nl: 'Scout profiel' },
  strengths:           { fr: 'Points forts',        en: 'Strengths',           de: 'Stärken',              nl: 'Sterke punten' },
  previous_clubs:      { fr: 'Clubs précédents',    en: 'Previous clubs',      de: 'Frühere Vereine',      nl: 'Voormalige clubs' },
  identity:            { fr: 'Identité',            en: 'Identity',            de: 'Identität',            nl: 'Identiteit' },
  article:             { fr: 'ARTICLE',             en: 'ARTICLE',             de: 'ARTIKEL',              nl: 'ARTIKEL' },
  video:               { fr: 'VIDÉO',               en: 'VIDEO',               de: 'VIDEO',                nl: 'VIDEO' },
  scan_more:           { fr: 'Scannez pour en voir plus', en: 'Scan for more', de: 'Für mehr scannen',     nl: 'Scan voor meer' },
  internal_document:   { fr: 'Document interne',    en: 'Internal document',   de: 'Internes Dokument',    nl: 'Intern document' },
  no_strengths:        { fr: 'Aucun point fort renseigné sur la fiche joueur.', en: 'No strengths listed on the player card.', de: 'Keine Stärken auf der Spielerkarte hinterlegt.', nl: 'Geen sterke punten opgegeven op de spelerskaart.' },
  no_bio:              { fr: 'Ajoutez une bio dans la fiche joueur pour enrichir cette présentation.', en: 'Add a bio to the player card to enrich this presentation.', de: 'Fügen Sie der Spielerkarte eine Biografie hinzu, um diese Präsentation zu bereichern.', nl: 'Voeg een bio toe aan de spelerskaart om deze presentatie te verrijken.' },
  no_bio_stadium:      { fr: "Ajoutez une bio dans la fiche joueur pour enrichir cette présentation, ou attachez un article et une vidéo YouTube depuis l'éditeur.", en: 'Add a bio on the player card, or attach an article and a YouTube video from the editor.', de: 'Fügen Sie eine Biografie zur Spielerkarte hinzu oder verknüpfen Sie einen Artikel und ein YouTube-Video aus dem Editor.', nl: 'Voeg een bio toe op de spelerskaart, of koppel een artikel en een YouTube-video vanuit de editor.' },
  no_heatmap_short:    { fr: "Activez la heatmap dans l'éditeur.", en: 'Enable the heatmap in the editor.', de: 'Aktivieren Sie die Heatmap im Editor.', nl: 'Activeer de heatmap in de editor.' },
  foot_droit:          { fr: 'Droit',    en: 'Right', de: 'Rechts',    nl: 'Rechts' },
  foot_gauche:         { fr: 'Gauche',   en: 'Left',  de: 'Links',     nl: 'Links' },
  foot_ambidextre:     { fr: 'Ambidextre', en: 'Both', de: 'Beidfüßig', nl: 'Beidbenig' },
  cat_gardien:         { fr: 'Gardien',   en: 'Goalkeeper', de: 'Torwart',           nl: 'Doelman' },
  cat_defenseur:       { fr: 'Défenseur', en: 'Defender',   de: 'Verteidiger',       nl: 'Verdediger' },
  cat_milieu:          { fr: 'Milieu',    en: 'Midfielder', de: 'Mittelfeldspieler', nl: 'Middenvelder' },
  cat_attaquant:       { fr: 'Attaquant', en: 'Forward',    de: 'Stürmer',           nl: 'Aanvaller' },
  physical:            { fr: 'Physique',          en: 'Physical',          de: 'Athletisch',      nl: 'Fysiek' },
  potential:           { fr: 'Potentiel',         en: 'Potential',         de: 'Potenzial',       nl: 'Potentieel' },
  since:               { fr: 'Depuis',            en: 'Since',             de: 'Seit',            nl: 'Sinds' },
  phy_distance:        { fr: 'Km / match',        en: 'Km / match',        de: 'Km / Spiel',      nl: 'Km / wedstrijd' },
  phy_top_speed:       { fr: 'Vitesse max',       en: 'Top speed',         de: 'Höchstgeschw.',   nl: 'Topsnelheid' },
  phy_sprints:         { fr: 'Sprints / match',   en: 'Sprints / match',   de: 'Sprints / Spiel', nl: 'Sprints / match' },
  phy_hir:             { fr: 'Courses intensives', en: 'High-intensity runs', de: 'Intensivläufe', nl: 'Intensieve loopjes' },
}

function lang(options: PresentationOptions): Lang {
  const l = options.language
  return l === 'en' || l === 'de' || l === 'nl' ? l : 'fr'
}

function t(key: keyof typeof T, options: PresentationOptions): string {
  return T[key][lang(options)] ?? T[key].fr
}

function tCategory(raw: string | null | undefined, options: PresentationOptions): string {
  switch (raw) {
    case 'Gardien':    return t('cat_gardien', options)
    case 'Defenseur':
    case 'Défenseur':  return t('cat_defenseur', options)
    case 'Milieu':     return t('cat_milieu', options)
    case 'Attaquant':  return t('cat_attaquant', options)
    default:           return raw ?? '-'
  }
}

function tFoot(raw: string | null | undefined, options: PresentationOptions): string {
  switch (raw) {
    case 'Droit':      return t('foot_droit', options)
    case 'Gauche':     return t('foot_gauche', options)
    case 'Ambidextre': return t('foot_ambidextre', options)
    default:           return raw ?? '-'
  }
}

/**
 * Physical KPI rows (distance, top speed, sprints, HIRs) - only entries the
 * player actually has GPS data for. Mirrors PresentationTemplate::physiqueRows.
 * Values are pre-formatted with units so the caller just renders text.
 */
function physiqueRows(player: Player | null): Array<[keyof typeof T, string]> {
  if (!player) return []
  const out: Array<[keyof typeof T, string]> = []
  const fmt1 = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (player.distance_avg_km != null)         out.push(['phy_distance',  `${fmt1(player.distance_avg_km)} km`])
  if (player.top_speed_kmh != null)           out.push(['phy_top_speed', `${fmt1(player.top_speed_kmh)} km/h`])
  if (player.sprints_avg != null)             out.push(['phy_sprints',   String(Math.round(player.sprints_avg))])
  if (player.high_intensity_runs_avg != null) out.push(['phy_hir',       String(Math.round(player.high_intensity_runs_avg))])
  return out
}

/** Flat list of strength labels, capped. Accepts the {key,label} shape only. */
function strengthLabels(player: Player | null, max = 6): string[] {
  if (!player?.strengths) return []
  return player.strengths.slice(0, max).map((s) => s?.label ?? '').filter((s) => s.trim() !== '')
}

/** Pre-formatted potential value (e.g. "8,5/10 · Future star mondiale") or null. */
function potentialValue(player: Player | null): string | null {
  if (!player?.potential_rating) return null
  const rating = player.potential_rating.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${rating}/10${player.potential_label ? ' · ' + player.potential_label : ''}`
}

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
  /** When set, bypass the template preview and show the uploaded fiche instead
   *  (image URL or the fallback PDF chip). */
  externalAsset?: {
    url: string
    type: 'image' | 'pdf'
    name?: string | null
  } | null
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

/** Resolve the CSS font-family stack for a given font_family option. Preview
 *  uses real desktop fonts so the admin can tell them apart at a glance. */
function fontStack(family: PresentationOptions['font_family']): string {
  switch (family) {
    case 'sans':      return 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif'
    case 'grotesque': return '"Helvetica Neue", Helvetica, Arial, sans-serif'
    default:          return 'Georgia, "Times New Roman", serif'
  }
}

/** 0.9 / 1.0 / 1.1 multiplier applied to text sizes for the small/normal/large toggle. */
function scaleFactor(scale: PresentationOptions['font_scale']): number {
  if (scale === 'small') return 0.9
  if (scale === 'large') return 1.1
  return 1
}

/** Style helpers pushed to preview roots so every child inherits family + scale. */
/** Compact "extras" band shown at the bottom of Classic / Magazine / Minimal
 *  when at least one of previous_clubs / article_slug / youtube_url is set.
 *  Mirrors the same footprint as PHP so the preview stays predictive. */
function ExtrasBand({ options, secondary }: { options: PresentationOptions; secondary: string }) {
  const clubs = (options.previous_clubs ?? []).filter((c) => (c.name && c.name.trim() !== '') || c.logo_url)
  const article = options.article_slug ?? null
  const yt = options.youtube_url ?? null
  if (clubs.length === 0 && !article && !yt) return null

  return (
    <div
      className="mt-[3%] py-[2%] px-[3%] flex items-center justify-between gap-[4%]"
      style={{ borderTop: `0.5px solid ${secondary}`, borderBottom: `0.5px solid ${secondary}` }}
    >
      {clubs.length > 0 ? (
        <div className="flex-1 min-w-0">
          <div className="text-[4.5px] tracking-[3px] uppercase font-bold mb-[1.5%]" style={{ color: secondary }}>{t('previous_clubs', options)}</div>
          <div className="flex items-center gap-[3%] flex-wrap">
            {clubs.slice(0, 6).map((c, i) => (
              <div key={i} className="flex items-center" style={{ height: 18 }}>
                {c.logo_url
                  ? <img src={c.logo_url} alt="" style={{ height: 16, maxWidth: 32, objectFit: 'contain' }} />
                  : <span className="font-bold uppercase text-[6px] tracking-[1px]">{c.name}</span>}
              </div>
            ))}
          </div>
        </div>
      ) : <div className="flex-1" />}

      {(article || yt) && (
        <div className="flex items-center gap-[4%] shrink-0">
          {article && (
            <div className="text-center">
              <div className="bg-white grid place-items-center text-[4px] text-black" style={{ width: 24, height: 24 }}>QR</div>
              <div className="text-[4.5px] tracking-[2px] font-bold mt-[3%]" style={{ color: secondary }}>{t('article', options)}</div>
            </div>
          )}
          {yt && (
            <div className="text-center">
              <div className="bg-white grid place-items-center text-[4px] text-black" style={{ width: 24, height: 24 }}>QR</div>
              <div className="text-[4.5px] tracking-[2px] font-bold mt-[3%]" style={{ color: secondary }}>{t('video', options)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function typographyRootStyle(options: PresentationOptions): CSSProperties {
  const style: CSSProperties = {
    fontFamily: fontStack(options.font_family),
    fontSize: `${scaleFactor(options.font_scale) * 100}%`,
  }
  if (options.font_family === 'grotesque') {
    style.letterSpacing = '-0.02em'
    style.fontWeight = 600
  }
  return style
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

  // Same maths as the PHP raster - keeps preview and PDF visually in lockstep.
  const gradients: ReactElement[] = []
  const blobs: ReactElement[] = []
  let idx = 0
  safe.forEach((row, rowI) => {
    row.forEach((raw, colI) => {
      const v = Math.max(0, Math.min(100, raw))
      if (v < 5) return
      const cx = colI * 50 + 25
      const cy = rowI * 50 + 25
      // maxR 37..52 in viewBox units matches the PHP 75..105 in 600px canvas
      // (both around 12-17% of width) so blob overlap looks identical.
      const r    = 37 + (v / 100) * 15
      const peak = Math.min(0.9, 0.35 + (v / 100) * 0.55)
      const mid  = peak * 0.7
      const [cr, cg, cb] = heatColor(v)
      const rgb = `rgb(${cr},${cg},${cb})`
      const gid = `hb${idx}`
      gradients.push(
        <radialGradient key={gid} id={gid} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%"   stopColor={rgb} stopOpacity={peak} />
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
// Marketing v1 - only remaining template. The previous Classic/Magazine/
// Minimal/Stadium/Signature preview functions were removed alongside their
// backend counterparts (they never matched the agency identity and just
// added noise to the picker).
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// Marketing v1 — simplified live preview. Not pixel-perfect: it shows the
// theme colours, name split, hero photo side and info block so the admin
// can iterate on options quickly. Final layout is the PDF preview button.
// --------------------------------------------------------------------------

const MARKETING_THEMES: Record<string, { bg: string; accent: string; secondary: string; text: string; card: string; cardBorder: string }> = {
  navy:           { bg: '#0a1f3d', accent: '#3b82f6', secondary: '#93c5fd', text: '#ffffff', card: 'rgba(59,130,246,0.10)',  cardBorder: 'rgba(147,197,253,0.25)' },
  violet:         { bg: '#1a0f2e', accent: '#8b5cf6', secondary: '#c4b5fd', text: '#ffffff', card: 'rgba(139,92,246,0.10)',  cardBorder: 'rgba(196,181,253,0.25)' },
  'black-gold':   { bg: '#0a0a0a', accent: '#d4a017', secondary: '#e5c04a', text: '#ffffff', card: 'rgba(212,160,23,0.10)', cardBorder: 'rgba(229,192,74,0.30)' },
  'black-yellow': { bg: '#0d0d0d', accent: '#facc15', secondary: '#e5e5e5', text: '#ffffff', card: 'rgba(250,204,21,0.10)', cardBorder: 'rgba(250,204,21,0.30)' },
}

function MarketingPreview({ player, options }: PresentationPreviewProps): ReactElement {
  const themeKey = options.theme ?? 'navy'
  const p = themeKey === 'custom'
    ? {
        bg: options.background_color ?? '#0a1f3d',
        accent: options.accent_color ?? '#3b82f6',
        secondary: options.secondary_color ?? '#93c5fd',
        text: options.text_color ?? '#ffffff',
        card: 'rgba(255,255,255,0.06)',
        cardBorder: 'rgba(255,255,255,0.15)',
      }
    : MARKETING_THEMES[themeKey] ?? MARKETING_THEMES.navy
  const photoSide = options.photo_side === 'left' ? 'left' : 'right'
  const photo = pickPhoto(player, options)
  const name = player?.name ?? 'Prénom Nom'
  const parts = name.trim().split(/\s+/, 2)
  const firstName = parts[0] ?? ''
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''
  const tagline = options.tagline || 'PROPULSEUR DE TALENTS'

  const dob = player?.date_of_birth
    ? new Date(player.date_of_birth).toLocaleDateString('fr-FR')
    : null

  const infoRows: Array<[string, string]> = []
  if (dob) infoRows.push(['DATE DE NAISSANCE', dob])
  else if (player?.age) infoRows.push(['ÂGE', `${player.age} ans`])
  const nat = [player?.nationality, player?.secondary_nationality].filter(Boolean).join(' / ')
  if (nat) infoRows.push(['NATIONALITÉ', nat.toUpperCase()])
  const pos = player?.best_position || player?.position
  if (pos) infoRows.push(['POSITION', pos.toUpperCase()])
  if (player?.club) infoRows.push(['CLUB', player.club.toUpperCase()])
  if (player?.preferred_foot) infoRows.push(['PIED FORT', player.preferred_foot.toUpperCase()])
  infoRows.push(['AGENCE', 'RENEFOOTBALL'])

  const headerBlock = (
    <div style={{ padding: '4% 5% 2% 5%' }}>
      <span style={{ fontSize: '3%', fontWeight: 900, letterSpacing: '0.05em', color: p.text }}>RENE</span>
      <span style={{ fontSize: '3%', fontWeight: 900, letterSpacing: '0.05em', color: p.accent }}>FOOTBALL</span>
      <div style={{ fontSize: '1.3%', letterSpacing: '0.25em', color: p.secondary, marginTop: '0.5%' }}>{tagline}</div>
    </div>
  )
  const nameBlock = (
    <div style={{ padding: '0 5%', lineHeight: 0.95 }}>
      <div style={{ fontSize: '7.5%', fontWeight: 900, color: p.text, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{firstName}</div>
      {lastName && <div style={{ fontSize: '7.5%', fontWeight: 900, color: p.accent, letterSpacing: '-0.02em', textTransform: 'uppercase', marginTop: '0.5%' }}>{lastName}</div>}
    </div>
  )
  const infoBlock = (
    <div style={{ padding: '3% 5%' }}>
      {infoRows.map(([label, value]) => (
        <div key={label} style={{ marginBottom: '1.5%', display: 'flex', gap: '1.5%' }}>
          <div style={{ width: '3%', height: '3%', borderRadius: '50%', background: p.card, border: `0.5px solid ${p.cardBorder}`, color: p.accent, fontSize: '1.8%', fontWeight: 900, display: 'grid', placeItems: 'center', flexShrink: 0 }}>#</div>
          <div>
            <div style={{ fontSize: '1.4%', letterSpacing: '0.15em', color: p.secondary, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: '2%', fontWeight: 700, color: p.text }}>{value}</div>
          </div>
        </div>
      ))}
    </div>
  )
  const photoBlock = photo ? (
    <img src={photo} alt="" style={{ width: '100%', height: '50%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
  ) : (
    <div style={{ width: '100%', height: '50%', background: '#222' }} />
  )

  const infoCol = <>{headerBlock}{nameBlock}{infoBlock}</>
  const photoCol = photoBlock

  // ----- Middle band (bio + strengths / caracteristiques / parcours / bars) -----
  const variant = (options.middle_variant as string | undefined) ?? 'profile-strengths'
  const bio = (player?.bio ?? '').trim()
  const strengths = (Array.isArray(player?.strengths) ? player.strengths : [])
    .map((s) => (typeof s === 'string' ? s : (s as { label?: string; key?: string })?.label ?? (s as { key?: string })?.key ?? ''))
    .filter((s) => typeof s === 'string' && s.trim() !== '')
    .slice(0, 6)

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      fontSize: '2.4%', letterSpacing: '0.18em', color: p.accent, fontWeight: 900,
      textTransform: 'uppercase', borderLeft: `0.6% solid ${p.accent}`,
      paddingLeft: '2%', marginBottom: '2%',
    }}>{children}</div>
  )

  const bioBlock = (
    <div style={{ flex: 1, padding: '2% 4% 2% 4%' }}>
      <SectionTitle>Profil du joueur</SectionTitle>
      {bio ? (
        <div style={{ fontSize: '1.9%', lineHeight: 1.45, color: p.text, whiteSpace: 'pre-wrap' }}>
          {bio.length > 380 ? bio.slice(0, 379) + '…' : bio}
        </div>
      ) : (
        <div style={{ fontSize: '1.8%', color: p.secondary, fontStyle: 'italic' }}>
          Ajoutez la bio dans le champ « Bio scout » ci-contre pour la voir ici.
        </div>
      )}
    </div>
  )

  const strengthsBlock = (title: string) => (
    <div style={{ flex: 1, padding: '2% 4% 2% 4%', borderLeft: `0.4% solid ${p.cardBorder}` }}>
      <SectionTitle>{title}</SectionTitle>
      {strengths.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {strengths.map((s) => (
            <li key={s} style={{
              fontSize: '1.95%', color: p.text, fontWeight: 600,
              padding: '0.6% 0', display: 'flex', gap: '2%', alignItems: 'center',
            }}>
              <span style={{
                width: '2.2%', height: '2.2%', borderRadius: '50%',
                border: `0.4% solid ${p.accent}`, flexShrink: 0,
              }} />
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: '1.8%', color: p.secondary, fontStyle: 'italic' }}>
          Renseignez les points forts sur la fiche joueur.
        </div>
      )}
    </div>
  )

  const caracsBlock = (
    <div style={{ flex: 1, padding: '2% 4% 2% 4%', borderLeft: `0.4% solid ${p.cardBorder}` }}>
      <SectionTitle>Caractéristiques</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6%' }}>
        {[
          ['PIED FORT', player?.preferred_foot],
          ['STYLE DE JEU', (player as unknown as { playing_style?: string })?.playing_style],
          ['MEILLEUR POSTE', player?.best_position],
          ['OBJECTIF', (player as unknown as { objective?: string })?.objective],
        ].filter(([, v]) => v && String(v).trim() !== '').map(([label, value]) => (
          <div key={label as string} style={{ borderBottom: `0.3% solid ${p.cardBorder}`, padding: '0.8% 0', display: 'flex', gap: '3%' }}>
            <span style={{ fontSize: '1.5%', letterSpacing: '0.12em', color: p.secondary, fontWeight: 700, width: '40%' }}>{label}</span>
            <span style={{ fontSize: '1.85%', color: p.text, fontWeight: 700 }}>{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const parcoursBlock = (
    <div style={{ flex: 1, padding: '2% 4% 2% 4%' }}>
      <SectionTitle>Parcours</SectionTitle>
      {(() => {
        const history = (player as unknown as { career_history?: Array<{ years?: string; club?: string }> })?.career_history ?? []
        if (history.length === 0) {
          return <div style={{ fontSize: '1.8%', color: p.secondary, fontStyle: 'italic' }}>Renseignez le parcours sur la fiche joueur.</div>
        }
        return history.slice(0, 4).map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: '3%', padding: '0.8% 0', fontSize: '1.9%', color: p.text }}>
            <span style={{ fontWeight: 800, letterSpacing: '0.08em', width: '30%' }}>{h.years}</span>
            <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>{h.club}</span>
          </div>
        ))
      })()}
    </div>
  )

  let middleLeft = bioBlock
  let middleRight = strengthsBlock('Points forts')
  if (variant === 'profile-caracteristiques') { middleLeft = strengthsBlock('Points forts'); middleRight = caracsBlock }
  else if (variant === 'parcours-strengths')  { middleLeft = parcoursBlock;                   middleRight = strengthsBlock('Qualités') }

  const middleBand = (
    <div style={{ gridColumn: '1 / -1', display: 'flex', minHeight: '18%' }}>
      {middleLeft}
      {middleRight}
    </div>
  )

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text, fontFamily: 'Inter, sans-serif',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto 1fr',
      overflow: 'hidden',
    }}>
      <div style={{ gridColumn: photoSide === 'left' ? '2 / 3' : '1 / 2' }}>{infoCol}</div>
      <div style={{ gridColumn: photoSide === 'left' ? '1 / 2' : '2 / 3' }}>{photoCol}</div>
      {middleBand}
      <div style={{ gridColumn: '1 / -1', padding: '2% 5% 3% 5%', fontSize: '1.4%', color: p.secondary, textAlign: 'center' }}>
        Aperçu simplifié · cliquez « Aperçu PDF » pour le rendu final.
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------

export default function PresentationPreview(props: PresentationPreviewProps) {
  const ext = props.externalAsset
  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-2xl border border-stone-300/70 dark:border-stone-50/15 bg-white dark:bg-zinc-950"
         style={{ aspectRatio: '210 / 297' }}>
      {ext ? (
        ext.type === 'image' ? (
          <img
            src={ext.url}
            alt={ext.name ?? 'Fiche externe'}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <object data={ext.url} type="application/pdf" className="absolute inset-0 w-full h-full">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400">
                Fiche PDF attachée
              </div>
              <div className="text-sm text-zinc-700 dark:text-stone-200 break-all">
                {ext.name ?? 'presentation.pdf'}
              </div>
              <a href={ext.url} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs underline text-turf-700 dark:text-turf-300">
                Ouvrir le PDF
              </a>
            </div>
          </object>
        )
      ) : (
        <>
          {/* Only Marketing v1 remains. Historic presentations that were
             saved with classic/magazine/minimal/stadium/signature also
             fall back here so the admin never sees an empty preview. */}
          <MarketingPreview {...props} />
        </>
      )}
    </div>
  )
}
