export type ContactReason = 'joueur' | 'club' | 'medias' | 'autre'

export type PlayerLevel = 'youth' | 'amateur' | 'semi_pro' | 'pro'
export type PlayerIntent = 'join' | 'renew' | 'advice' | 'other'
export type ClubRole = 'coach' | 'sporting_director' | 'scout' | 'president' | 'other'
export type ClubInterest = 'player' | 'profile' | 'partnership' | 'other'
export type MediaRole = 'journalist' | 'editor' | 'producer' | 'other'
export type MediaPurpose = 'interview_player' | 'article' | 'documentary' | 'other'

/**
 * Payload keys are stored inside a JSON blob server-side but kept typed here
 * so the wizard steps get proper autocomplete. Only the fields relevant to
 * the picked audience are actually filled - the rest stay empty strings.
 */
export interface ContactPayload {
  // joueur
  intent?: PlayerIntent
  player_name?: string
  date_of_birth?: string
  position?: string
  current_club?: string
  level?: PlayerLevel
  video_url?: string
  objective?: string
  // club
  club_name?: string
  role?: ClubRole | MediaRole
  interest?: ClubInterest
  player_id?: number | null
  needed_position?: string
  age_min?: number | null
  age_max?: number | null
  budget?: string
  // medias
  media_name?: string
  purpose?: MediaPurpose
  deadline?: string
  // autre
  subject?: string
}

export interface ContactForm {
  reason: ContactReason
  name: string
  email: string
  phone: string
  message: string
  consent: boolean
  payload: ContactPayload
  cv?: File | null
}

export type ContactErrors = Record<string, string>

export type ContactStatus = 'success' | 'error' | 'throttled' | null
