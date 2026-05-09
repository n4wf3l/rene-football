<?php

namespace Database\Seeders;

use App\Models\Player;
use Illuminate\Database\Seeder;

class PlayerSeeder extends Seeder
{
    /**
     * Heatmap presets keyed by position label. Each grid is 4 rows × 6 cols, intensity 0-100.
     *
     * Orientation: the player attacks from left (col 0 = own goal) to right (col 5 = opp goal).
     * Rows top-to-bottom: 0 = upper wing, 3 = lower wing (TV-broadcast convention).
     *   - Right-footed wide players ("Lateral droit", "Ailier droit") sit on the lower wing.
     *   - Left-footed wide players ("Lateral gauche", "Ailier gauche") sit on the upper wing.
     */
    private const PRESETS = [
        'Gardien' => [
            [0,  5,  0,  0,  0,  0],
            [55, 90, 8,  0,  0,  0],
            [55, 90, 8,  0,  0,  0],
            [0,  5,  0,  0,  0,  0],
        ],
        'Defenseur central' => [
            [0,  30, 20, 5,  0,  0],
            [10, 90, 75, 40, 5,  0],
            [10, 90, 75, 40, 5,  0],
            [0,  30, 20, 5,  0,  0],
        ],
        'Lateral droit' => [
            [0,  0,  0,  0,  0,  0],
            [0,  0,  0,  0,  0,  0],
            [10, 40, 55, 40, 15, 0],
            [30, 80, 90, 75, 30, 5],
        ],
        'Lateral gauche' => [
            [30, 80, 90, 75, 30, 5],
            [10, 40, 55, 40, 15, 0],
            [0,  0,  0,  0,  0,  0],
            [0,  0,  0,  0,  0,  0],
        ],
        'Milieu defensif' => [
            [0,  5,  30, 30, 5,  0],
            [10, 55, 90, 80, 30, 5],
            [10, 55, 90, 80, 30, 5],
            [0,  5,  30, 30, 5,  0],
        ],
        'Milieu offensif' => [
            [0,  5,  25, 45, 25, 5],
            [5,  25, 75, 90, 55, 15],
            [5,  25, 75, 90, 55, 15],
            [0,  5,  25, 45, 25, 5],
        ],
        'Meneur de jeu' => [
            [0,  5,  30, 50, 30, 5],
            [5,  25, 70, 90, 60, 20],
            [5,  25, 70, 90, 60, 20],
            [0,  5,  30, 50, 30, 5],
        ],
        'Ailier droit' => [
            [0,  0,  0,  0,  0,  0],
            [0,  0,  0,  5,  5,  0],
            [0,  5,  15, 40, 55, 25],
            [0,  15, 40, 75, 90, 50],
        ],
        'Ailier gauche' => [
            [0,  15, 40, 75, 90, 50],
            [0,  5,  15, 40, 55, 25],
            [0,  0,  0,  5,  5,  0],
            [0,  0,  0,  0,  0,  0],
        ],
        'Attaquant' => [
            [0,  0,  5,  20, 45, 25],
            [0,  5,  15, 55, 95, 75],
            [0,  5,  15, 55, 95, 75],
            [0,  0,  5,  20, 45, 25],
        ],
        'Avant-centre' => [
            [0,  0,  5,  15, 45, 30],
            [0,  0,  10, 50, 95, 80],
            [0,  0,  10, 50, 95, 80],
            [0,  0,  5,  15, 45, 30],
        ],
        'default' => [
            [5,  15, 25, 25, 15, 5],
            [10, 40, 60, 60, 40, 10],
            [10, 40, 60, 60, 40, 10],
            [5,  15, 25, 25, 15, 5],
        ],
    ];

