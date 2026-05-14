<?php

namespace Database\Seeders\Scouting;

use App\Models\Scouting\ClubDnaProfile;
use Illuminate\Database\Seeder;

class ClubDnaProfileSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'name' => 'Ailier pressing haut',
                'position' => 'Ailier',
                'category' => 'Pro',
                'description' => 'Joueur capable de presser dès la sortie de balle adverse, repli défensif important, finition au second poteau.',
                'attributes' => [
                    ['key' => 'pressing',  'label' => 'Pressing avant', 'weight' => 3],
                    ['key' => 'sprint',    'label' => 'Sprints répétés', 'weight' => 3],
                    ['key' => 'finition',  'label' => 'Finition', 'weight' => 2],
                ],
            ],
            [
                'name' => 'Milieu défensif possession',
                'position' => 'Milieu défensif',
                'category' => 'Pro',
                'description' => 'Sentinelle technique, scan avant réception, passe sous pression, conserve sous duel.',
                'attributes' => [
                    ['key' => 'scan',      'label' => 'Scan avant réception', 'weight' => 3],
                    ['key' => 'passe',     'label' => 'Passe sous pression',  'weight' => 3],
                    ['key' => 'conservation', 'label' => 'Conservation duel', 'weight' => 2],
                ],
            ],
            [
                'name' => 'Défenseur central relance',
                'position' => 'Defenseur central',
                'category' => 'Pro',
                'description' => 'CB capable de casser les lignes, jeu long précis, calme sous pression.',
                'attributes' => [
                    ['key' => 'jeu_long',   'label' => 'Jeu long', 'weight' => 3],
                    ['key' => 'placement',  'label' => 'Placement défensif', 'weight' => 3],
                    ['key' => 'sang_froid', 'label' => 'Sang-froid', 'weight' => 2],
                ],
            ],
            [
                'name' => 'Latéral offensif',
                'position' => 'Latéral',
                'category' => 'Pro',
                'description' => 'Couloir entier, centres précis, repli défensif au-dessus de la moyenne du poste.',
                'attributes' => [
                    ['key' => 'centre',     'label' => 'Centre précis',  'weight' => 3],
                    ['key' => 'endurance',  'label' => 'Endurance couloir', 'weight' => 3],
                    ['key' => 'repli',      'label' => 'Repli défensif',   'weight' => 2],
                ],
            ],
        ];

        foreach ($rows as $r) {
            ClubDnaProfile::updateOrCreate(
                ['name' => $r['name']],
                array_merge($r, ['active' => true]),
            );
        }
    }
}
