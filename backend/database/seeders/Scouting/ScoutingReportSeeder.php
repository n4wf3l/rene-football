<?php

namespace Database\Seeders\Scouting;

use App\Models\Player;
use App\Models\Scouting\FootballMatch;
use App\Models\Scouting\ReportScore;
use App\Models\Scouting\ScoutingReport;
use App\Models\Scouting\ScoutingReportTransition;
use App\Models\User;
use App\Services\Scouting\ScoutingRoutingService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ScoutingReportSeeder extends Seeder
{
    public function run(): void
    {
        $scout = User::where('email', 'scout@rene-football.test')->first();
        $chef  = User::where('email', 'chef@rene-football.test')->first();
        $jeunes = User::where('email', 'jeunes@rene-football.test')->first();
        $scoutId = $scout?->id;
        $routing = app(ScoutingRoutingService::class);

        $matches = FootballMatch::all()->keyBy(fn ($m) => $m->slug);

        $reports = [
            [
                'player' => 'karim-toure',
                'match'  => $matches->keys()->first(),
                'observed_position' => 'Attaquant axial',
                'minutes_observed' => 87,
                'context' => 'live',
                'tactical_role' => 'Pivot — point d\'appui',
                'strengths' => 'Jeu dos au but, finition pied gauche, lecture des espaces dans le dernier tiers.',
                'weaknesses' => 'Repli défensif sur les transitions adverses.',
                'global_rating' => 8.0,
                'current_level' => 7.8,
                'potential_level' => 9.0,
                'recommendation' => 'shortlist_a',
                'next_action' => 'Rendez-vous agent pour cadrer salaire',
                'status' => 'validated',
                'submitted_at' => Carbon::now()->subDays(2),
                'validated_at' => Carbon::now()->subDays(1),
                'validated_by' => $chef?->id,
                'scores' => [
                    ['category' => 'offensif', 'criterion' => 'Finition', 'score' => 9],
                    ['category' => 'offensif', 'criterion' => 'Jeu dos au but', 'score' => 9],
                    ['category' => 'tactique', 'criterion' => 'Mouvement sans ballon', 'score' => 8],
                    ['category' => 'defensif', 'criterion' => 'Pressing avant', 'score' => 7],
                ],
            ],
            [
                'player' => 'idriss-ndiaye',
                'match'  => 'fc-twente-vs-az-alkmaar-' . optional($matches->where('home_team', 'FC Twente')->first()?->kickoff_at)->format('Y-m-d'),
                'observed_position' => 'Avant-centre',
                'minutes_observed' => 75,
                'context' => 'video',
                'tactical_role' => 'Point d\'appui + appel profondeur',
                'strengths' => 'Finition rapide, mentalité gagnante, joue beaucoup en une touche.',
                'weaknesses' => 'Premier contrôle sous pression à améliorer.',
                'global_rating' => 7.5,
                'current_level' => 7.4,
                'potential_level' => 8.6,
                'recommendation' => 'shortlist_a',
                'next_action' => 'Observation live à Twente + rendez-vous club',
                'status' => 'submitted',
                'submitted_at' => Carbon::now()->subDays(8),
                'scores' => [
                    ['category' => 'offensif', 'criterion' => 'Finition', 'score' => 8],
                    ['category' => 'tactique', 'criterion' => 'Sens de l\'appel', 'score' => 8],
                    ['category' => 'technique', 'criterion' => 'Premier contrôle', 'score' => 6],
                ],
            ],
            [
                'player' => 'yanis-lefevre',
                'match'  => null,
                'observed_position' => 'Milieu défensif',
                'minutes_observed' => 60,
                'context' => 'video',
                'tactical_role' => 'Sentinelle',
                'strengths' => 'Très propre techniquement, scan avant réception correct pour son âge.',
                'weaknesses' => 'Manque encore d\'intensité dans les duels.',
                'global_rating' => 6.5,
                'current_level' => 6.0,
                'potential_level' => 8.2,
                'recommendation' => 'watchlist',
                'next_action' => 'Observer en U21 + 2e rapport scout indépendant',
                'status' => 'draft',
                'scores' => [
                    ['category' => 'technique', 'criterion' => 'Passe sous pression', 'score' => 7],
                    ['category' => 'mental', 'criterion' => 'Calme', 'score' => 7],
                    ['category' => 'physique', 'criterion' => 'Duel aérien', 'score' => 5],
                ],
            ],
            [
                'player' => 'hamzath-mohamadou',
                'match'  => null,
                'observed_position' => 'Ailier gauche',
                'minutes_observed' => 90,
                'context' => 'live',
                'tactical_role' => 'Ailier inversé pied droit',
                'strengths' => 'Très haut potentiel — explosivité, dribble en 1v1.',
                'weaknesses' => 'Choix sous pression, mental encore jeune.',
                'global_rating' => 7.2,
                'current_level' => 6.5,
                'potential_level' => 9.4,
                'recommendation' => 'shortlist_a',
                'next_action' => 'Observation U19 internationale + rapport mental',
                'status' => 'submitted',
                'submitted_at' => Carbon::now()->subDay(),
                'scores' => [
                    ['category' => 'physique', 'criterion' => 'Accélération', 'score' => 9],
                    ['category' => 'offensif', 'criterion' => '1v1 offensif', 'score' => 9],
                    ['category' => 'mental', 'criterion' => 'Réaction après erreur', 'score' => 6],
                ],
            ],
            [
                'player' => 'nabil-sangare',
                'match'  => null,
                'observed_position' => 'Ailier droit',
                'minutes_observed' => 70,
                'context' => 'live',
                'tactical_role' => 'Ailier inversé',
                'strengths' => 'Coup de patte gauche, rentre dans l\'axe, créateur d\'occasions.',
                'weaknesses' => 'Repli défensif moyen.',
                'global_rating' => 7.8,
                'current_level' => 7.6,
                'potential_level' => 8.8,
                'recommendation' => 'shortlist_a',
                'next_action' => 'Confirmer disponibilité été 2026',
                'status' => 'validated',
                'submitted_at' => Carbon::now()->subDays(7),
                'validated_at' => Carbon::now()->subDays(5),
                'validated_by' => $chef?->id,
            ],
            [
                'player' => 'adil-berkane',
                'match'  => null,
                'observed_position' => 'Milieu défensif',
                'minutes_observed' => 90,
                'context' => 'live',
                'tactical_role' => 'Sentinelle relayeuse',
                'strengths' => 'Lecture du jeu, premier rideau défensif solide.',
                'weaknesses' => 'Vitesse transition.',
                'global_rating' => 7.0,
                'current_level' => 7.0,
                'potential_level' => 7.6,
                'recommendation' => 'shortlist_b',
                'next_action' => 'Compléter 2e rapport scout + vidéo complète',
                'status' => 'needs_changes',
                'submitted_at' => Carbon::now()->subDays(4),
            ],
        ];

        foreach ($reports as $r) {
            $player = Player::where('slug', $r['player'])->first();
            if (! $player) continue;

            $matchId = null;
            if (! empty($r['match'])) {
                $matchId = optional($matches->get($r['match']))->id;
            }

            $scoresPayload = $r['scores'] ?? [];
            unset($r['scores'], $r['player'], $r['match']);

            $status = $r['status'] ?? 'draft';

            // Determine submitted_to (target inbox) based on current state.
            $submittedTo = null;
            if (in_array($status, ['submitted', 'needs_changes'], true)) {
                // For submitted/needs_changes, the report is "waiting on someone".
                // Use the routing service so each demo report lands in the correct inbox.
                $submittedTo = $r['validated_by'] ?? $routing->pickValidatorIdFor($player);
                // For needs_changes, the recipient is actually the scout (who must fix).
                if ($status === 'needs_changes') {
                    $submittedTo = $scoutId;
                }
            }

            $report = ScoutingReport::create(array_merge($r, [
                'player_id'    => $player->id,
                'football_match_id' => $matchId,
                'scout_id'     => $scoutId,
                'submitted_to' => $submittedTo,
            ]));

            foreach ($scoresPayload as $row) {
                ReportScore::create(array_merge($row, ['scouting_report_id' => $report->id]));
            }

            // Seed a coherent transition history matching the final status.
            $createdAt = $report->created_at ?? now();
            ScoutingReportTransition::create([
                'scouting_report_id' => $report->id,
                'from_status'        => null,
                'to_status'          => 'draft',
                'from_user_id'       => $scoutId,
                'to_user_id'         => null,
                'comment'            => 'Brouillon initial',
                'created_at'         => $createdAt,
            ]);

            if (in_array($status, ['submitted', 'validated', 'needs_changes', 'archived'], true)) {
                $picked = $r['validated_by'] ?? $routing->pickValidatorIdFor($player);
                ScoutingReportTransition::create([
                    'scouting_report_id' => $report->id,
                    'from_status'        => 'draft',
                    'to_status'          => 'submitted',
                    'from_user_id'       => $scoutId,
                    'to_user_id'         => $picked,
                    'comment'            => 'Soumis pour validation — auto-routing par catégorie.',
                    'created_at'         => $r['submitted_at'] ?? $createdAt,
                ]);
            }
            if ($status === 'validated') {
                ScoutingReportTransition::create([
                    'scouting_report_id' => $report->id,
                    'from_status'        => 'submitted',
                    'to_status'          => 'validated',
                    'from_user_id'       => $r['validated_by'] ?? $chef?->id,
                    'to_user_id'         => null,
                    'comment'            => 'Rapport conforme — passage en shortlist A.',
                    'created_at'         => $r['validated_at'] ?? now(),
                ]);
            }
            if ($status === 'needs_changes') {
                ScoutingReportTransition::create([
                    'scouting_report_id' => $report->id,
                    'from_status'        => 'submitted',
                    'to_status'          => 'needs_changes',
                    'from_user_id'       => $chef?->id ?? $jeunes?->id,
                    'to_user_id'         => $scoutId,
                    'comment'            => 'Compléter avec un 2e rapport scout indépendant et la vidéo complète.',
                    'created_at'         => Carbon::now()->subDays(3),
                ]);
            }
        }
    }
}
