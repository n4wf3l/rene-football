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
        $matchMechelenU21 = $matches->firstWhere('category', 'U19');

        // Missions focalisées sur le roster Rene Football. Les missions liées
        // aux demo pros (Idriss, Mehdi, Ousmane) ont été retirées avec leurs
        // fiches.
        $missions = [
            [
                'title' => 'Mission U21 - observer Adams Saeed à Mechelen',
                'football_match_id' => $matchMechelenU21?->id,
                'assigned_to' => $scoutId, 'assigned_by' => $scoutId,
                'priority' => 'haute',
                'objective' => 'Évaluer polyvalence striker / ailier et choix sous pression contre Club Brugge U21.',
                'players_to_watch' => Player::where('slug', 'adams-saeed')->pluck('id')->toArray(),
                'due_date' => Carbon::today()->addDays(5),
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
                'title' => 'Observation Standard - Abakar Abba U21',
                'football_match_id' => null,
                'assigned_to' => $scoutId, 'assigned_by' => $scoutId,
                'priority' => 'moyenne',
                'objective' => 'Compléter le rapport sentinelle - intensité dans les duels, sortie de balle pied droit.',
                'players_to_watch' => Player::where('slug', 'abakar-abba')->pluck('id')->toArray(),
                'due_date' => Carbon::today()->addDays(7),
                'status' => 'en_cours',
            ],
            [
                'title' => 'Suivi académies - Camara + Batomi',
                'football_match_id' => null,
                'assigned_to' => $scoutId, 'assigned_by' => $scoutId,
                'priority' => 'basse',
                'objective' => 'Bilan trimestriel sur les U9/U13 - observation pédagogique.',
                'players_to_watch' => Player::whereIn('slug', ['camara-philan', 'batomi-zoran-mawel'])->pluck('id')->toArray(),
                'due_date' => Carbon::today()->addDays(14),
                'status' => 'a_faire',
            ],
            [
                'title' => 'BVB U-17 - observation Hamzath Mohamadou',
                'football_match_id' => null,
                'assigned_to' => $scoutId, 'assigned_by' => $scoutId,
                'priority' => 'urgente',
                'objective' => 'Confirmer en live le potentiel 10/10 - focus 1v1 et lecture du jeu sans ballon. Entretien représentation à caler.',
                'players_to_watch' => Player::where('slug', 'hamzath-mohamadou')->pluck('id')->toArray(),
                'due_date' => Carbon::today()->addDays(3),
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
