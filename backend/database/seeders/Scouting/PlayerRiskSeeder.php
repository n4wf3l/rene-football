<?php

namespace Database\Seeders\Scouting;

use App\Models\Player;
use App\Models\Scouting\PlayerRisk;
use App\Models\User;
use Illuminate\Database\Seeder;

class PlayerRiskSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::where('is_admin', true)->value('id');

        $rows = [
            ['slug' => 'adams-saeed', 'risk_type' => 'mental',     'title' => 'Maturité à confirmer en haut niveau',     'description' => 'Premier saison pro - à accompagner sur la gestion de la pression et de la rotation.', 'probability' => 'moyenne', 'impact' => 'moyen', 'status' => 'ouvert'],
            ['slug' => 'adams-saeed', 'risk_type' => 'adaptation', 'title' => 'Sélection internationale à arbitrer',     'description' => 'Bi-national Ghana / Pays-Bas - choix sportif à fixer avec le joueur et son entourage.', 'probability' => 'moyenne', 'impact' => 'moyen', 'status' => 'surveille'],
            ['slug' => 'abakar-abba',   'risk_type' => 'physique',   'title' => 'Intensité duels à renforcer pour Pro League', 'probability' => 'moyenne', 'impact' => 'moyen', 'status' => 'surveille'],
            ['slug' => 'hamzath-mohamadou', 'risk_type' => 'marche',  'title' => 'Forte concurrence agences sur le profil',  'description' => 'Profil 10/10 FutureBallers - top clubs européens potentiellement déjà positionnés.', 'probability' => 'elevee',  'impact' => 'eleve', 'status' => 'ouvert'],
            ['slug' => 'hamzath-mohamadou', 'risk_type' => 'mental',  'title' => 'Maturité 15 ans face à l\'exposition médiatique', 'description' => 'Accompagnement personnel et famille à structurer dès maintenant.', 'probability' => 'moyenne', 'impact' => 'eleve', 'status' => 'surveille'],
        ];

        foreach ($rows as $r) {
            $player = Player::where('slug', $r['slug'])->first();
            if (! $player) continue;
            $payload = array_merge($r, ['player_id' => $player->id, 'created_by' => $adminId]);
            unset($payload['slug']);
            PlayerRisk::updateOrCreate(
                ['player_id' => $player->id, 'title' => $r['title']],
                $payload,
            );
        }
    }
}
