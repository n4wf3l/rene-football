import type { Player } from '../player'

export type ScoutingStatus =
  | 'decouvert' | 'watchlist' | 'shortlist_b' | 'shortlist_a' | 'valide' | 'rejete' | 'archive'

export type ReportStatus = 'draft' | 'submitted' | 'needs_changes' | 'validated' | 'archived'

export type ReportRecommendation =
  | 'ne_pas_poursuivre' | 'a_revoir' | 'watchlist' | 'shortlist_b' | 'shortlist_a' | 'recruter'

export type ReportCategory = 'technique' | 'tactique' | 'physique' | 'mental' | 'offensif' | 'defensif'

export type MissionStatus = 'a_faire' | 'en_cours' | 'rapport_soumis' | 'a_completer' | 'valide'
export type MissionPriority = 'basse' | 'moyenne' | 'haute' | 'urgente'

export type ShortlistStage = 'watchlist' | 'shortlist_b' | 'shortlist_a' | 'valide' | 'rejete'
export type ShortlistStatus = 'active' | 'closed' | 'archived'

export type NeedStatus = 'actif' | 'en_pause' | 'cloture'
export type NeedPriority = MissionPriority

export type MatchCategory = 'Pro' | 'U23' | 'U19' | 'U18' | 'U16'
export type MatchStatus = 'scheduled' | 'live' | 'played' | 'postponed' | 'cancelled'

export type RiskType = 'sportif' | 'physique' | 'mental' | 'adaptation' | 'marche' | 'entourage' | 'blessure'
export type RiskStatus = 'ouvert' | 'surveille' | 'resolu'
export type RiskLevel = 'faible' | 'moyen' | 'eleve'
export type RiskProbability = 'faible' | 'moyenne' | 'elevee'

export interface ScoutingPlayer extends Player {
  scouting_status: ScoutingStatus
  score_current: number | null
  score_potential: number | null
  score_club_fit: number | null
  score_market: number | null
  score_risk: number | null
  score_confidence: number | null
  score_global: number | null
  completeness_pct: number | null
  next_action: string | null
  scout_summary: string | null
  source_label: string | null
  reliability_score: number | null
}

export interface FootballMatch {
  id: number
  slug: string
  kickoff_at: string
  competition: string
  season: string | null
  home_team: string
  away_team: string
  category: MatchCategory
  venue: string | null
  score_home: number | null
  score_away: number | null
  notes: string | null
  status: MatchStatus
  created_by: number | null
}

export interface ReportScore {
  id?: number
  category: ReportCategory
  criterion: string
  score: number
  comment?: string | null
}

export interface ScoutingReport {
  id: number
  player_id: number
  football_match_id: number | null
  scout_id: number | null
  observed_position: string | null
  minutes_observed: number | null
  context: string | null
  tactical_role: string | null
  strengths: string | null
  weaknesses: string | null
  key_actions: Array<{ minute?: number | null; type?: string; note?: string }> | null
  global_rating: number | null
  current_level: number | null
  potential_level: number | null
  recommendation: ReportRecommendation | null
  next_action: string | null
  status: ReportStatus
  submitted_at: string | null
  validated_by: number | null
  validated_at: string | null
  created_at: string
  updated_at: string
  // relations
  player?: Pick<Player, 'id' | 'slug' | 'name' | 'position' | 'photo_url'>
  match?: Pick<FootballMatch, 'id' | 'slug' | 'kickoff_at' | 'home_team' | 'away_team'> | null
  scout?: { id: number; name: string } | null
  validator?: { id: number; name: string } | null
  /** Same column as the FK - Laravel replaces the integer with the user object
   *  when the relation is eager-loaded. Handle both shapes in the consumer. */
  submitted_to?: number | { id: number; name: string } | null
  scores?: ReportScore[]
  /** Append-only audit trail - populated on `show()`. */
  transitions?: ScoutingReportTransition[]
}

