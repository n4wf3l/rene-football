<?php

namespace Database\Seeders;

use App\Models\Player;
use Illuminate\Database\Seeder;

/**
 * Seeds the 5 real players René Football uses on the reference marketing
 * fiches (Zoran-Mawel Batomi, Camara Philan, Saeed Adams, Destiny Megogo,
 * Hanibal Tesfegabir Solomon). Each row mirrors exactly what appears on the
 * physical fiche - fields that are NOT shown on the fiche (stats, heatmap,
 * radar/comparisons, physical KPIs, scout scores) are explicitly nulled so
 * the roster doesn't accumulate fake numbers on these five profiles.
 *
 * Photos, secondary photos and club logos stay empty on purpose - the admin
 * uploads them via the normal editor flow.
 */
class FicheReferencePlayersSeeder extends Seeder
{
    /**
     * Match/perf stats have NOT NULL + default 0 constraints in the schema.
     * We zero them out for the reference players so the roster doesn't show
     * fabricated numbers - 0 goals / 0 matches truthfully reflects the fact
     * that these fiches are not driven by match data.
     */
    private const RESET_TO_ZERO = [
        'matches_played', 'goals', 'assists', 'minutes_played',
        'shots', 'shots_on_target', 'xg', 'xa', 'key_passes',
        'pass_accuracy', 'dribbles_completed', 'tackles', 'interceptions',
        'duels_won', 'yellow_cards', 'red_cards', 'clean_sheets', 'saves',
    ];

    /**
     * Truly nullable columns that must not carry demo-generated values for
     * the reference players. Applied on top of the fiche-verified data via
     * updateOrCreate so re-seeding wipes any drift back to reality.
     */
    private const RESET_TO_NULL = [
        // Analytical
        'heatmap_grid', 'comparisons',
        'potential_rating', 'potential_label', 'scout_quote',
        // Physical
        'distance_avg_km', 'sprints_avg', 'top_speed_kmh', 'high_intensity_runs_avg',
        // Data provenance
        'stats_source', 'stats_updated_at', 'stats_reliability',
        // Scouting scoring
        'score_current', 'score_potential', 'score_club_fit', 'score_market',
        'score_risk', 'score_confidence', 'score_global', 'completeness_pct',
        'next_action', 'scout_summary', 'source_label', 'reliability_score',
        // Physical measurements not on any fiche
        'height',
    ];

