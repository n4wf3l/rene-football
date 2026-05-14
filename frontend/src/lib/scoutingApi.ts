import { api } from '../api/client'
import type {
  FootballMatch,
  RecruitmentNeed,
  ScoutAssignment,
  ScoutingDashboardSnapshot,
  ScoutingPlayer,
  ScoutingPlayerDetail,
  ScoutingReport,
  Shortlist,
  ShortlistEntry,
  ShortlistStage,
  MissionStatus,
} from '../types/scouting'

const auth = { auth: true } as const

export const scoutingApi = {
  dashboard: () => api.get<ScoutingDashboardSnapshot>('/admin/scouting/dashboard', auth),
  intelligence: () => api.get<{ alerts: ScoutingDashboardSnapshot['alerts'] }>('/admin/scouting/intelligence', auth),

  /* Players */
  listPlayers: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<{ data: ScoutingPlayer[] }>(`/admin/scouting/players${q}`, auth)
  },
  showPlayer: (slug: string) =>
    api.get<ScoutingPlayerDetail>(`/admin/scouting/players/${slug}`, auth),
  patchPlayer: (slug: string, body: Partial<ScoutingPlayer> & { change_reason?: string }) =>
    api.patch<ScoutingPlayerDetail>(`/admin/scouting/players/${slug}`, body, auth),
  refreshScores: (slug: string) =>
    api.post<ScoutingPlayerDetail>(`/admin/scouting/players/${slug}/refresh-scores`, null, auth),

  /* Matches */
  listMatches: () => api.get<{ data: FootballMatch[] }>('/admin/scouting/matches', auth),
  showMatch: (slug: string) => api.get<{ data: FootballMatch }>(`/admin/scouting/matches/${slug}`, auth),
  createMatch: (body: Partial<FootballMatch>) => api.post<{ data: FootballMatch }>('/admin/scouting/matches', body, auth),

  /* Reports */
  listReports: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<{ data: ScoutingReport[] }>(`/admin/scouting/reports${q}`, auth)
  },
  showReport: (id: number) => api.get<{ data: ScoutingReport }>(`/admin/scouting/reports/${id}`, auth),
  createReport: (body: Partial<ScoutingReport>) => api.post<{ data: ScoutingReport }>('/admin/scouting/reports', body, auth),
  updateReport: (id: number, body: Partial<ScoutingReport>) =>
    api.patch<{ data: ScoutingReport }>(`/admin/scouting/reports/${id}`, body, auth),
  submitReport: (id: number) => api.post<{ data: ScoutingReport }>(`/admin/scouting/reports/${id}/submit`, null, auth),
  validateReport: (id: number) => api.post<{ data: ScoutingReport }>(`/admin/scouting/reports/${id}/validate`, null, auth),
  requestChanges: (id: number) => api.post<{ data: ScoutingReport }>(`/admin/scouting/reports/${id}/request-changes`, null, auth),
  archiveReport: (id: number) => api.post<{ data: ScoutingReport }>(`/admin/scouting/reports/${id}/archive`, null, auth),
  deleteReport: (id: number) => api.delete<{ ok: boolean }>(`/admin/scouting/reports/${id}`, auth),

  /* Missions */
  listMissions: () => api.get<{ data: ScoutAssignment[] }>('/admin/scouting/missions', auth),
  showMission: (id: number) => api.get<{ data: ScoutAssignment }>(`/admin/scouting/missions/${id}`, auth),
  createMission: (body: Partial<ScoutAssignment>) => api.post<{ data: ScoutAssignment }>('/admin/scouting/missions', body, auth),
  updateMission: (id: number, body: Partial<ScoutAssignment>) =>
    api.patch<{ data: ScoutAssignment }>(`/admin/scouting/missions/${id}`, body, auth),
  setMissionStatus: (id: number, status: MissionStatus) =>
    api.patch<{ data: ScoutAssignment }>(`/admin/scouting/missions/${id}/status`, { status }, auth),
  deleteMission: (id: number) => api.delete<{ ok: boolean }>(`/admin/scouting/missions/${id}`, auth),

  /* Shortlists */
  listShortlists: () => api.get<{ data: Shortlist[] }>('/admin/scouting/shortlists', auth),
  showShortlist: (slug: string) => api.get<{ data: Shortlist }>(`/admin/scouting/shortlists/${slug}`, auth),
  createShortlist: (body: Partial<Shortlist>) => api.post<{ data: Shortlist }>('/admin/scouting/shortlists', body, auth),
  addShortlistPlayer: (slug: string, body: { player_id: number; stage?: ShortlistStage; reason?: string }) =>
    api.post<{ data: ShortlistEntry }>(`/admin/scouting/shortlists/${slug}/players`, body, auth),
  updateShortlistEntry: (slug: string, entryId: number, body: { stage?: ShortlistStage; rank?: number; reason?: string }) =>
    api.patch<{ data: ShortlistEntry }>(`/admin/scouting/shortlists/${slug}/players/${entryId}`, body, auth),
  removeShortlistEntry: (slug: string, entryId: number) =>
    api.delete<{ ok: boolean }>(`/admin/scouting/shortlists/${slug}/players/${entryId}`, auth),

  /* Needs */
  listNeeds: () => api.get<{ data: RecruitmentNeed[]; stats: Record<number, { players_count: number; shortlist_a: number; best_score: number | null }> }>(
    '/admin/scouting/needs', auth,
  ),
  showNeed: (slug: string) => api.get<{ data: RecruitmentNeed; shortlists: Shortlist[] }>(`/admin/scouting/needs/${slug}`, auth),
  createNeed: (body: Partial<RecruitmentNeed>) => api.post<{ data: RecruitmentNeed }>('/admin/scouting/needs', body, auth),
  updateNeed: (slug: string, body: Partial<RecruitmentNeed>) =>
    api.patch<{ data: RecruitmentNeed }>(`/admin/scouting/needs/${slug}`, body, auth),

  /* Risks (nested) */
  createRisk: (playerSlug: string, body: Record<string, unknown>) =>
    api.post(`/admin/scouting/players/${playerSlug}/risks`, body, auth),
  updateRisk: (playerSlug: string, riskId: number, body: Record<string, unknown>) =>
    api.patch(`/admin/scouting/players/${playerSlug}/risks/${riskId}`, body, auth),
  deleteRisk: (playerSlug: string, riskId: number) =>
    api.delete(`/admin/scouting/players/${playerSlug}/risks/${riskId}`, auth),

  /* Sources (nested) */
  createSource: (playerSlug: string, body: Record<string, unknown>) =>
    api.post(`/admin/scouting/players/${playerSlug}/sources`, body, auth),
  deleteSource: (playerSlug: string, sourceId: number) =>
    api.delete(`/admin/scouting/players/${playerSlug}/sources/${sourceId}`, auth),

  /* Aliases (nested) */
  createAlias: (playerSlug: string, body: { alias: string; source_type?: string }) =>
    api.post(`/admin/scouting/players/${playerSlug}/aliases`, body, auth),
  deleteAlias: (playerSlug: string, aliasId: number) =>
    api.delete(`/admin/scouting/players/${playerSlug}/aliases/${aliasId}`, auth),
}
