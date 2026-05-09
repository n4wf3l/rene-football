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
                // Single player in his category — every metric is by definition 50.
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
                ['key' => 'age',                 'label' => 'Age'],
                ['key' => 'matches_played',      'label' => 'Matchs joues'],
                ['key' => 'goals',               'label' => 'Buts'],
                ['key' => 'assists',             'label' => 'Passes decisives'],
                ['key' => 'minutes_played',      'label' => 'Minutes jouees'],
                ['key' => 'shots',               'label' => 'Tirs'],
                ['key' => 'shots_on_target',     'label' => 'Tirs cadres'],
                ['key' => 'xg',                  'label' => 'xG'],
                ['key' => 'xa',                  'label' => 'xA'],
                ['key' => 'key_passes',          'label' => 'Passes cles'],
                ['key' => 'pass_accuracy',       'label' => '% passes reussies'],
                ['key' => 'dribbles_completed',  'label' => 'Dribbles reussis'],
                ['key' => 'tackles',             'label' => 'Tacles'],
                ['key' => 'interceptions',       'label' => 'Interceptions'],
                ['key' => 'duels_won',           'label' => 'Duels gagnes'],
                ['key' => 'yellow_cards',        'label' => 'Cartons jaunes'],
                ['key' => 'red_cards',           'label' => 'Cartons rouges'],
                ['key' => 'clean_sheets',        'label' => 'Clean sheets'],
                ['key' => 'saves',               'label' => 'Arrets'],
            ],
            'categorical' => [
                ['key' => 'category',       'label' => 'Categorie'],
                ['key' => 'position',       'label' => 'Poste'],
                ['key' => 'nationality',    'label' => 'Nationalite'],
                ['key' => 'preferred_foot', 'label' => 'Pied fort'],
                ['key' => 'club',           'label' => 'Club'],
            ],
        ]);
    }
}
