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

        // Rapports scouts pour le roster Rene Football. Les anciens rapports
        // sur les demo pros (karim-toure / idriss-ndiaye / nabil-sangare) ont
        // été retirés en même temps que leurs fiches.
        $reports = [
            [
                'player' => 'abakar-abba',
                'match'  => null,
                'observed_position' => 'Milieu défensif',
                'minutes_observed' => 72,
                'context' => 'live',
                'tactical_role' => 'Sentinelle dans un 4-2-3-1',
                'strengths' => 'Lecture du jeu et scan avant réception, propreté technique sous pression, profil sentinelle moderne.',
                'weaknesses' => 'Intensité dans les duels au sol, agressivité défensive à structurer.',
                'global_rating' => 6.8,
                'current_level' => 6.4,
                'potential_level' => 8.4,
                'recommendation' => 'watchlist',
                'next_action' => 'Observer en U21 Pro League + 2e rapport scout indépendant',
                'status' => 'draft',
                'scores' => [
                    ['category' => 'technique', 'criterion' => 'Passe sous pression', 'score' => 7],
                    ['category' => 'mental', 'criterion' => 'Calme', 'score' => 7],
                    ['category' => 'physique', 'criterion' => 'Duel aérien', 'score' => 5],
                ],
            ],
            [
                'player' => 'adams-saeed',
                'match'  => null,
                'observed_position' => 'Ailier droit',
                'minutes_observed' => 88,
                'context' => 'live',
                'tactical_role' => 'Ailier inversé pied droit, repique en pointe',
                'strengths' => 'Explosivité, finition pied droit et pied gauche, polyvalence striker / ailes - profil européen rare en U18.',
                'weaknesses' => 'Choix sous pression dans les 30 derniers mètres, repli défensif à structurer.',
                'global_rating' => 7.4,
                'current_level' => 6.8,
                'potential_level' => 9.3,
                'recommendation' => 'shortlist_a',
                'next_action' => 'Observation U21 vs Club Brugge + entretien famille',
                'status' => 'submitted',
                'submitted_at' => Carbon::now()->subDay(),
                'scores' => [
                    ['category' => 'physique', 'criterion' => 'Accélération', 'score' => 9],
                    ['category' => 'offensif', 'criterion' => '1v1 offensif', 'score' => 9],
                    ['category' => 'mental', 'criterion' => 'Réaction après erreur', 'score' => 6],
                ],
            ],
            [
                'player' => 'ativie-megogo',
                'match'  => null,
                'observed_position' => 'Défenseur central droit',
                'minutes_observed' => 90,
                'context' => 'live',
                'tactical_role' => 'Défenseur axial droit dans une charnière à 4',
                'strengths' => 'Lecture du jeu pour son âge, duels aériens, relance pied droit propre. Trilingue (EN/FR/ES) - atout pour vestiaire international.',
                'weaknesses' => 'Vitesse en transition défense → milieu, gestion du marquage individuel.',
                'global_rating' => 7.0,
                'current_level' => 6.8,
                'potential_level' => 8.8,
                'recommendation' => 'shortlist_b',
                'next_action' => 'Compléter 2e rapport scout + observation U21 Bundesliga',
                'status' => 'needs_changes',
                'submitted_at' => Carbon::now()->subDays(4),
            ],
            [
                'player' => 'hamzath-mohamadou',
                'match'  => null,
                'observed_position' => 'Ailier gauche',
                'minutes_observed' => 80,
                'context' => 'live',
                'tactical_role' => 'Ailier gauche inversé pied droit - repique dans l\'axe',
                'strengths' => 'Capacité 1v1 hors-norme, explosivité top niveau, dribble en mouvement, imprévisibilité dans les choix offensifs. Profil comparable à Dembélé / Barcola.',
                'weaknesses' => 'Structuration défensive et discipline de poste à construire, encore très jeune (15 ans) - exposition médiatique à gérer.',
                'global_rating' => 8.5,
                'current_level' => 7.2,
                'potential_level' => 9.7,
                'recommendation' => 'shortlist_a',
                'next_action' => 'Suivi rapproché U-17 + entretien représentation long terme',
                'status' => 'validated',
                'submitted_at' => Carbon::now()->subDays(3),
                'validated_at' => Carbon::now()->subDays(1),
                'validated_by' => $jeunes?->id,
                'scores' => [
                    ['category' => 'offensif',  'criterion' => '1v1 offensif',         'score' => 10],
                    ['category' => 'physique',  'criterion' => 'Explosivité',          'score' => 10],
                    ['category' => 'technique', 'criterion' => 'Dribble en mouvement', 'score' => 9],
                    ['category' => 'mental',    'criterion' => 'Imprévisibilité',      'score' => 9],
                    ['category' => 'defensif',  'criterion' => 'Repli défensif',       'score' => 5],
                ],
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
                    'comment'            => 'Soumis pour validation - auto-routing par catégorie.',
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
                    'comment'            => 'Rapport conforme - passage en shortlist A.',
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
