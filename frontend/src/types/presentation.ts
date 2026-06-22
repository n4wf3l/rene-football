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
  /** Zoom percentage applied to the hero photo (100 = original cover fit, 200 = 2x). */
  photo_zoom?: number
  /** Horizontal focal point in % (0 = left edge, 50 = center, 100 = right). */
  photo_position_x?: number
  /** Vertical focal point in % (0 = top, 50 = center, 100 = bottom). */
  photo_position_y?: number
  /** Optional internal article slug to link to (renders a QR + URL). */
  article_slug?: string | null
  /** Optional external YouTube URL (dribbles compilation, full match, ...). */
  youtube_url?: string | null
  /** Free-form list of clubs the player previously played for. */
  previous_clubs?: Array<{ name: string; logo_url?: string | null }>
}

export type PresentationTemplateKey = 'classic' | 'magazine' | 'minimal' | 'stadium'

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
  is_published: boolean
  public_token: string | null
  generated_at: string | null
  created_by: number | null
  created_at?: string
  updated_at?: string
  player?: Pick<Player, 'slug' | 'name' | 'position' | 'club' | 'photo_url'> & { id: number; category?: string }
  author?: { id: number; name: string } | null
}
