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
            ['hamzath-mohamadou','Hamzath Mohamadou',15, '1m72', 'Ailier gauche',     'Attaquant', 'Borussia Dortmund', 'Allemagne',      'Droit',  2025, 19, 11, 6,  1580, 47, 22, 8.4,  5.2, 28, 81.3, 62, 5,  3,  44, 1, 0,  0,  0],
        ];

        foreach ($players as $p) {
            $heatmap = $this->generateHeatmap($p[4], $p[0]);
            $scout = $this->generateScoutProfile($p[4], $p[2], $p[1], $p[11], $p[12], $p[10]);
            $tracking = $this->generateTracking($p[4], $p[0]);

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
                    'comparisons' => $scout['comparisons'],
                    'strengths' => $scout['strengths'],
                    'potential_rating' => $scout['potential_rating'],
                    'potential_label' => $scout['potential_label'],
                    'scout_quote' => $scout['scout_quote'],
                    'distance_avg_km'         => $tracking['distance_avg_km'],
                    'sprints_avg'             => $tracking['sprints_avg'],
                    'top_speed_kmh'           => $tracking['top_speed_kmh'],
                    'high_intensity_runs_avg' => $tracking['high_intensity_runs_avg'],
                    'is_published' => true,
                    'photo_url' => "https://picsum.photos/seed/{$p[0]}/600/800",
                    'bio' => null,
                ]
            );
        }
    }

    /**
     * Comparisons + strengths picked per position. Two pro-level role models per position
     * so every prospect has a relatable reference point.
     */
    private const SCOUT_PROFILE = [
        'Gardien' => [
            'comparisons' => [
                ['name' => 'Mike Maignan',     'club' => 'AC Milan',         'photo' => 'maignan'],
                ['name' => 'Lucas Chevalier',  'club' => 'Paris Saint-Germain','photo' => 'chevalier'],
            ],
            'strengths' => [
                ['key' => 'reflex',       'label' => 'Reflexes'],
                ['key' => 'distribution', 'label' => 'Relance au pied'],
                ['key' => 'aerial',       'label' => 'Sortie aerienne'],
                ['key' => 'command',      'label' => 'Autorite surface'],
            ],
        ],
        'Defenseur central' => [
            'comparisons' => [
                ['name' => 'William Saliba',   'club' => 'Arsenal',          'photo' => 'saliba'],
                ['name' => 'Dayot Upamecano',  'club' => 'Bayern Munich',    'photo' => 'upamecano'],
            ],
            'strengths' => [
                ['key' => 'aerial',     'label' => 'Duels aeriens'],
                ['key' => 'tackle',     'label' => 'Anticipation'],
                ['key' => 'reading',    'label' => 'Lecture du jeu'],
                ['key' => 'composure',  'label' => 'Calme balle au pied'],
            ],
        ],
        'Lateral droit' => [
            'comparisons' => [
                ['name' => 'Jules Kounde',     'club' => 'FC Barcelona',     'photo' => 'kounde'],
                ['name' => 'Achraf Hakimi',    'club' => 'Paris Saint-Germain','photo' => 'hakimi'],
            ],
            'strengths' => [
                ['key' => 'crossing',  'label' => 'Centres'],
                ['key' => 'speed',     'label' => 'Vitesse'],
                ['key' => 'stamina',   'label' => 'Endurance'],
                ['key' => 'overlap',   'label' => 'Overlap'],
            ],
        ],
        'Lateral gauche' => [
            'comparisons' => [
                ['name' => 'Theo Hernandez',   'club' => 'AC Milan',         'photo' => 'theo-hernandez'],
                ['name' => 'Alphonso Davies',  'club' => 'Bayern Munich',    'photo' => 'davies'],
            ],
            'strengths' => [
                ['key' => 'speed',     'label' => 'Vitesse'],
                ['key' => 'crossing',  'label' => 'Centres rentrants'],
                ['key' => 'stamina',   'label' => 'Volume de course'],
                ['key' => 'overlap',   'label' => 'Projection offensive'],
            ],
        ],
        'Milieu defensif' => [
            'comparisons' => [
                ['name' => 'Aurelien Tchouameni','club' => 'Real Madrid',     'photo' => 'tchouameni'],
                ['name' => "N'Golo Kante",      'club' => 'Chelsea',          'photo' => 'kante'],
            ],
            'strengths' => [
                ['key' => 'recovery',  'label' => 'Recuperation'],
                ['key' => 'reading',   'label' => 'Anticipation'],
                ['key' => 'long-pass', 'label' => 'Passes longues'],
                ['key' => 'stamina',   'label' => 'Volume de jeu'],
            ],
        ],
        'Milieu offensif' => [
            'comparisons' => [
                ['name' => 'Bernardo Silva',   'club' => 'Manchester City',  'photo' => 'bernardo-silva'],
                ['name' => 'Eduardo Camavinga','club' => 'Real Madrid',      'photo' => 'camavinga'],
            ],
            'strengths' => [
                ['key' => 'vision',    'label' => 'Vision du jeu'],
                ['key' => 'key-pass',  'label' => 'Passe-cle'],
                ['key' => 'press-resist','label' => 'Resistance au pressing'],
                ['key' => 'composure', 'label' => 'Sang-froid'],
            ],
        ],
        'Meneur de jeu' => [
            'comparisons' => [
                ['name' => 'Pedri Gonzalez',   'club' => 'FC Barcelona',     'photo' => 'pedri'],
                ['name' => 'Florian Wirtz',    'club' => 'Bayern Munich',    'photo' => 'wirtz'],
            ],
            'strengths' => [
                ['key' => 'vision',     'label' => 'Vision panoramique'],
                ['key' => 'key-pass',   'label' => 'Passes decisives'],
                ['key' => 'dribble',    'label' => 'Conduite courte'],
                ['key' => 'composure',  'label' => 'Sang-froid'],
            ],
        ],
        'Ailier droit' => [
            'comparisons' => [
                ['name' => 'Bukayo Saka',      'club' => 'Arsenal',          'photo' => 'saka'],
                ['name' => 'Bradley Barcola',  'club' => 'Paris Saint-Germain','photo' => 'barcola'],
            ],
            'strengths' => [
                ['key' => '1v1',          'label' => '1v1'],
                ['key' => 'explosive',    'label' => 'Explosivite'],
                ['key' => 'dribble',      'label' => 'Dribble court'],
                ['key' => 'unpredictable','label' => 'Imprevisibilite'],
            ],
        ],
        'Ailier gauche' => [
            'comparisons' => [
                ['name' => 'Ousmane Dembele',  'club' => 'Paris Saint-Germain','photo' => 'dembele'],
                ['name' => 'Bradley Barcola',  'club' => 'Paris Saint-Germain','photo' => 'barcola'],
            ],
            'strengths' => [
                ['key' => '1v1',          'label' => '1v1'],
                ['key' => 'explosive',    'label' => 'Explosivite'],
                ['key' => 'dribble',      'label' => 'Dribble'],
                ['key' => 'unpredictable','label' => 'Imprevisibilite'],
            ],
        ],
        'Attaquant' => [
            'comparisons' => [
                ['name' => 'Marcus Thuram',    'club' => 'Inter Milan',      'photo' => 'thuram'],
                ['name' => 'Randal Kolo Muani','club' => 'Juventus',         'photo' => 'kolo-muani'],
            ],
            'strengths' => [
                ['key' => 'finishing',   'label' => 'Finition'],
                ['key' => 'positioning', 'label' => 'Placement'],
                ['key' => 'power',       'label' => 'Puissance'],
                ['key' => '1v1',         'label' => '1v1 face au gardien'],
            ],
        ],
        'Avant-centre' => [
            'comparisons' => [
                ['name' => 'Erling Haaland',   'club' => 'Manchester City',  'photo' => 'haaland'],
                ['name' => 'Victor Osimhen',   'club' => 'Galatasaray',      'photo' => 'osimhen'],
            ],
            'strengths' => [
                ['key' => 'finishing',   'label' => 'Finition'],
                ['key' => 'aerial',      'label' => 'Jeu aerien'],
                ['key' => 'power',       'label' => 'Puissance'],
                ['key' => 'positioning', 'label' => 'Placement dans la surface'],
            ],
        ],
    ];

    private function generateScoutProfile(string $position, int $age, string $name, int $goals, int $assists, int $matches): array
    {
        $base = self::SCOUT_PROFILE[$position] ?? self::SCOUT_PROFILE['Milieu offensif'];

        // Potential rating ladder: youth = highest ceiling, established players capped lower.
        if ($age < 18)        $rating = 9.5;
        elseif ($age < 21)    $rating = 9.0;
        elseif ($age < 24)    $rating = 8.5;
        elseif ($age < 27)    $rating = 8.0;
        else                  $rating = 7.5;

        // Slight tweak based on slug to avoid identical numbers.
        $rating = round($rating + ((crc32($name) % 5 - 2) * 0.1), 1);

        if ($rating >= 9.3)      $label = 'Future star mondiale';
        elseif ($rating >= 8.7)  $label = 'Tres haut potentiel';
        elseif ($rating >= 8.0)  $label = 'Haut potentiel';
        elseif ($rating >= 7.3)  $label = 'Profil etabli';
        else                     $label = 'Profil rotation';

        $contributions = $goals + $assists;
        $isKeeper = $position === 'Gardien';

        $quote = $isKeeper
            ? "{$name} apporte la serenite et l'autorite que demande un poste de gardien moderne. Ses qualites de relance courte et longue ouvrent une nouvelle dimension dans le jeu de son equipe."
            : "{$name} confirme saison apres saison qu'il fait partie des profils a suivre de tres pres. Avec {$contributions} contributions decisives sur {$matches} matchs, il combine impact statistique et lecture du jeu rare pour son age.";

        return [
            'comparisons' => array_map(fn($c) => [
                'name' => $c['name'],
                'club' => $c['club'],
                'photo_url' => "https://picsum.photos/seed/{$c['photo']}/200/200",
            ], $base['comparisons']),
            'strengths' => $base['strengths'],
            'potential_rating' => $rating,
            'potential_label' => $label,
            'scout_quote' => $quote,
        ];
    }

    /**
     * Realistic per-match averages by position. Wingers + fullbacks lead in
     * sprints + top speed; central midfielders lead in distance; CBs have the
     * lowest top speed but high HI runs in their zone.
     */
    private function generateTracking(string $position, string $slug): array
    {
        $base = match (true) {
            str_contains($position, 'Gardien')        => ['d' => 4.2,  's' => 4,  't' => 27.0, 'h' => 12],
            str_contains($position, 'Defenseur')      => ['d' => 9.8,  's' => 22, 't' => 31.5, 'h' => 60],
            str_contains($position, 'Lateral')        => ['d' => 11.0, 's' => 38, 't' => 33.5, 'h' => 92],
            str_contains($position, 'Milieu defensif')=> ['d' => 11.6, 's' => 24, 't' => 30.8, 'h' => 78],
            str_contains($position, 'Milieu offensif')=> ['d' => 11.2, 's' => 32, 't' => 32.0, 'h' => 84],
            str_contains($position, 'Meneur')         => ['d' => 10.6, 's' => 28, 't' => 31.4, 'h' => 76],
            str_contains($position, 'Ailier')         => ['d' => 10.4, 's' => 42, 't' => 34.2, 'h' => 96],
            str_contains($position, 'Avant-centre')   => ['d' => 10.0, 's' => 36, 't' => 33.0, 'h' => 80],
            str_contains($position, 'Attaquant')      => ['d' => 10.6, 's' => 38, 't' => 33.6, 'h' => 88],
            default                                   => ['d' => 10.5, 's' => 30, 't' => 32.0, 'h' => 80],
        };
        $seed = crc32($slug);
        // Stable jitter per slug so reseeding is reproducible.
        $jitter = fn (float $center, float $spread) => round($center + (($seed % 17) - 8) / 8 * $spread, 1);
        $jitterInt = fn (int $center, int $spread) => max(0, intval($center + (($seed % 11) - 5) / 5 * $spread));

        return [
            'distance_avg_km'         => $jitter($base['d'], 0.6),
            'sprints_avg'             => $jitterInt($base['s'], 6),
            'top_speed_kmh'           => $jitter($base['t'], 1.4),
            'high_intensity_runs_avg' => $jitterInt($base['h'], 12),
        ];
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
