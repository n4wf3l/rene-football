<?php

namespace Database\Seeders\Scouting;

use App\Models\Player;
use App\Services\Scouting\PlayerCompletenessService;
use App\Services\Scouting\ScoutingScoreService;
use Illuminate\Database\Seeder;

/**
 * Apply scouting status / scores / next-action defaults to the Rene Football
 * real roster. The fields are deterministic per slug so re-running gives the
 * same state and the dashboard always has something to show.
 *
 * Slugs that were here for demo pros (mehdi-boukar, theo-vasseur, karim-toure,
 * ousmane-camara, lucas-marini, idriss-ndiaye, nabil-sangare) have been removed
 * along with their player rows — see PlayerSeeder::OBSOLETE_SLUGS.
 */
class ScoutingPlayerPatchSeeder extends Seeder
{
    public function run(): void
    {
        $patches = [
            'ativie-megogo'   => ['scouting_status' => 'shortlist_b', 'score_current' => 68, 'score_potential' => 88, 'score_club_fit' => 76, 'score_market' => 64, 'score_risk' => 26, 'score_confidence' => 64, 'next_action' => 'Compléter 2e rapport scout + observation U21 Bundesliga', 'source_label' => 'Borussia Mönchengladbach - centre de formation', 'reliability_score' => 72, 'scout_summary' => 'Défenseur central trilingue (EN/FR/ES) prêté par Genk au Borussia. Lecture du jeu et duels solides pour un U17.'],
            'abakar-abba'     => ['scouting_status' => 'watchlist',    'score_current' => 64, 'score_potential' => 84, 'score_club_fit' => 74, 'score_market' => 56, 'score_risk' => 32, 'score_confidence' => 54, 'next_action' => 'Observer en U21 Pro League + 2e rapport scout', 'source_label' => 'Standard de Liège - centre de formation', 'reliability_score' => 64],
            'batomi-zoran-mawel' => ['scouting_status' => 'decouvert', 'score_current' => 50, 'score_potential' => 94, 'score_club_fit' => 70, 'score_market' => 50, 'score_risk' => 22, 'score_confidence' => 42, 'next_action' => 'Suivi long terme U9 - 2-3 saisons avant projection', 'source_label' => 'RSCA - académie U9', 'reliability_score' => 58, 'scout_summary' => 'Profil offensif U9 belge à l\'académie d\'Anderlecht. Très jeune (8 ans) - projet très long terme, observation pédagogique.'],
            'camara-philan'   => ['scouting_status' => 'decouvert',   'score_current' => 55, 'score_potential' => 92, 'score_club_fit' => 72, 'score_market' => 50, 'score_risk' => 22, 'score_confidence' => 48, 'next_action' => 'Suivi rapproché en U13 + 2e observation match', 'source_label' => 'KRC Genk - académie U13', 'reliability_score' => 60, 'scout_summary' => 'Profil offensif U13 belge en académie Genk. Très jeune (11 ans) - à suivre sur 2-3 saisons avant projection sérieuse.'],
            'tesfegabir-solomon' => ['scouting_status' => 'watchlist', 'score_current' => 64, 'score_potential' => 88, 'score_club_fit' => 72, 'score_market' => 60, 'score_risk' => 32, 'score_confidence' => 54, 'next_action' => 'Observation live BGL Ligue + entretien projet sportif', 'source_label' => 'F91 Dudelange - feuille de match BGL Ligue', 'reliability_score' => 62, 'scout_summary' => 'Attaquant U19 érythréen au F91 Dudelange. Profil offensif droitier à observer sur 2024-2025, passeport extra-UE à arbitrer.'],
            'adams-saeed'     => ['scouting_status' => 'shortlist_a', 'score_current' => 74, 'score_potential' => 94, 'score_club_fit' => 82, 'score_market' => 64, 'score_risk' => 26, 'score_confidence' => 66, 'next_action' => 'Observation U21 contre Club Brugge + entretien famille', 'source_label' => 'KV Mechelen - centre de formation', 'reliability_score' => 70],
        ];

        $scoreService = app(ScoutingScoreService::class);
        $completeness = app(PlayerCompletenessService::class);

        foreach ($patches as $slug => $fields) {
            $player = Player::where('slug', $slug)->first();
            if (! $player) continue;
            $player->fill($fields);
            $player->save();
            $scoreService->refresh($player);
            $check = $completeness->checklist($player);
            $player->completeness_pct = $check['percent'];
            $player->saveQuietly();
        }
    }
}
