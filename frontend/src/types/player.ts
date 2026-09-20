/* Player domain - mirrors the backend Player model.
   Stats default to 0 server-side, so they're always present (no `undefined` checks needed). */

export type PlayerCategory = 'Gardien' | 'Defenseur' | 'Milieu' | 'Attaquant'
export type PreferredFoot = 'Droit' | 'Gauche' | 'Ambidextre'

export interface Player {
  slug: string
  name: string
  age: number
  /** ISO date (YYYY-MM-DD). Optional — when set, presentations show DOB
   *  instead of the derived age. */
  date_of_birth?: string | null
  height: string | null
  position: string
  category: PlayerCategory | string
  club: string | null
  /** URL of the current club crest, shown next to the club name. */
  club_logo_url?: string | null
  nationality: string | null
  /** Dual nationality (e.g. "Ghanaian / Dutch" → primary + secondary). */
  secondary_nationality?: string | null
  /** Free-form list of languages spoken (Fiche marketing). */
  languages_spoken?: string[] | null
  preferred_foot: PreferredFoot | string | null
  /** "Percutant – Dribbleur" style qualifier for the marketing card. */
  playing_style?: string | null
  /** Best position (may differ from `position`, e.g. "Attaquant de pointe"). */
  best_position?: string | null
  /** Long-term career objective (marketing card). */
  objective?: string | null
  /** Mental / soft-skill traits (Confiant, Persévérant…). */
  mental_strengths?: string[] | null
  since: number | null
  photo_url: string | null
  /** Small portrait shown alongside the main action photo on marketing fiches. */
  secondary_photo_url?: string | null
  /** Extra photo URLs shown as a 3-vignette strip. */
  gallery_photos?: string[] | null
  /** Career history rows (marketing fiche "Parcours"). */
  career_history?: Array<{ years?: string | null; club?: string | null; logo_url?: string | null }> | null
  /** "Vient de" chip banner over the photo (marketing fiche). */
  previous_club?: string | null
  previous_club_logo?: string | null
  bio: string | null

  matches_played: number
  goals: number
  assists: number

  minutes_played: number
  shots: number
  shots_on_target: number
  xg: number
  xa: number
  key_passes: number
  pass_accuracy: number
  dribbles_completed: number
  tackles: number
  interceptions: number
  duels_won: number
  yellow_cards: number
  red_cards: number
  clean_sheets: number
  saves: number

  /** Heatmap intensity grid: 4 rows × 6 cols, values 0-100. Player attacks left → right. */
  heatmap_grid?: number[][] | null

  /** Pro players this prospect is compared to. */
  comparisons?: PlayerComparison[] | null
  /** 3-5 strength keywords (key drives the icon mapping on the frontend). */
  strengths?: PlayerStrength[] | null
  /** 0-10 potential rating with one decimal. */
  potential_rating?: number | null
  /** Short qualifier next to the rating (e.g. "Future star mondiale"). */
  potential_label?: string | null
  /** One-paragraph scout report - shown as a quote block. */
  scout_quote?: string | null

  /** Free-form short labels: status / contractual situation / availability. */
  tags?: string[] | null

  /** Per-match averages from GPS tracking. All optional - show only if present. */
  distance_avg_km?: number | null
  sprints_avg?: number | null
  top_speed_kmh?: number | null
  high_intensity_runs_avg?: number | null

  is_published?: boolean
  created_at?: string
  updated_at?: string

  /** Provenance for the numeric stats block (set by the CSV import or by
   *  a manual edit). Used to display source/freshness badges on the roster
   *  and analysis views so users know how much to trust the numbers. */
  stats_source?: 'manual' | 'csv' | 'wyscout' | 'instat' | 'club_official' | 'observed' | 'seed' | string | null
  stats_updated_at?: string | null
  stats_reliability?: number | null
}

/** Curated palette suggested in the admin UI. Free-form additions allowed. */
export const PLAYER_TAG_PRESETS = [
  'Sous mandat',
  'Disponible',
  'Fin de contrat',
  'En prêt',
  'Sélectionné international',
  'Blessé long',
  'À surveiller',
  'Demande de transfert',
] as const
export type PlayerTagPreset = typeof PLAYER_TAG_PRESETS[number]

export interface PlayerComparison {
  name: string
  club?: string
  photo_url?: string
}

export interface PlayerStrength {
  /** Stable identifier mapped to a Phosphor icon. */
  key: string
  label: string
}

/* Filter keys used by the public roster page. */
export type PositionFilter = 'Tous' | 'Gardien' | 'Defenseur' | 'Milieu' | 'Attaquant'
export type AgeFilter      = 'Tous' | 'U21' | '21-26' | '27+'