export interface ScoutingReportTransition {
  id: number
  scouting_report_id: number
  from_status: string | null
  to_status: string
  from_user_id: number | null
  to_user_id: number | null
  comment: string | null
  created_at: string
  /** Laravel serialises the relation in snake_case by default. */
  from_user?: { id: number; name: string } | null
  to_user?: { id: number; name: string } | null
}

/** Compact user row returned by /admin/scouting/inbox.validators - used in
 *  the recipient picker when the scout overrides auto-routing. */
export interface ScoutingValidator {
  id: number
  name: string
  email: string
  is_admin: boolean
  is_head_of_scouting: boolean
  scouting_scope: string[] | null
}

export interface ScoutingInbox {
  user_id: number | null
  to_validate: number
  my_reports_needing_changes: number
  waiting_validation_global: number
  validators: ScoutingValidator[]
}

export interface ScoutAssignment {
  id: number
  title: string
  football_match_id: number | null
  assigned_to: number | null
  assigned_by: number | null
  priority: MissionPriority
  objective: string | null
  players_to_watch: number[] | null
  due_date: string | null
  status: MissionStatus
  checklist: Array<{ key: string; label: string; done: boolean }> | null
  match?: Pick<FootballMatch, 'id' | 'slug' | 'kickoff_at' | 'home_team' | 'away_team' | 'competition'> | null
  assignee?: { id: number; name: string } | null
}

export interface Shortlist {
  id: number
  slug: string
  name: string
  recruitment_need_id: number | null
  description: string | null
  season: string | null
  status: ShortlistStatus
  entries_count?: number
  need?: { id: number; slug: string; title: string; position: string; priority: NeedPriority } | null
  players?: Array<ScoutingPlayer & {
    pivot: {
      id: number; rank: number; stage: ShortlistStage; reason: string | null;
      next_action: string | null; estimated_price: number | null;
      risk_level: RiskLevel | null; confidence_score: number | null;
    }
  }>
}

export interface ShortlistEntry {
  id: number
  shortlist_id: number
  player_id: number
  rank: number
  stage: ShortlistStage
  reason: string | null
  next_action: string | null
  estimated_price: number | null
  risk_level: RiskLevel | null
  confidence_score: number | null
  player?: Pick<Player, 'id' | 'slug' | 'name' | 'position' | 'photo_url'>
}

export interface RecruitmentNeed {
  id: number
  slug: string
  title: string
  position: string
  priority: NeedPriority
  season: string | null
  category: MatchCategory
  budget_min: number | null
  budget_max: number | null
  age_min: number | null
  age_max: number | null
  preferred_foot: string | null
  profile_description: string | null
  required_attributes: Array<{ key: string; label: string; weight: number }> | null
  status: NeedStatus
  deadline: string | null
}

export interface PlayerRisk {
  id: number
  player_id: number
  risk_type: RiskType
  title: string
  description: string | null
  probability: RiskProbability
  impact: RiskLevel
  mitigation_plan: string | null
  status: RiskStatus
  created_at: string
}

export interface PlayerSource {
  id: number
  player_id: number
  field_name: string
  value: string | null
  source_type: string
  source_label: string | null
  reliability_score: number | null
  created_at: string
}

export interface PlayerAlias {
  id: number
  player_id: number
  alias: string
  source_type: string | null
}

export interface PlayerStatusHistory {
  id: number
  player_id: number
  old_status: ScoutingStatus | null
  new_status: ScoutingStatus
  reason: string | null
  changed_by: number | null
  created_at: string
  author?: { id: number; name: string } | null
}

export interface ScoutingDashboardKpi {
  players_followed: number
  players_priority: number
  reports_to_validate: number
  reports_incomplete: number
  missions_today: number
  players_no_next_action: number
  files_incomplete: number
  shortlists_active: number
  needs_open: number
  clips_to_process: number
}

export interface ScoutingDashboardSnapshot {
  kpi: ScoutingDashboardKpi
  priorities: {
    reports_to_validate: ScoutingReport[]
    missions_today: ScoutAssignment[]
    incomplete_files: ScoutingPlayer[]
  }
  top_players: ScoutingPlayer[]
  recent_reports: ScoutingReport[]
  alerts: ScoutingAlerts
}

