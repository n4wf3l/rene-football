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
            ['slug' => 'karim-toure', 'risk_type' => 'marche',       'title' => 'Concurrence forte sur le profil',        'description' => 'Plusieurs clubs européens identifiés sur le dossier.', 'probability' => 'elevee',  'impact' => 'moyen', 'status' => 'ouvert'],
            ['slug' => 'karim-toure', 'risk_type' => 'sportif',      'title' => 'Adaptation tactique nouveau championnat', 'probability' => 'moyenne', 'impact' => 'moyen', 'status' => 'surveille'],
            ['slug' => 'ousmane-camara', 'risk_type' => 'blessure',  'title' => 'Entorse de cheville en septembre 2025',  'description' => 'Suivi médical à confirmer avant approche.', 'probability' => 'moyenne', 'impact' => 'eleve', 'status' => 'surveille'],
            ['slug' => 'hamzath-mohamadou', 'risk_type' => 'mental', 'title' => 'Maturité encore jeune',                  'description' => 'À encadrer dans un projet sportif sécurisé.', 'probability' => 'elevee', 'impact' => 'moyen', 'status' => 'ouvert'],
            ['slug' => 'hamzath-mohamadou', 'risk_type' => 'entourage', 'title' => 'Entourage familial à clarifier',     'probability' => 'moyenne', 'impact' => 'eleve', 'status' => 'ouvert'],
            ['slug' => 'idriss-ndiaye', 'risk_type' => 'marche',     'title' => 'Clause libératoire active à 8 M€',       'probability' => 'elevee', 'impact' => 'eleve', 'status' => 'ouvert'],
            ['slug' => 'mehdi-boukar',  'risk_type' => 'sportif',    'title' => 'Polyvalence = risque de positionnement', 'probability' => 'faible',  'impact' => 'moyen', 'status' => 'ouvert'],
            ['slug' => 'yanis-lefevre', 'risk_type' => 'physique',   'title' => 'Gabarit léger pour Pro League',          'probability' => 'moyenne', 'impact' => 'moyen', 'status' => 'surveille'],
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
