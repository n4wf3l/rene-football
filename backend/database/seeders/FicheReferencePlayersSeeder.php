<?php

namespace Database\Seeders;

use App\Models\Player;
use Illuminate\Database\Seeder;

/**
 * Seeds the 4 real players René Football uses on their reference marketing
 * fiches (screens shared 2026-09-20). Camara Philan already exists — his DOB
 * and crest are backfilled here idempotently. Photos are left empty on
 * purpose so the admin uploads them via the standard flow.
 */
class FicheReferencePlayersSeeder extends Seeder
{
    public function run(): void
    {
        // Camara Philan — id=14, existing. Only backfill missing fields.
        Player::where('slug', 'camara-philan')->update([
            'date_of_birth' => '2015-01-21',
        ]);

        $now = now()->format('Y');

        $players = [
            [
                'slug'           => 'zoran-mawel-batomi',
                'name'           => 'Zoran-Mawel Batomi',
                'age'            => 7,
                'date_of_birth'  => '2018-04-24',
                'position'       => 'Attaquant de pointe',
                'category'       => 'Attaquant',
                'club'           => 'RSC Anderlecht (Académie)',
                'nationality'    => 'Belge',
                'preferred_foot' => 'Droit',
                'since'          => (int) $now,
                'bio'            => 'Attaquant rapide, technique et percutant, Zoran-Mawel a un excellent sens du but et une grande capacité à faire la différence. Travailleur, ambitieux et doté d\'un fort mental, il possède toutes les qualités pour devenir un grand joueur.',
                'strengths'      => [
                    ['key' => 'speed',       'label' => 'Vitesse et explosivité'],
                    ['key' => 'technique',   'label' => 'Technique individuelle'],
                    ['key' => 'dribbling',   'label' => 'Dribbles et éliminations'],
                    ['key' => 'finishing',   'label' => 'Sens du but'],
                    ['key' => 'work_rate',   'label' => 'Travail et détermination'],
                ],
            ],
            [
                'slug'           => 'saeed-adams',
                'name'           => 'Saeed Adams',
                'age'            => 16,
                'date_of_birth'  => '2009-10-17',
                'position'       => 'Striker / Left & Right Winger',
                'category'       => 'Attaquant',
                'club'           => 'KV Mechelen',
                'nationality'    => 'Ghanéenne / Néerlandaise',
                'preferred_foot' => 'Droit',
                'since'          => (int) $now,
                'bio'            => 'Dynamic and powerful forward with excellent pace, dribbling and finishing. Able to play as a striker or on both wings. Hardworking, disciplined and dedicated to constant improvement.',
                'strengths'      => [
                    ['key' => 'speed',       'label' => 'Speed'],
                    ['key' => 'technique',   'label' => 'Technique'],
                    ['key' => 'finishing',   'label' => 'Finishing'],
                    ['key' => 'dribbling',   'label' => 'Dribbling'],
                    ['key' => 'power',       'label' => 'Strength'],
                    ['key' => 'work_rate',   'label' => 'Work rate'],
                ],
            ],
            [
                'slug'           => 'destiny-megogo',
                'name'           => 'Destiny Megogo',
                'age'            => 17,
                'date_of_birth'  => '2009-07-06',
                'position'       => 'Défenseur central',
                'category'       => 'Defenseur',
                'club'           => 'Borussia Mönchengladbach',
                'nationality'    => 'Espagnole',
                'preferred_foot' => 'Droit',
                'since'          => (int) $now,
                'bio'            => 'Défenseur central complet, doté d\'une excellente lecture du jeu, d\'un strong engagement et d\'une grande maturité sur le terrain. Solide dans les duels, bon relanceur, et toujours concentré, Destiny incarne la nouvelle génération de défenseurs modernes.',
                'strengths'      => [
                    ['key' => 'power',       'label' => 'Puissance et impact physique'],
                    ['key' => 'vision',      'label' => 'Lecture du jeu'],
                    ['key' => 'duels',       'label' => 'Qualité dans les duels'],
                    ['key' => 'passing',     'label' => 'Relance propre'],
                    ['key' => 'mental',      'label' => 'Mentalité professionnelle'],
                    ['key' => 'leadership',  'label' => 'Leadership et communication'],
                ],
            ],
            [
                'slug'           => 'hanibal-tesfegabir-solomon',
                'name'           => 'Hanibal Tesfegabir Solomon',
                'age'            => 18,
                'date_of_birth'  => '2008-01-01',
                'position'       => 'Milieu offensif / Ailier',
                'category'       => 'Milieu',
                'club'           => 'RWDM Molenbeek / F91 Dudelange',
                'nationality'    => 'Luxembourgeoise',
                'preferred_foot' => 'Droit',
                'since'          => (int) $now,
                'bio'            => 'Chez Renefootball, notre mission est d\'accompagner Hanibal dans son développement et de l\'ouvrir aux plus grands clubs européens.',
                'strengths'      => [
                    ['key' => 'vision',     'label' => 'Vision du jeu'],
                    ['key' => 'technique',  'label' => 'Technique'],
                    ['key' => 'speed',      'label' => 'Vitesse'],
                    ['key' => 'creativity', 'label' => 'Créativité'],
                    ['key' => 'mental',     'label' => 'Mentalité de gagnant'],
                ],
            ],
        ];

        foreach ($players as $data) {
            Player::updateOrCreate(
                ['slug' => $data['slug']],
                array_merge($data, ['is_published' => true]),
            );
        }
    }
}
