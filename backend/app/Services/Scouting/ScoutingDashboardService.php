<?php

namespace App\Services\Scouting;

use App\Models\Player;
use App\Models\Scouting\RecruitmentNeed;
use App\Models\Scouting\ScoutAssignment;
use App\Models\Scouting\ScoutingReport;
use App\Models\Scouting\Shortlist;
use App\Models\Scouting\ShortlistPlayer;
use Carbon\Carbon;

/**
 * Aggregator for the cockpit dashboard + intelligence alerts.
 *
 * Most KPIs are derived by simple counts. Heavier queries (top scorers,
 * priorities, alerts) live here so controllers stay thin.
 */
class ScoutingDashboardService
{
    public function snapshot(): array
    {
        $today = Carbon::today();

        $kpi = [
            'players_followed'      => Player::whereIn('scouting_status', ['watchlist', 'shortlist_b', 'shortlist_a', 'valide'])->count(),
            'players_priority'      => Player::where('scouting_status', 'shortlist_a')->count(),
            'reports_to_validate'   => ScoutingReport::where('status', 'submitted')->count(),
            'reports_incomplete'    => ScoutingReport::whereIn('status', ['draft', 'needs_changes'])->count(),
            'missions_today'        => ScoutAssignment::whereDate('due_date', $today)->whereIn('status', ['a_faire', 'en_cours'])->count(),
            'players_no_next_action'=> Player::whereIn('scouting_status', ['watchlist', 'shortlist_b', 'shortlist_a'])->whereNull('next_action')->count(),
            'files_incomplete'      => Player::whereIn('scouting_status', ['watchlist', 'shortlist_b', 'shortlist_a'])->where('completeness_pct', '<', 60)->count(),
            'shortlists_active'     => Shortlist::where('status', 'active')->count(),
            'needs_open'            => RecruitmentNeed::where('status', 'actif')->count(),
            'clips_to_process'      => 0, // hook for future video pipeline
        ];

        $priorities = $this->priorities();
        $topPlayers = $this->topPlayers();
        $recentReports = $this->recentReports();
        $alerts = $this->alerts();

        return [
            'kpi'           => $kpi,
            'priorities'    => $priorities,
            'top_players'   => $topPlayers,
            'recent_reports'=> $recentReports,
            'alerts'        => $alerts,
        ];
    }

    public function alerts(): array
    {
        // Score élevé + confiance faible
        $highScoreLowConfidence = Player::query()
            ->whereNotNull('score_global')
            ->where('score_global', '>=', 70)
            ->where('score_confidence', '<', 50)
            ->select('id', 'slug', 'name', 'position', 'photo_url', 'score_global', 'score_confidence')
            ->limit(8)->get();

        // Dossier incomplet sur joueurs suivis
        $incomplete = Player::query()
            ->whereIn('scouting_status', ['watchlist', 'shortlist_b', 'shortlist_a'])
            ->where('completeness_pct', '<', 50)
            ->select('id', 'slug', 'name', 'position', 'photo_url', 'completeness_pct', 'scouting_status')
            ->limit(8)->get();

        // Shortlist A sans validation senior
        $needsValidation = ShortlistPlayer::query()
            ->where('stage', 'shortlist_a')
            ->whereDoesntHave('player.scoutingReports', fn ($q) => $q->where('status', 'validated'))
            ->with(['player:id,slug,name,position,photo_url', 'shortlist:id,slug,name'])
            ->limit(8)->get();

        // Besoin actif sans assez de profils (moins de 3 shortlist_a/b lié)
        $lowCoverageNeeds = RecruitmentNeed::query()
            ->where('status', 'actif')
            ->get()
            ->filter(function (RecruitmentNeed $need) {
                $count = ShortlistPlayer::query()
                    ->whereHas('shortlist', fn ($q) => $q->where('recruitment_need_id', $need->id))
                    ->whereIn('stage', ['shortlist_a', 'shortlist_b'])
                    ->count();
                return $count < 3;
            })
            ->take(8)
            ->values()
            ->map(fn ($n) => ['id' => $n->id, 'slug' => $n->slug, 'title' => $n->title, 'position' => $n->position, 'priority' => $n->priority]);

        // Joueurs sans next_action
        $missingNextAction = Player::query()
            ->whereIn('scouting_status', ['watchlist', 'shortlist_b', 'shortlist_a'])
            ->whereNull('next_action')
            ->select('id', 'slug', 'name', 'position', 'photo_url', 'scouting_status')
            ->limit(8)->get();

        // Rapports en retard (submitted > 5 jours sans validation)
        $stalledReports = ScoutingReport::query()
            ->where('status', 'submitted')
            ->where('submitted_at', '<', Carbon::now()->subDays(5))
            ->with('player:id,slug,name,position,photo_url')
            ->orderBy('submitted_at')
            ->limit(8)->get();

        return [
            'high_score_low_confidence' => $highScoreLowConfidence,
            'incomplete_files'          => $incomplete,
            'shortlist_a_needs_validation' => $needsValidation,
            'low_coverage_needs'        => $lowCoverageNeeds,
            'missing_next_action'       => $missingNextAction,
            'stalled_reports'           => $stalledReports,
        ];
    }

    private function priorities(): array
    {
        return [
            'reports_to_validate' => ScoutingReport::query()
                ->where('status', 'submitted')
                ->with('player:id,slug,name,position,photo_url')
                ->orderBy('submitted_at')
                ->limit(5)->get(),
            'missions_today' => ScoutAssignment::query()
                ->whereDate('due_date', Carbon::today())
                ->whereIn('status', ['a_faire', 'en_cours'])
                ->with('match:id,slug,kickoff_at,home_team,away_team')
                ->limit(5)->get(),
            'incomplete_files' => Player::query()
                ->whereIn('scouting_status', ['shortlist_a', 'shortlist_b'])
                ->where('completeness_pct', '<', 60)
                ->select('id', 'slug', 'name', 'position', 'photo_url', 'completeness_pct', 'scouting_status')
                ->limit(5)->get(),
        ];
    }

    private function topPlayers()
    {
        return Player::query()
            ->whereIn('scouting_status', ['watchlist', 'shortlist_b', 'shortlist_a'])
            ->whereNotNull('score_global')
            ->orderByDesc('score_global')
            ->select('id', 'slug', 'name', 'position', 'club', 'photo_url',
                     'score_global', 'score_confidence', 'scouting_status', 'next_action')
            ->limit(8)
            ->get();
    }

    private function recentReports()
    {
        return ScoutingReport::query()
            ->with(['player:id,slug,name,position,photo_url', 'match:id,slug,kickoff_at,home_team,away_team', 'scout:id,name'])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();
    }
}
