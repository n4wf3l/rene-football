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

        // Sources documentaires pour le roster Rene Football uniquement.
        // Les demo pros retirés (mehdi-boukar, karim-toure, idriss-ndiaye…)
        // n'apparaissent plus ici — leurs lignes seraient skippées de toute
        // façon par le `if (! $player) continue` ci-dessous.
        $rows = [
            ['slug' => 'adams-saeed', 'field_name' => 'club',           'value' => 'KV Mechelen',                  'source_type' => 'officiel', 'source_label' => 'Roster KV Mechelen 2025-2026', 'reliability_score' => 95],
            ['slug' => 'adams-saeed', 'field_name' => 'nationalities',  'value' => 'Ghana / Pays-Bas',             'source_type' => 'officiel', 'source_label' => 'Passeport (copie certifiée)', 'reliability_score' => 100],
            ['slug' => 'adams-saeed', 'field_name' => 'date_of_birth',  'value' => '2009-10-17',                   'source_type' => 'officiel', 'source_label' => 'Passeport', 'reliability_score' => 100],
            ['slug' => 'ativie-megogo', 'field_name' => 'club',          'value' => 'Borussia Mönchengladbach (prêt depuis KRC Genk)', 'source_type' => 'officiel', 'source_label' => 'Communiqué prêt 2024-2025', 'reliability_score' => 95],
            ['slug' => 'ativie-megogo', 'field_name' => 'date_of_birth', 'value' => '2009-07-06',                   'source_type' => 'officiel', 'source_label' => 'Passeport', 'reliability_score' => 100],
            ['slug' => 'ativie-megogo', 'field_name' => 'nationality',   'value' => 'Espagne',                      'source_type' => 'officiel', 'source_label' => 'Passeport', 'reliability_score' => 100],
            ['slug' => 'ativie-megogo', 'field_name' => 'languages',     'value' => 'Anglais / Français / Espagnol','source_type' => 'agent',    'source_label' => 'Entretien agent (vidéo)', 'reliability_score' => 85],
            ['slug' => 'abakar-abba',   'field_name' => 'club',          'value' => 'Standard de Liège',  'source_type' => 'officiel', 'source_label' => 'Roster Standard de Liège 2025-2026', 'reliability_score' => 95],
            ['slug' => 'abakar-abba',   'field_name' => 'date_of_birth', 'value' => '2009-01-04',         'source_type' => 'officiel', 'source_label' => 'Passeport', 'reliability_score' => 100],
            ['slug' => 'abakar-abba',   'field_name' => 'nationality',   'value' => 'Belgique',           'source_type' => 'officiel', 'source_label' => 'Passeport', 'reliability_score' => 100],
            ['slug' => 'hamzath-mohamadou', 'field_name' => 'club',          'value' => 'Borussia Dortmund (U-17)', 'source_type' => 'officiel', 'source_label' => 'Roster BVB U-17 2025-2026', 'reliability_score' => 95],
            ['slug' => 'hamzath-mohamadou', 'field_name' => 'nationality',   'value' => 'Allemagne (U-15)',         'source_type' => 'officiel', 'source_label' => 'DFB - sélection U-15', 'reliability_score' => 100],
            ['slug' => 'hamzath-mohamadou', 'field_name' => 'profile',       'value' => 'World Class 10/10',        'source_type' => 'externe',  'source_label' => 'Carte FutureBallers DE', 'reliability_score' => 75],
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
