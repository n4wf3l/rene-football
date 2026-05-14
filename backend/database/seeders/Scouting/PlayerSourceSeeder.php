<?php

namespace Database\Seeders\Scouting;

use App\Models\Player;
use App\Models\Scouting\PlayerSource;
use App\Models\User;
use Illuminate\Database\Seeder;

class PlayerSourceSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::where('is_admin', true)->value('id');

        $rows = [
            ['slug' => 'mehdi-boukar',  'field_name' => 'club',     'value' => 'FC Metz',     'source_type' => 'officiel',     'source_label' => 'Site officiel FC Metz', 'reliability_score' => 95],
            ['slug' => 'mehdi-boukar',  'field_name' => 'salary',   'value' => 'Confidentiel', 'source_type' => 'agent',        'source_label' => 'Entretien agent 04/2026', 'reliability_score' => 65],
            ['slug' => 'karim-toure',   'field_name' => 'club',     'value' => 'Borussia Dortmund', 'source_type' => 'officiel', 'source_label' => 'Bundesliga.de', 'reliability_score' => 95],
            ['slug' => 'karim-toure',   'field_name' => 'contract_end', 'value' => '2028-06-30','source_type' => 'agent',       'source_label' => 'Entretien agent', 'reliability_score' => 80],
            ['slug' => 'hamzath-mohamadou', 'field_name' => 'club', 'value' => 'BVB U19',     'source_type' => 'officiel',      'source_label' => 'BVB U19 roster', 'reliability_score' => 90],
            ['slug' => 'hamzath-mohamadou', 'field_name' => 'family', 'value' => 'À clarifier', 'source_type' => 'scout',       'source_label' => 'Rapport scout interne', 'reliability_score' => 40],
            ['slug' => 'yanis-lefevre', 'field_name' => 'nationalities', 'value' => 'Luxembourg / France', 'source_type' => 'feuille_match', 'source_label' => 'Feuille de match UEFA', 'reliability_score' => 90],
            ['slug' => 'idriss-ndiaye', 'field_name' => 'release_clause', 'value' => '8 M€', 'source_type' => 'agent',         'source_label' => 'Entretien agent 03/2026', 'reliability_score' => 70],
        ];

        foreach ($rows as $r) {
            $player = Player::where('slug', $r['slug'])->first();
            if (! $player) continue;
            $payload = array_merge($r, ['player_id' => $player->id, 'added_by' => $adminId]);
            unset($payload['slug']);
            PlayerSource::updateOrCreate(
                ['player_id' => $player->id, 'field_name' => $r['field_name']],
                $payload,
            );
        }
    }
}
