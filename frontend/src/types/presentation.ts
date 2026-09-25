import type { Player } from './player'

/* Mirrors App\Models\Presentation + App\Services\Presentations\PresentationTemplate. */

export interface PresentationOptions {
  accent_color?: string
  secondary_color?: string
  text_color?: string
  background_color?: string
  tagline?: string | null
  selected_stats?: string[]
  show_heatmap?: boolean
  photo_source?: 'player' | 'custom'
  custom_photo_url?: string | null
  /** How the hero photo fits the frame: contain shows the full photo with letterboxing, cover fills and crops. */
  photo_fit?: 'contain' | 'cover'
  /** Zoom percentage applied to the hero photo (100 = base fit, 200 = 2x). */
  photo_zoom?: number
  /** Horizontal focal point in % (0 = left edge, 50 = center, 100 = right). */
  photo_position_x?: number
  /** Vertical focal point in % (0 = top, 50 = center, 100 = bottom). */
  photo_position_y?: number
  /** Optional internal article slug to link to (renders a QR + URL). */
  article_slug?: string | null
  /** Optional external YouTube URL (dribbles compilation, full match, ...). */
  youtube_url?: string | null
  /** Free-form URL that overrides the QR target when set (Instagram, Wyscout,
   *  agency landing page…). Wins over article_slug and youtube_url. */
  qr_custom_url?: string | null
  /** Free-form list of clubs the player previously played for. */
  previous_clubs?: Array<{ name: string; logo_url?: string | null }>
  /** Partner agency block shown as "En collaboration avec". */
  partner_agency?: {
    name?: string | null
    logo_url?: string | null
    country?: string | null
    /** ISO 3166-1 alpha-2 lowercase (e.g. "gb", "fr") — used for the flag. */
    country_code?: string | null
  } | null
  /** Partner academies grid, grouped by country. */
  partner_academies?: Array<{
    country: string
    clubs: Array<{ name: string; logo_url?: string | null }>
  }>
  /** Marketing v1 template controls. */
  theme?: 'violet' | 'navy' | 'black-gold' | 'black-yellow' | 'custom'
  photo_side?: 'left' | 'right'
  /** Motto shown in the marketing footer (e.g. "DISCIPLINE • WORK • PASSION"). */
  motto?: string | null
  /** Cursive slogan overlaid on the marketing fiche footer. */
  slogan_cursive?: string | null
  /** "Supervisé par" block (Fiche Destiny — supervising agency). */
  supervised_by?: {
    name?: string | null
    logo_url?: string | null
    country?: string | null
    country_code?: string | null
  } | null
  /** Player profile percentage bars (Fiche Saeed — Speed 90%, Technique 85%…). */
  player_profile_bars?: Array<{ label: string; pct: number }>
  /** Font pairing applied to the whole document. */
  font_family?: 'editorial' | 'sans' | 'grotesque'
  /** Base font-size scale relative to the template default. */
  font_scale?: 'small' | 'normal' | 'large'
  /** PDF output language. Only affects hard-coded labels; free-form
   *  fields (title, tagline, bio) are shown as-typed. */
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

export interface PresentationStatChoice {
  key: string
  label: string
  suffix?: string
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
  created_by: number | null
  created_at?: string
  updated_at?: string
  player?: Pick<Player, 'slug' | 'name' | 'position' | 'club' | 'photo_url'> & { id: number; category?: string }
  author?: { id: number; name: string } | null
}
