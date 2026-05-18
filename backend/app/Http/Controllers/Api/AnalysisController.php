<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Illuminate\Http\JsonResponse;

class AnalysisController extends Controller
{
    /**
     * Numeric metrics that make sense to rank against the population.
     * "lower_is_better" inverts the percentile (e.g. yellow_cards: low = top).
     */
    private const RANKABLE_METRICS = [
        'matches_played'      => false,
        'goals'               => false,
        'assists'             => false,
        'minutes_played'      => false,
        'shots'               => false,
        'shots_on_target'     => false,
        'xg'                  => false,
        'xa'                  => false,
        'key_passes'          => false,
        'pass_accuracy'       => false,
        'dribbles_completed'  => false,
        'tackles'             => false,
        'interceptions'       => false,
        'duels_won'           => false,
        'clean_sheets'        => false,
        'saves'               => false,
        'yellow_cards'        => true,
        'red_cards'           => true,
    ];

    /**
     * Returns each player's percentile rank within their *category* for every
     * rankable metric. Pre-computed server-side so the frontend can drop a
     * single request payload onto any player profile.
     *
     * Shape: { byCategory: { Attaquant: ['mehdi', 'idriss',...] }, percentiles: { 'mehdi-boukar': { goals: 73.2, xg: 88, ... } } }
     */
    public function percentiles(): JsonResponse
    {
        $players = Player::query()->where('is_published', true)->get();

        $byCategory = [];
        foreach ($players as $p) {
            $byCategory[$p->category][] = $p;
        }

        $out = [];
        foreach ($byCategory as $category => $group) {
            $count = count($group);
            if ($count < 2) {
                // Single player in his category - every metric is by definition 50.
                foreach ($group as $p) {
                    $out[$p->slug] = array_fill_keys(array_keys(self::RANKABLE_METRICS), 50.0);
                }
                continue;
            }

            foreach (self::RANKABLE_METRICS as $metric => $lowerIsBetter) {
                $values = array_map(fn ($p) => (float) ($p->{$metric} ?? 0), $group);
                foreach ($group as $idx => $p) {
                    $self = $values[$idx];
                    // Number of peers strictly worse than self (or strictly better when lowerIsBetter).
                    $beaten = 0;
                    foreach ($values as $j => $v) {
                        if ($j === $idx) continue;
                        $isBetter = $lowerIsBetter ? ($v > $self) : ($v < $self);
                        if ($isBetter) $beaten++;
                    }
                    $pct = $count > 1 ? round(($beaten / ($count - 1)) * 100, 1) : 50.0;
                    $out[$p->slug][$metric] = $pct;
                }
            }
        }

        return response()->json([
            'data' => [
                'category_size' => array_map(fn ($g) => count($g), $byCategory),
                'percentiles'   => $out,
            ],
        ]);
    }

    public function metrics(): JsonResponse
    {
        return response()->json([
            'numeric' => [
                // ---- Identite ----
                ['key' => 'age',                 'label' => 'Age',                 'group' => 'identite'],

                // ---- Stats brutes (per-90 capable) ----
                ['key' => 'matches_played',      'label' => 'Matchs joues',        'group' => 'stats'],
                ['key' => 'minutes_played',      'label' => 'Minutes jouees',      'group' => 'stats'],
                ['key' => 'goals',               'label' => 'Buts',                'group' => 'stats', 'per90' => true],
                ['key' => 'assists',             'label' => 'Passes decisives',    'group' => 'stats', 'per90' => true],
                ['key' => 'shots',               'label' => 'Tirs',                'group' => 'stats', 'per90' => true],
                ['key' => 'shots_on_target',     'label' => 'Tirs cadres',         'group' => 'stats', 'per90' => true],
                ['key' => 'xg',                  'label' => 'xG',                  'group' => 'stats', 'per90' => true],
                ['key' => 'xa',                  'label' => 'xA',                  'group' => 'stats', 'per90' => true],
                ['key' => 'key_passes',          'label' => 'Passes cles',         'group' => 'stats', 'per90' => true],
                ['key' => 'pass_accuracy',       'label' => 'Precision passes',    'group' => 'stats', 'unit' => '%'],
                ['key' => 'dribbles_completed',  'label' => 'Dribbles reussis',    'group' => 'stats', 'per90' => true],
                ['key' => 'tackles',             'label' => 'Tacles',              'group' => 'stats', 'per90' => true],
                ['key' => 'interceptions',       'label' => 'Interceptions',       'group' => 'stats', 'per90' => true],
                ['key' => 'duels_won',           'label' => 'Duels gagnes',        'group' => 'stats', 'per90' => true],
                ['key' => 'yellow_cards',        'label' => 'Cartons jaunes',      'group' => 'stats'],
                ['key' => 'red_cards',           'label' => 'Cartons rouges',      'group' => 'stats'],
                ['key' => 'clean_sheets',        'label' => 'Clean sheets',        'group' => 'stats'],
                ['key' => 'saves',               'label' => 'Arrets',              'group' => 'stats', 'per90' => true],

                // ---- Tracking physique ----
                ['key' => 'distance_avg_km',       'label' => 'Distance / match',  'group' => 'tracking', 'unit' => 'km'],
                ['key' => 'sprints_avg',           'label' => 'Sprints / match',   'group' => 'tracking'],
                ['key' => 'top_speed_kmh',         'label' => 'Vitesse max',       'group' => 'tracking', 'unit' => 'km/h'],
                ['key' => 'high_intensity_runs_avg','label' => 'Courses HI / match','group' => 'tracking'],

                // ---- Scouting (pont avec /admin/scouting) ----
                ['key' => 'score_global',        'label' => 'Score global',       'group' => 'scouting'],
                ['key' => 'score_current',       'label' => 'Niveau actuel',      'group' => 'scouting'],
                ['key' => 'score_potential',     'label' => 'Potentiel',          'group' => 'scouting'],
                ['key' => 'score_club_fit',      'label' => 'Adequation club',    'group' => 'scouting'],
                ['key' => 'score_market',        'label' => 'Marche',             'group' => 'scouting'],
                ['key' => 'score_risk',          'label' => 'Risque',             'group' => 'scouting'],
                ['key' => 'score_confidence',    'label' => 'Confiance',          'group' => 'scouting'],
                ['key' => 'completeness_pct',    'label' => 'Completude dossier', 'group' => 'scouting', 'unit' => '%'],
                ['key' => 'reliability_score',   'label' => 'Fiabilite source',   'group' => 'scouting', 'unit' => '%'],
                ['key' => 'potential_rating',    'label' => 'Note potentiel (0-10)','group' => 'scouting'],
            ],
            'categorical' => [
                ['key' => 'category',         'label' => 'Categorie'],
                ['key' => 'position',         'label' => 'Poste'],
                ['key' => 'nationality',      'label' => 'Nationalite'],
                ['key' => 'preferred_foot',   'label' => 'Pied fort'],
                ['key' => 'club',             'label' => 'Club'],
                ['key' => 'scouting_status',  'label' => 'Statut scouting'],
            ],
        ]);
    }
}