    public function run(): void
    {
        $players = [
            ['mehdi-boukar',    'Mehdi Boukar',    22, '1m78', 'Milieu offensif',     'Milieu',    'FC Metz',           'France',         'Droit',  2022, 31, 8,  5,  2740, 42, 18, 6.4,  4.8, 38, 84.2, 41, 22, 14, 64, 4, 0,  0,  0],
            ['adil-berkane',    'Adil Berkane',    24, '1m83', 'Milieu defensif',     'Milieu',    'Standard Liege',    'Maroc',          'Droit',  2021, 28, 2,  4,  2410, 18, 6,  1.9,  3.6, 24, 88.5, 19, 56, 38, 78, 6, 1,  0,  0],
            ['theo-vasseur',    'Theo Vasseur',    26, '1m91', 'Defenseur central',   'Defenseur', 'OGC Nice',          'France',         'Gauche', 2019, 34, 3,  1,  3050, 22, 9,  2.7,  0.9, 11, 86.1, 8,  72, 54, 96, 5, 0,  6,  0],
            ['karim-toure',     'Karim Toure',     24, '1m86', 'Attaquant',           'Attaquant', 'Borussia Dortmund', 'Senegal',        'Droit',  2020, 29, 14, 6,  2580, 78, 41, 12.6, 5.1, 32, 76.4, 47, 12, 8,  58, 3, 0,  0,  0],
            ['yanis-lefevre',   'Yanis Lefevre',   19, '1m81', 'Milieu defensif',     'Milieu',    'KRC Genk',          'Luxembourg',     'Droit',  2024, 12, 0,  2,  890,  6,  2,  0.4,  1.6, 9,  89.2, 7,  18, 14, 28, 2, 0,  0,  0],
            ['ousmane-camara',  'Ousmane Camara',  21, '1m77', 'Ailier gauche',       'Attaquant', 'Royal Antwerp',     'Mali',           'Droit',  2023, 24, 7,  9,  2010, 51, 22, 7.8,  6.9, 42, 80.5, 64, 9,  11, 49, 4, 0,  0,  0],
            ['lucas-marini',    'Lucas Marini',    27, '1m80', 'Lateral droit',       'Defenseur', 'AS Monaco',         'Italie',         'Droit',  2018, 26, 1,  3,  2280, 14, 5,  1.1,  2.4, 22, 84.7, 15, 48, 36, 71, 5, 0,  4,  0],
            ['idriss-ndiaye',   "Idriss N'Diaye",  23, '1m89', 'Avant-centre',        'Attaquant', 'FC Twente',         'Senegal',        'Droit',  2022, 33, 17, 2,  2740, 84, 47, 14.3, 1.8, 18, 72.1, 19, 8,  5,  62, 4, 0,  0,  0],
            ['romain-caillard', 'Romain Caillard', 29, '1m92', 'Gardien',             'Gardien',   'KAS Eupen',         'Luxembourg',     'Droit',  2017, 31, 0,  0,  2790, 0,  0,  0,    0,   2,  68.3, 0,  0,  4,  6,  3, 0,  10, 102],
            ['ayoub-el-bahri',  'Ayoub El Bahri',  20, '1m74', 'Meneur de jeu',       'Milieu',    'RC Lens',           'Maroc',          'Gauche', 2024, 18, 4,  7,  1480, 27, 12, 3.6,  5.8, 31, 86.8, 38, 14, 11, 41, 3, 0,  0,  0],
            ['hugo-tessier',    'Hugo Tessier',    25, '1m88', 'Defenseur central',   'Defenseur', 'Royale Union SG',   'France',         'Droit',  2020, 30, 2,  0,  2680, 16, 7,  1.8,  0.4, 6,  87.4, 5,  68, 49, 88, 6, 1,  5,  0],
            ['nabil-sangare',   'Nabil Sangare',   22, '1m76', 'Ailier droit',        'Attaquant', 'FC Bale',           "Cote d'Ivoire",  'Gauche', 2022, 27, 11, 8,  2310, 62, 31, 9.2,  6.4, 39, 79.8, 58, 11, 9,  53, 5, 0,  0,  0],
        ];

        foreach ($players as $p) {
            $heatmap = $this->generateHeatmap($p[4], $p[0]);

            Player::updateOrCreate(
                ['slug' => $p[0]],
                [
                    'name' => $p[1],
                    'age' => $p[2],
                    'height' => $p[3],
                    'position' => $p[4],
                    'category' => $p[5],
                    'club' => $p[6],
                    'nationality' => $p[7],
                    'preferred_foot' => $p[8],
                    'since' => $p[9],
                    'matches_played' => $p[10],
                    'goals' => $p[11],
                    'assists' => $p[12],
                    'minutes_played' => $p[13],
                    'shots' => $p[14],
                    'shots_on_target' => $p[15],
                    'xg' => $p[16],
                    'xa' => $p[17],
                    'key_passes' => $p[18],
                    'pass_accuracy' => $p[19],
                    'dribbles_completed' => $p[20],
                    'tackles' => $p[21],
                    'interceptions' => $p[22],
                    'duels_won' => $p[23],
                    'yellow_cards' => $p[24],
                    'red_cards' => $p[25],
                    'clean_sheets' => $p[26],
                    'saves' => $p[27],
                    'heatmap_grid' => $heatmap,
                    'is_published' => true,
                    'photo_url' => "https://picsum.photos/seed/{$p[0]}/600/800",
                    'bio' => null,
                ]
            );
        }
    }

    private function generateHeatmap(string $position, string $slug): array
    {
        $preset = self::PRESETS[$position] ?? self::PRESETS['default'];
        $seed = crc32($slug);
        $grid = [];
        foreach ($preset as $i => $row) {
            $newRow = [];
            foreach ($row as $j => $val) {
                $delta = ((int) (($seed * ($i + 2) * ($j * 7 + 3)) % 31)) - 15;
                if ($val === 0) {
                    // keep cold zones cold-ish; only sprinkle a tiny bit of noise
                    $newRow[] = max(0, min(15, abs($delta) - 8));
                } else {
                    $newRow[] = max(0, min(100, $val + $delta));
                }
            }
            $grid[] = $newRow;
        }
        return $grid;
    }
}