export interface ScoutingAlerts {
  high_score_low_confidence: ScoutingPlayer[]
  incomplete_files: ScoutingPlayer[]
  shortlist_a_needs_validation: ShortlistEntry[]
  low_coverage_needs: RecruitmentNeed[]
  missing_next_action: ScoutingPlayer[]
  stalled_reports: ScoutingReport[]
}

export interface CompletenessChecklistItem {
  key: string
  label: string
  done: boolean
}

export interface ScoutingPlayerDetail {
  data: ScoutingPlayer & {
    scouting_reports?: ScoutingReport[]
    risks?: PlayerRisk[]
    aliases?: PlayerAlias[]
    sources?: PlayerSource[]
    status_history?: PlayerStatusHistory[]
    clips?: unknown[]
    appearances?: unknown[]
    shortlist_entries?: ShortlistEntry[]
  }
  checklist: CompletenessChecklistItem[]
  completeness_pct: number
  missing: string[]
  shortlist_a_gate: { ok: boolean; reasons: string[] }
}

/* ----- UI presentation maps ----- */

export const STATUS_LABEL: Record<ScoutingStatus, string> = {
  decouvert: 'Découvert',
  watchlist: 'Watchlist',
  shortlist_b: 'Shortlist B',
  shortlist_a: 'Shortlist A',
  valide: 'Validé',
  rejete: 'Rejeté',
  archive: 'Archivé',
}

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  needs_changes: 'À corriger',
  validated: 'Validé',
  archived: 'Archivé',
}

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  rapport_soumis: 'Rapport soumis',
  a_completer: 'À compléter',
  valide: 'Validé',
}

export const STAGE_LABEL: Record<ShortlistStage, string> = {
  watchlist: 'Watchlist',
  shortlist_b: 'Shortlist B',
  shortlist_a: 'Shortlist A',
  valide: 'Validé',
  rejete: 'Rejeté',
}

export const PRIORITY_LABEL: Record<NeedPriority, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  urgente: 'Urgente',
}

export const REPORT_RECOMMENDATION_LABEL: Record<ReportRecommendation, string> = {
  ne_pas_poursuivre: 'Ne pas poursuivre',
  a_revoir: 'À revoir',
  watchlist: 'Watchlist',
  shortlist_b: 'Shortlist B',
  shortlist_a: 'Shortlist A',
  recruter: 'Recruter',
}

export const SCOUTING_VIEWS = [
  'dashboard', 'players', 'matches', 'reports', 'missions',
  'shortlists', 'needs', 'videos', 'intelligence',
  // Personal workspace ("boîte perso") - Option B. Isolated from
  // Rene's shared data; the scout uses it for their own external
  // client (FC X etc.).
  'perso',
] as const
export type ScoutingView = typeof SCOUTING_VIEWS[number]

/** Personal (per-scout) workspace payload. `name` is null by default; the
 *  UI substitutes the "Ma boîte perso" label. The scout can rename it to
 *  their external client's name at any time. */
export interface ScoutWorkspace {
  id: number
  owner_user_id: number
  name: string | null
  prospect_count: number
  created_at: string
  updated_at: string
}

/** One prospect tracked by a scout in their personal workspace. Deliberately
 *  a *different* shape from Player so the two datasets stay separate — a
 *  prospect never ends up in Rene's shared roster unless explicitly promoted. */
export interface ScoutProspect {
  id: number
  workspace_id: number
  name: string
  age: number | null
  position: string | null
  category: string | null
  club: string | null
  nationality: string | null
  preferred_foot: string | null
  height: string | null
  since: number | null
  photo_url: string | null
  notes: string | null
  strengths: string | null
  weaknesses: string | null
  rating: number | null
  potential_rating: number | null
  recommendation: string | null
  status: string | null
  next_action: string | null
  matches_played: number | null
  goals: number | null
  assists: number | null
  xg: number | null
  xa: number | null
  minutes_played: number | null
  created_at: string
  updated_at: string
}
