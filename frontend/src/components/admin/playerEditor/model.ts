import type { Player } from '../../../types/player'

/** Shared model of the full-screen player editor (admin). */

export type AdminPlayer = Player & { id?: number }
export type PlayerFormState = Partial<AdminPlayer>
export type SaveKind = 'created' | 'updated'
export type EditorErrors = Record<string, string>

export const CATEGORIES = ['Gardien', 'Defenseur', 'Milieu', 'Attaquant'] as const
/** Labels shown on the category buttons (stored values stay unchanged). */
export const CATEGORY_LABELS: Record<string, string> = {
  Gardien: 'Gardien',
  Defenseur: 'Défenseur',
  Milieu: 'Milieu',
  Attaquant: 'Attaquant',
}
export const FEET = ['Droit', 'Gauche', 'Ambidextre'] as const

export const EMPTY_PLAYER: PlayerFormState = {
  name: '',
  age: 20,
  date_of_birth: null,
  height: '',
  position: '',
  category: 'Milieu',
  club: '',
  club_logo_url: '',
  nationality: '',
  preferred_foot: 'Droit',
  since: new Date().getFullYear(),
  photo_url: '',
  secondary_photo_url: '',
  bio: '',
  matches_played: 0,
  goals: 0,
  assists: 0,
  minutes_played: 0,
  shots: 0,
  shots_on_target: 0,
  xg: 0,
  xa: 0,
  key_passes: 0,
  pass_accuracy: 0,
  dribbles_completed: 0,
  tackles: 0,
  interceptions: 0,
  duels_won: 0,
  yellow_cards: 0,
  red_cards: 0,
  clean_sheets: 0,
  saves: 0,
  heatmap_grid: null,
  tags: [],
  is_published: true,
}

/** Numeric fields sent as 0 when left empty. */
export const NUMERIC_FIELDS: (keyof PlayerFormState)[] = [
  'age', 'since',
  'matches_played', 'goals', 'assists',
  'minutes_played', 'shots', 'shots_on_target', 'xg', 'xa',
  'key_passes', 'pass_accuracy', 'dribbles_completed',
  'tackles', 'interceptions', 'duels_won',
  'yellow_cards', 'red_cards', 'clean_sheets', 'saves',
]

export type TabId = 'profil' | 'fiche' | 'stats' | 'terrain' | 'publication'

export const TABS: { id: TabId; label: string }[] = [
  { id: 'profil', label: 'Profil' },
  { id: 'fiche', label: 'Fiche marketing' },
  { id: 'stats', label: 'Statistiques' },
  { id: 'terrain', label: 'Terrain & vidéos' },
  { id: 'publication', label: 'Publication' },
]

/** Which tab holds a field (completeness shortcuts, server errors). */
const FIELD_TAB: Record<string, TabId> = {
  photo_url: 'profil', name: 'profil', age: 'profil', date_of_birth: 'profil', height: 'profil',
  position: 'profil', category: 'profil', club: 'profil', club_logo_url: 'profil', since: 'profil',
  nationality: 'profil', secondary_nationality: 'profil', preferred_foot: 'profil', bio: 'profil', tags: 'profil',
  playing_style: 'fiche', best_position: 'fiche', languages_spoken: 'fiche', mental_strengths: 'fiche',
  objective: 'fiche', previous_club: 'fiche', previous_club_logo: 'fiche', secondary_photo_url: 'fiche',
  gallery_photos: 'fiche', career_history: 'fiche',
  tracking: 'stats', distance_avg_km: 'stats', sprints_avg: 'stats', top_speed_kmh: 'stats', high_intensity_runs_avg: 'stats',
  heatmap: 'terrain', heatmap_grid: 'terrain',
  is_published: 'publication',
}

export function tabOfField(field: string): TabId {
  const root = field.split('.')[0]
  if (FIELD_TAB[root]) return FIELD_TAB[root]
  return (NUMERIC_FIELDS as string[]).includes(root) && root !== 'age' && root !== 'since' ? 'stats' : 'profil'
}

/** Age today from a YYYY-MM-DD birth date, or null. */
export function ageFromBirthDate(dob: string | null | undefined): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}/.test(dob)) return null
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number)
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age >= 0 && age < 100 ? age : null
}

/* Flat payload → FormData (when the main photo is uploaded or removed).
   Arrays/objects are JSON-encoded for the Laravel controller, booleans
   become "1"/"0", and updates use _method=PUT spoofing. */
export function buildFormData(
  payload: Record<string, unknown>,
  photoFile: File | null,
  photoRemove: boolean,
  isNew: boolean,
): FormData {
  const fd = new FormData()
  if (!isNew) fd.append('_method', 'PUT')
  for (const [key, raw] of Object.entries(payload)) {
    if (raw === null || raw === undefined) continue
    if (Array.isArray(raw) || (typeof raw === 'object' && !(raw instanceof File))) {
      fd.append(key, JSON.stringify(raw))
    } else if (typeof raw === 'boolean') {
      fd.append(key, raw ? '1' : '0')
    } else {
      fd.append(key, String(raw))
    }
  }
  if (photoFile) fd.append('photo', photoFile)
  if (photoRemove) fd.append('photo_remove', '1')
  return fd
}