    public function run(): void
    {
        $now = now()->format('Y');
        $reset = array_merge(
            array_fill_keys(self::RESET_TO_ZERO, 0),
            array_fill_keys(self::RESET_TO_NULL, null),
        );

        $players = [
            //
            // 1. Zoran-Mawel Batomi - violet fiche
            //    "L'AVENIR S'ÉCRIT MAINTENANT"
            //
            [
                'slug'           => 'zoran-mawel-batomi',
                'name'           => 'Zoran-Mawel Batomi',
                'age'            => 7,
                'date_of_birth'  => '2018-04-24',
                'position'       => 'Attaquant',
                'category'       => 'Attaquant',
                'club'           => 'Royal Sporting Club Anderlecht',
                'nationality'    => 'Belge',
                'preferred_foot' => 'Droit',
                'best_position'  => 'Attaquant de pointe',
                'playing_style'  => 'Percutant – Dribbleur',
                'mental_strengths' => ['Confiant', 'Persévérant', 'Compétiteur'],
                'objective'      => 'Devenir un joueur professionnel et inspirer les autres',
                'since'          => (int) $now,
                'bio'            => "Attaquant rapide, technique et percutant, Zoran-Mawel a un excellent sens du but et une grande capacité à faire la différence. Travailleur, ambitieux et doté d'un fort mental, il possède toutes les qualités pour devenir un grand joueur.",
                'strengths' => [
                    ['key' => 'speed',      'label' => 'Vitesse et explosivité'],
                    ['key' => 'technique',  'label' => 'Technique individuelle'],
                    ['key' => 'dribbling',  'label' => 'Dribbles et éliminations'],
                    ['key' => 'finishing',  'label' => 'Sens du but'],
                    ['key' => 'work_rate',  'label' => 'Travail et détermination'],
                ],
            ],

            //
            // 2. Camara Philan - navy fiche
            //
            [
                'slug'           => 'camara-philan',
                'name'           => 'Camara Philan',
                'age'            => 11,
                'date_of_birth'  => '2015-01-21',
                'position'       => 'Attaquant',
                'category'       => 'Attaquant',
                'club'           => 'KRC Genk',
                'nationality'    => 'Belge',
                'preferred_foot' => 'Droit',
                'since'          => (int) $now,
                'bio'            => null,
                'strengths'      => [],
                // Only the projet-sportif block is shown - no strengths list.
            ],

            //
            // 3. Saeed Adams - black-gold fiche, English
            //
            [
                'slug'           => 'saeed-adams',
                'name'           => 'Saeed Adams',
                'age'            => 16,
                'date_of_birth'  => '2009-10-17',
                'position'       => 'Striker / (Left, Right) Winger',
                'category'       => 'Attaquant',
                'club'           => 'KV Mechelen',
                'nationality'    => 'Ghanaian',
                'secondary_nationality' => 'Dutch',
                'languages_spoken' => ['English', 'Dutch'],
                'preferred_foot' => 'Droit',
                'best_position'  => 'Striker',
                'since'          => (int) $now,
                'bio'            => 'Dynamic and powerful forward with excellent pace, dribbling and finishing. Able to play as a striker or on both wings. Hardworking, disciplined and dedicated to constant improvement.',
                'strengths'      => [], // Saeed's fiche uses the profile bars, not a strengths list.
            ],

            //
            // 4. Destiny Megogo - black-gold fiche, French
            //
            [
                'slug'           => 'destiny-megogo',
                'name'           => 'Destiny Megogo',
                'age'            => 17,
                'date_of_birth'  => '2009-07-06',
                'position'       => 'Défenseur central',
                'category'       => 'Defenseur',
                'club'           => 'Borussia Mönchengladbach',
                'nationality'    => 'Espagnol',
                'preferred_foot' => 'Droit',
                'best_position'  => 'Défenseur central',
                'previous_club'  => 'KRC Genk',
                'since'          => (int) $now,
                'bio'            => "Défenseur central complet, doté d'une excellente lecture du jeu, d'un strong engagement et d'une grande maturité sur le terrain. Solide dans les duels, bon relanceur, et toujours concentré, Destiny incarne la nouvelle génération de défenseurs modernes.",
                'strengths' => [
                    ['key' => 'power',      'label' => 'Puissance et impact physique'],
                    ['key' => 'vision',     'label' => 'Lecture du jeu'],
                    ['key' => 'duels',      'label' => 'Qualité dans les duels'],
                    ['key' => 'passing',    'label' => 'Relance propre'],
                    ['key' => 'mental',     'label' => 'Mentalité professionnelle'],
                    ['key' => 'leadership', 'label' => 'Leadership et communication'],
                ],
            ],

            //
            // 5. Hanibal Tesfegabir Solomon - black-yellow fiche
            //    Motto: RESPECT · AMBITION · EXCELLENCE
            //
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
                'career_history' => [
                    ['years' => '2024 - 2026', 'club' => 'F91 Dudelange',   'logo_url' => null],
                    ['years' => '2023 - 2024', 'club' => 'RWDM Molenbeek',  'logo_url' => null],
                ],
                'since'          => (int) $now,
                'bio'            => "Chez RENEFOOTBALL, notre mission est d'accompagner Hanibal dans son développement et de l'ouvrir aux plus grands clubs européens.",
                'strengths' => [
                    ['key' => 'vision',     'label' => 'Vision du jeu'],
                    ['key' => 'technique',  'label' => 'Technique'],
                    ['key' => 'speed',      'label' => 'Vitesse'],
                    ['key' => 'creativity', 'label' => 'Créativité'],
                    ['key' => 'mental',     'label' => 'Mentalité de gagnant'],
                ],
            ],
        ];

        foreach ($players as $data) {
            $slug = $data['slug'];
            unset($data['slug']);

            Player::updateOrCreate(
                ['slug' => $slug],
                array_merge($reset, $data, ['is_published' => true]),
            );
        }
    }
}
