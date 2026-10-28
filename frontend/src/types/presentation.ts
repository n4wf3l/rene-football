import type { Player } from './player'

/* Mirrors App\Models\Presentation + App\Services\Presentations\Fiche\FicheCompositions. */

export type FicheCompositionKey = 'signature' | 'scouting' | 'career' | 'classic'

/** Option groups a composition renders (FicheCompositions::supports). The editor
 *  only shows controls listed here. */
export type FicheOptionGroup =
  | 'theme' | 'photo' | 'photo_side' | 'photo_framing' | 'typography' | 'font_family' | 'language'
  | 'tagline' | 'header_motto' | 'motto' | 'slogan' | 'watermark' | 'contact' | 'qr' | 'project'
  | 'middle_variant' | 'stats' | 'heatmap' | 'bars'

export type MiddleVariant = 'profile-strengths' | 'profile-caracteristiques' | 'parcours-strengths' | 'profile-bars'

export interface OrgBlock {
  name?: string | null
  logo_url?: string | null
  country?: string | null
  /** ISO 3166-1 alpha-2 lowercase (e.g. "gb", "fr") — used for the flag. */
  country_code?: string | null
  description?: string | null
}

export interface PresentationOptions {
  /** Premium layout. Absent on presentations saved before the redesign (= classic). */
  composition?: FicheCompositionKey
  accent_color?: string
  secondary_color?: string
  text_color?: string
  background_color?: string
  tagline?: string | null
  selected_stats?: string[]
  show_heatmap?: boolean
  photo_source?: 'player' | 'custom'
  custom_photo_url?: string | null
  /** How the photo fits its frame: contain shows the whole photo, cover fills and crops. */
  photo_fit?: 'contain' | 'cover'
  /** Zoom percentage applied to the photo (100 = base fit, 250 max). */
  photo_zoom?: number
  /** Horizontal focal point in % (0 = left edge, 50 = center, 100 = right). */
  photo_position_x?: number
  /** Vertical focal point in % (0 = top, 50 = center, 100 = bottom). */
  photo_position_y?: number
  /** Internal article slug — QR target (third priority). */
  article_slug?: string | null
  /** YouTube URL — QR target (second priority). */
  youtube_url?: string | null
  /** Free-form URL — QR target, wins over YouTube and article. */
  qr_custom_url?: string | null
  /** Legacy (Stadium template) — kept for stored rows, not rendered. */
  previous_clubs?: Array<{ name: string; logo_url?: string | null }>
  partner_agency?: OrgBlock | null
  supervised_by?: OrgBlock | null
  partner_academies?: Array<{
    country: string
    country_code?: string | null
    clubs: Array<{ name: string; logo_url?: string | null }>
  }>
  theme?: 'violet' | 'navy' | 'black-gold' | 'black-yellow' | 'custom'
  photo_side?: 'left' | 'right'
  motto?: string | null
  slogan_cursive?: string | null
  header_motto?: string | null
  projet_intro?: string | null
  show_watermark?: boolean
  middle_variant?: MiddleVariant
  contact?: { instagram?: string; email?: string; phone?: string }
  player_profile_bars?: Array<{ label: string; pct: number }>
  font_family?: 'editorial' | 'sans' | 'grotesque'
  font_scale?: 'small' | 'normal' | 'large'
  /** Document language for the fixed labels of the fiche. */
  language?: 'fr' | 'en' | 'de' | 'nl'
}

// Historic keys (classic/signature/magazine/minimal/stadium) were removed
// with their template classes. Only marketing ships; old rows in DB fall
// back to it via PresentationTemplateRegistry::resolve().
export type PresentationTemplateKey = 'marketing'

export interface PresentationTemplate {
  key: PresentationTemplateKey
  label: string
  description: string
  defaults: PresentationOptions
  thumbnail: string
}

export interface FicheCompositionInfo {
  key: FicheCompositionKey
  label: string
  description: string
  legacy: boolean
  supports: FicheOptionGroup[]
  defaults: PresentationOptions
  thumbnail: string
}

export interface FicheThemeInfo {
  key: NonNullable<PresentationOptions['theme']>
  label: string
  bg: string
  accent: string
  secondary: string
  text: string
}

export interface PresentationStatChoice {
  key: string
  label: string
  suffix?: string
}

/** Layout report of a verified render (FicheResult::meta). */
export interface FicheRenderMeta {
  engine: string
  composition: string
  /** standard | compact | dense | dense+synthèse1 | … | legacy | pdf | image */
  density: string
  /** Lists / texts the PDF shows partially: shown out of total. */
  synthesized: Record<string, { shown: number; total: number }>
  attempts: number
  pages: number | null
  page_size_mm: [number, number] | null
  free_mm: number
  render_ms: number
  verified_at: string
}

export interface Presentation {
  id: number
  player_id: number
  template_key: PresentationTemplateKey
  title: string
  options: PresentationOptions | null
  file_path: string | null
  /** When set, the generator is bypassed and this file (or a PDF wrap of it) is
   *  served to guests. Set by the "Fiche externe" uploader. */
  external_asset_path?: string | null
  external_asset_type?: 'image' | 'pdf' | null
  external_asset_original_name?: string | null
  is_published: boolean
  public_token: string | null
  generated_at: string | null
  render_meta?: FicheRenderMeta | null
  created_by: number | null
  created_at?: string
  updated_at?: string
  player?: Pick<Player, 'slug' | 'name' | 'position' | 'club' | 'photo_url'> & { id: number; category?: string }
  author?: { id: number; name: string } | null
}
