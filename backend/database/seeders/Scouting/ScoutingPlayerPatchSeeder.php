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
            'adil-berkane'    => ['scouting_status' => 'shortlist_b', 'score_current' => 70, 'score_potential' => 78, 'score_club_fit' => 72, 'score_market' => 62, 'score_risk' => 30, 'score_confidence' => 66, 'next_action' => 'Compléter 2e rapport scout + vidéo complète', 'source_label' => 'Standard Liège - contact direct', 'reliability_score' => 70, 'scout_summary' => 'Sentinelle moderne avec lecture du jeu. Manque encore de vitesse de transition.'],
            'theo-vasseur'    => ['scouting_status' => 'valide',       'score_current' => 82, 'score_potential' => 84, 'score_club_fit' => 80, 'score_market' => 70, 'score_risk' => 18, 'score_confidence' => 88, 'next_action' => 'Approche officielle du club fin de saison', 'source_label' => 'Mandat agence', 'reliability_score' => 95],
            'karim-toure'     => ['scouting_status' => 'shortlist_a', 'score_current' => 86, 'score_potential' => 92, 'score_club_fit' => 78, 'score_market' => 72, 'score_risk' => 24, 'score_confidence' => 78, 'next_action' => 'Rendez-vous agent pour cadrer salaire', 'source_label' => 'Borussia Dortmund - agent', 'reliability_score' => 86],
            'yanis-lefevre'   => ['scouting_status' => 'watchlist',    'score_current' => 60, 'score_potential' => 82, 'score_club_fit' => 70, 'score_market' => 50, 'score_risk' => 38, 'score_confidence' => 48, 'next_action' => 'Observer en U21 + 2e rapport scout indépendant', 'source_label' => 'Vidéo + un rapport scout', 'reliability_score' => 50],
            'ousmane-camara'  => ['scouting_status' => 'shortlist_b', 'score_current' => 72, 'score_potential' => 86, 'score_club_fit' => 76, 'score_market' => 64, 'score_risk' => 28, 'score_confidence' => 64, 'next_action' => 'Confirmer données médicales (entorse 09/2025)', 'source_label' => 'Royal Antwerp - staff médical', 'reliability_score' => 72],
            'lucas-marini'    => ['scouting_status' => 'valide',       'score_current' => 76, 'score_potential' => 78, 'score_club_fit' => 78, 'score_market' => 66, 'score_risk' => 18, 'score_confidence' => 84, 'next_action' => 'Proposer prolongation 2 ans', 'source_label' => 'AS Monaco - direction sportive', 'reliability_score' => 90],
            'idriss-ndiaye'   => ['scouting_status' => 'shortlist_a', 'score_current' => 84, 'score_potential' => 88, 'score_club_fit' => 80, 'score_market' => 76, 'score_risk' => 26, 'score_confidence' => 76, 'next_action' => 'Observation live à Twente + rendez-vous club', 'source_label' => 'FC Twente - contact direct', 'reliability_score' => 80],
            'romain-caillard' => ['scouting_status' => 'valide',       'score_current' => 80, 'score_potential' => 80, 'score_club_fit' => 70, 'score_market' => 64, 'score_risk' => 20, 'score_confidence' => 86, 'next_action' => 'Suivi contractuel - clause 2027 à activer', 'source_label' => 'KAS Eupen - agent', 'reliability_score' => 88],
            'ayoub-el-bahri'  => ['scouting_status' => 'shortlist_b', 'score_current' => 70, 'score_potential' => 86, 'score_club_fit' => 80, 'score_market' => 58, 'score_risk' => 32, 'score_confidence' => 62, 'next_action' => 'Compléter rapport tactique + risques contractuels', 'source_label' => 'RC Lens - scout senior', 'reliability_score' => 64],
            'hugo-tessier'    => ['scouting_status' => 'watchlist',    'score_current' => 66, 'score_potential' => 74, 'score_club_fit' => 68, 'score_market' => 60, 'score_risk' => 34, 'score_confidence' => 56, 'next_action' => 'Revoir live, deuxième scout requis', 'source_label' => 'Royale Union SG - feuille de match', 'reliability_score' => 60],
            'nabil-sangare'   => ['scouting_status' => 'shortlist_a', 'score_current' => 80, 'score_potential' => 88, 'score_club_fit' => 76, 'score_market' => 70, 'score_risk' => 28, 'score_confidence' => 72, 'next_action' => 'Confirmer disponibilité été 2026', 'source_label' => 'FC Bâle - agent', 'reliability_score' => 78],
            'hamzath-mohamadou' => ['scouting_status' => 'shortlist_a','score_current' => 72, 'score_potential' => 95, 'score_club_fit' => 84, 'score_market' => 60, 'score_risk' => 28, 'score_confidence' => 58, 'next_action' => 'Observation U19 internationale + rapport mental', 'source_label' => 'Borussia Dortmund - centre de formation', 'reliability_score' => 62],
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
