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

    /**
     * Slugs that USED to belong to the demo roster but have since been replaced
     * by real Rene Football players. We delete these rows at the start of every
     * seed run so the cockpit doesn't drag around orphan profiles when the user
     * runs `db:seed` (without `migrate:fresh`).
     *
     * Photo files on disk are left untouched — only the DB row is cleaned up.
     */
    private const OBSOLETE_SLUGS = [
        'hamzath-mohamadou', // replaced by adams-saeed
        'adil-berkane',      // replaced by ativie-megogo
        'yanis-lefevre',     // replaced by abakar-abba
        'ayoub-el-bahri',    // replaced by camara-philan
        'hugo-tessier',      // replaced by tesfegabir-solomon
    ];

    public function run(): void
    {
        // Drop any obsolete demo slug before re-seeding. Cascade is handled by
        // the foreign keys (scouting_reports, sources, risks, shortlist entries
        // all reference player_id with onDelete cascade or nullOnDelete).
        Player::whereIn('slug', self::OBSOLETE_SLUGS)->delete();

        $players = [
            ['mehdi-boukar',    'Mehdi Boukar',    22, '1m78', 'Milieu offensif',     'Milieu',    'FC Metz',           'France',         'Droit',  2022, 31, 8,  5,  2740, 42, 18, 6.4,  4.8, 38, 84.2, 41, 22, 14, 64, 4, 0,  0,  0],
            // Ativie Megogo Destini Emmanuel - vrai joueur Rene Football (16 ans, ne le 06/07/2009).
            // Défenseur central espagnol, actuellement en prêt à Borussia Mönchengladbach (club d'origine : KRC Genk).
            // Trilingue anglais / français / espagnol, droitier.
            ['ativie-megogo',   'Ativie Megogo Destini Emmanuel', 16, '1m83', 'Defenseur central',   'Defenseur', 'Borussia Mönchengladbach', 'Espagne',  'Droit',  2024, 22, 1,  1,  1880, 9,  4,  0.7,  0.4, 6,  85.6, 5,  48, 36, 92, 3, 0,  8,  0],
            ['theo-vasseur',    'Theo Vasseur',    26, '1m91', 'Defenseur central',   'Defenseur', 'OGC Nice',          'France',         'Gauche', 2019, 34, 3,  1,  3050, 22, 9,  2.7,  0.9, 11, 86.1, 8,  72, 54, 96, 5, 0,  6,  0],
            ['karim-toure',     'Karim Toure',     24, '1m86', 'Attaquant',           'Attaquant', 'Borussia Dortmund', 'Senegal',        'Droit',  2020, 29, 14, 6,  2580, 78, 41, 12.6, 5.1, 32, 76.4, 47, 12, 8,  58, 3, 0,  0,  0],
            // Abakar Abba - vrai joueur Rene Football (17 ans, né le 04/01/2009).
            // Milieu défensif belge au Standard de Liège.
            // photo_url verrouillée sur l'image existante (index 28 = override).
            ['abakar-abba',     'Abakar Abba',     17, '1m83', 'Milieu defensif',     'Milieu',    'Standard de Liège', 'Belgique',       'Droit',  2024, 16, 1,  3,  1180, 9,  3,  0.5,  2.4, 14, 87.8, 11, 38, 26, 54, 4, 0,  0,  0, 'https://picsum.photos/seed/yanis-lefevre/600/800'],
            ['ousmane-camara',  'Ousmane Camara',  21, '1m77', 'Ailier gauche',       'Attaquant', 'Royal Antwerp',     'Mali',           'Droit',  2023, 24, 7,  9,  2010, 51, 22, 7.8,  6.9, 42, 80.5, 64, 9,  11, 49, 4, 0,  0,  0],
            ['lucas-marini',    'Lucas Marini',    27, '1m80', 'Lateral droit',       'Defenseur', 'AS Monaco',         'Italie',         'Droit',  2018, 26, 1,  3,  2280, 14, 5,  1.1,  2.4, 22, 84.7, 15, 48, 36, 71, 5, 0,  4,  0],
            ['idriss-ndiaye',   "Idriss N'Diaye",  23, '1m89', 'Avant-centre',        'Attaquant', 'FC Twente',         'Senegal',        'Droit',  2022, 33, 17, 2,  2740, 84, 47, 14.3, 1.8, 18, 72.1, 19, 8,  5,  62, 4, 0,  0,  0],
            ['romain-caillard', 'Romain Caillard', 29, '1m92', 'Gardien',             'Gardien',   'KAS Eupen',         'Luxembourg',     'Droit',  2017, 31, 0,  0,  2790, 0,  0,  0,    0,   2,  68.3, 0,  0,  4,  6,  3, 0,  10, 102],
            // Camara Philan - vrai joueur mineur Rene Football (U13, 11 ans, ne le 21/01/2015).
            // Attaquant droitier belge, academie KRC Genk - profil long terme. Photo
            // pinnee sur l'ancien slug (ayoub-el-bahri) pour preserver l'image existante.
            ['camara-philan',   'Camara Philan',   11, '1m48', 'Attaquant',           'Attaquant', 'KRC Genk (académie U13)','Belgique',  'Droit',  2024, 8,  6,  3,  480,  22, 12, 4.2,  2.8, 12, 78.4, 28, 2,  1,  18, 0, 0,  0,  0, 'https://picsum.photos/seed/ayoub-el-bahri/600/800'],
            // Tesfegabir Solomon Hanibal - vrai joueur Rene Football (18 ans, ne le 01/01/2008).
            // Attaquant droitier érythréen au F91 Dudelange (BGL Ligue Luxembourg).
            // Photo pinnee sur l'ancien slug pour preserver l'image existante.
            ['tesfegabir-solomon','Tesfegabir Solomon Hanibal',18,'1m80','Attaquant',         'Attaquant', 'F91 Dudelange',     'Érythrée',       'Droit',  2024, 21, 9,  5,  1620, 48, 22, 7.4,  4.2, 24, 77.6, 38, 8,  5,  48, 2, 0,  0,  0, 'https://picsum.photos/seed/hugo-tessier/600/800'],
            ['nabil-sangare',   'Nabil Sangare',   22, '1m76', 'Ailier droit',        'Attaquant', 'FC Bale',           "Cote d'Ivoire",  'Gauche', 2022, 27, 11, 8,  2310, 62, 31, 9.2,  6.4, 39, 79.8, 58, 11, 9,  53, 5, 0,  0,  0],
            // Adams Saeed - vrai joueur Rene Football (16 ans, KV Mechelen, ne le 17/10/2009).
            // Striker / ailier droite ou gauche, bi-national Ghana / Pays-Bas (passeport UE).
            // Carte agence : https://renefootball.com.
            ['adams-saeed',     'Adams Saeed',     16, '1m74', 'Ailier droit',        'Attaquant', 'KV Mechelen',       'Ghana / Pays-Bas','Droit',  2024, 23, 13, 7,  1840, 56, 27, 9.6,  6.1, 32, 79.4, 71, 6,  4,  51, 2, 0,  0,  0],
        ];

        foreach ($players as $p) {
            $heatmap = $this->generateHeatmap($p[4], $p[0]);
            $scout = $this->generateScoutProfile($p[4], $p[2], $p[1], $p[11], $p[12], $p[10]);
            $tracking = $this->generateTracking($p[4], $p[0]);

            // Resolve photo_url BEFORE writing.
            //
            // Why : `updateOrCreate` rewrites every field on every run. If we always
            // pass the picsum URL, any photo the admin uploaded via the back-office
            // (which lives under `/storage/players/...` or any other non-picsum URL)
            // gets clobbered on the next `db:seed`. So we lookup the existing row
            // first and preserve a user-uploaded photo if one is in place.
            $existing = Player::where('slug', $p[0])->first();
            $defaultPhoto = $p[28] ?? "https://picsum.photos/seed/{$p[0]}/600/800";
            $photoUrl = $this->resolvePhotoUrl($existing?->photo_url, $defaultPhoto);

            // Same protection for the bio — if the admin wrote one in the back-office,
            // don't reset it to null on every seed run.
            $bio = $existing?->bio ?? null;

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
                    'photo_url' => $photoUrl,
                    'bio' => $bio,
                ]
            );
        }
    }

    /**
     * Decide which photo_url to write. A "user-uploaded" photo is anything that
     * isn't the picsum placeholder we ship with the seed — so once an admin uploads
     * a real picture through the back-office, `db:seed` stops touching it.
     *
     * Pure picsum URLs (the only thing the seeder ever writes) are considered
     * disposable and get refreshed to the latest seeder default.
     */
    private function resolvePhotoUrl(?string $existing, string $default): string
    {
        if (! $existing) return $default;
        // Anything that doesn't look like our placeholder is treated as a real
        // upload — local /storage path, external URL pasted by the admin, etc.
        if (! str_starts_with($existing, 'https://picsum.photos/')) {
            return $existing;
        }
        return $default;
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
