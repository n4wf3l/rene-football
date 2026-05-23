<?php

namespace Database\Seeders\Scouting;

use App\Models\Player;
use App\Services\Scouting\PlayerCompletenessService;
use App\Services\Scouting\ScoutingScoreService;
use Illuminate\Database\Seeder;

/**
 * Apply scouting status / scores / next-action defaults to the 13 demo
 * players seeded by PlayerSeeder. The fields are deterministic per slug so
 * re-running gives the same state and the dashboard always has something to
 * show.
 */
class ScoutingPlayerPatchSeeder extends Seeder
{
    public function run(): void
    {
        $patches = [
            'mehdi-boukar'    => ['scouting_status' => 'shortlist_a', 'score_current' => 78, 'score_potential' => 86, 'score_club_fit' => 82, 'score_market' => 68, 'score_risk' => 22, 'score_confidence' => 74, 'next_action' => 'Validation senior + observation live au prochain match', 'source_label' => 'Réseau scout interne', 'reliability_score' => 80, 'scout_summary' => 'Profil polyvalent capable d\'évoluer en milieu offensif ou meneur. Profil club-fit élevé.'],
            'ativie-megogo'   => ['scouting_status' => 'shortlist_b', 'score_current' => 68, 'score_potential' => 88, 'score_club_fit' => 76, 'score_market' => 64, 'score_risk' => 26, 'score_confidence' => 64, 'next_action' => 'Compléter 2e rapport scout + observation U21 Bundesliga', 'source_label' => 'Borussia Mönchengladbach - centre de formation', 'reliability_score' => 72, 'scout_summary' => 'Défenseur central trilingue (EN/FR/ES) prêté par Genk au Borussia. Lecture du jeu et duels solides pour un U17.'],
            'theo-vasseur'    => ['scouting_status' => 'valide',       'score_current' => 82, 'score_potential' => 84, 'score_club_fit' => 80, 'score_market' => 70, 'score_risk' => 18, 'score_confidence' => 88, 'next_action' => 'Approche officielle du club fin de saison', 'source_label' => 'Mandat agence', 'reliability_score' => 95],
            'karim-toure'     => ['scouting_status' => 'shortlist_a', 'score_current' => 86, 'score_potential' => 92, 'score_club_fit' => 78, 'score_market' => 72, 'score_risk' => 24, 'score_confidence' => 78, 'next_action' => 'Rendez-vous agent pour cadrer salaire', 'source_label' => 'Borussia Dortmund - agent', 'reliability_score' => 86],
            'abakar-abba'     => ['scouting_status' => 'watchlist',    'score_current' => 64, 'score_potential' => 84, 'score_club_fit' => 74, 'score_market' => 56, 'score_risk' => 32, 'score_confidence' => 54, 'next_action' => 'Observer en U21 Pro League + 2e rapport scout', 'source_label' => 'Standard de Liège - centre de formation', 'reliability_score' => 64],
            'ousmane-camara'  => ['scouting_status' => 'shortlist_b', 'score_current' => 72, 'score_potential' => 86, 'score_club_fit' => 76, 'score_market' => 64, 'score_risk' => 28, 'score_confidence' => 64, 'next_action' => 'Confirmer données médicales (entorse 09/2025)', 'source_label' => 'Royal Antwerp - staff médical', 'reliability_score' => 72],
            'lucas-marini'    => ['scouting_status' => 'valide',       'score_current' => 76, 'score_potential' => 78, 'score_club_fit' => 78, 'score_market' => 66, 'score_risk' => 18, 'score_confidence' => 84, 'next_action' => 'Proposer prolongation 2 ans', 'source_label' => 'AS Monaco - direction sportive', 'reliability_score' => 90],
            'idriss-ndiaye'   => ['scouting_status' => 'shortlist_a', 'score_current' => 84, 'score_potential' => 88, 'score_club_fit' => 80, 'score_market' => 76, 'score_risk' => 26, 'score_confidence' => 76, 'next_action' => 'Observation live à Twente + rendez-vous club', 'source_label' => 'FC Twente - contact direct', 'reliability_score' => 80],
            'batomi-zoran-mawel' => ['scouting_status' => 'decouvert', 'score_current' => 50, 'score_potential' => 94, 'score_club_fit' => 70, 'score_market' => 50, 'score_risk' => 22, 'score_confidence' => 42, 'next_action' => 'Suivi long terme U9 - 2-3 saisons avant projection', 'source_label' => 'RSCA - académie U9', 'reliability_score' => 58, 'scout_summary' => 'Profil offensif U9 belge à l\'académie d\'Anderlecht. Très jeune (8 ans) - projet très long terme, observation pédagogique.'],
            'camara-philan'   => ['scouting_status' => 'decouvert',   'score_current' => 55, 'score_potential' => 92, 'score_club_fit' => 72, 'score_market' => 50, 'score_risk' => 22, 'score_confidence' => 48, 'next_action' => 'Suivi rapproché en U13 + 2e observation match', 'source_label' => 'KRC Genk - académie U13', 'reliability_score' => 60, 'scout_summary' => 'Profil offensif U13 belge en académie Genk. Très jeune (11 ans) - à suivre sur 2-3 saisons avant projection sérieuse.'],
            'tesfegabir-solomon' => ['scouting_status' => 'watchlist', 'score_current' => 64, 'score_potential' => 88, 'score_club_fit' => 72, 'score_market' => 60, 'score_risk' => 32, 'score_confidence' => 54, 'next_action' => 'Observation live BGL Ligue + entretien projet sportif', 'source_label' => 'F91 Dudelange - feuille de match BGL Ligue', 'reliability_score' => 62, 'scout_summary' => 'Attaquant U19 érythréen au F91 Dudelange. Profil offensif droitier à observer sur 2024-2025, passeport extra-UE à arbitrer.'],
            'nabil-sangare'   => ['scouting_status' => 'shortlist_a', 'score_current' => 80, 'score_potential' => 88, 'score_club_fit' => 76, 'score_market' => 70, 'score_risk' => 28, 'score_confidence' => 72, 'next_action' => 'Confirmer disponibilité été 2026', 'source_label' => 'FC Bâle - agent', 'reliability_score' => 78],
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
