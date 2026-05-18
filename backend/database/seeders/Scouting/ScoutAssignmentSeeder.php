<?php

namespace Database\Seeders\Scouting;

use App\Models\Player;
use App\Models\Scouting\FootballMatch;
use App\Models\Scouting\ScoutAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ScoutAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('is_admin', true)->first();
        $scoutId = $admin?->id;

        $matches = FootballMatch::orderBy('kickoff_at')->get();
        $matchTwente = $matches->firstWhere('home_team', 'FC Twente');
        $matchDortmundU19 = $matches->firstWhere('category', 'U19');
        $matchGenk = $matches->firstWhere('home_team', 'KRC Genk');

        $missions = [
            [
                'title' => 'Observation live FC Twente - focus Idriss N\'Diaye',
                'football_match_id' => $matchTwente?->id,
                'assigned_to' => $scoutId, 'assigned_by' => $scoutId,
                'priority' => 'haute',
                'objective' => 'Confirmer le rapport vidéo en conditions live, focus sur le mouvement sans ballon.',
                'players_to_watch' => Player::where('slug', 'idriss-ndiaye')->pluck('id')->toArray(),
                'due_date' => Carbon::today()->addDays(2),
                'status' => 'a_faire',
                'checklist' => [
                    ['key' => 'match_created', 'label' => 'Match créé',     'done' => true],
                    ['key' => 'targets',       'label' => 'Joueurs cibles ajoutés', 'done' => true],
                    ['key' => 'report',        'label' => 'Rapport soumis', 'done' => false],
                    ['key' => 'clips',         'label' => 'Clips ajoutés',  'done' => false],
                    ['key' => 'senior_valid',  'label' => 'Validation senior', 'done' => false],
                ],
            ],
            [
                'title' => 'Mission U19 - observer Hamzath Mohamadou',
                'football_match_id' => $matchDortmundU19?->id,
                'assigned_to' => $scoutId, 'assigned_by' => $scoutId,
                'priority' => 'moyenne',
                'objective' => 'Évaluer maturité mentale et choix sous pression dans un match international.',
                'players_to_watch' => Player::where('slug', 'hamzath-mohamadou')->pluck('id')->toArray(),
                'due_date' => Carbon::today()->addDays(5),
                'status' => 'a_faire',
            ],
            [
                'title' => 'Compte rendu KRC Genk vs Royal Antwerp',
                'football_match_id' => $matchGenk?->id,
                'assigned_to' => $scoutId, 'assigned_by' => $scoutId,
                'priority' => 'moyenne',
                'objective' => 'Reporting double - Yanis Lefèvre (Genk) + Ousmane Camara (Antwerp).',
                'players_to_watch' => Player::whereIn('slug', ['yanis-lefevre', 'ousmane-camara'])->pluck('id')->toArray(),
                'due_date' => Carbon::today()->subDay(),
                'status' => 'rapport_soumis',
            ],
            [
                'title' => 'Approfondir cas Mehdi Boukar - pré-validation Shortlist A',
                'football_match_id' => null,
                'assigned_to' => $scoutId, 'assigned_by' => $scoutId,
                'priority' => 'haute',
                'objective' => 'Coordonner 3e rapport indépendant + entretien agent.',
                'players_to_watch' => Player::where('slug', 'mehdi-boukar')->pluck('id')->toArray(),
                'due_date' => Carbon::today()->addDays(7),
                'status' => 'en_cours',
            ],
            [
                'title' => 'Audit shortlists fin de saison',
                'football_match_id' => null,
                'assigned_to' => $scoutId, 'assigned_by' => $scoutId,
                'priority' => 'basse',
                'objective' => 'Nettoyer joueurs sans next action, archiver dossiers stagnants.',
                'players_to_watch' => [],
                'due_date' => Carbon::today()->addDays(14),
                'status' => 'a_faire',
            ],
        ];

        foreach ($missions as $m) {
            ScoutAssignment::updateOrCreate(
                ['title' => $m['title']],
                $m,
            );
        }
    }
}
