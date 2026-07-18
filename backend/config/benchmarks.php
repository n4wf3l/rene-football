<?php

/**
 * Position × age-tier reference profiles used to contextualize player stats.
 *
 * Each entry is [ metric => [ 'avg' => x, 'elite' => y, 'unit' => optional ] ].
 * A player is compared against the profile matching their position category
 * and age tier: percentile becomes a distance from `avg` normalized against
 * `elite`, so "80% of elite" reads as "top of the pack for that role".
 *
 * These numbers are anchored to publicly documented averages for European
 * pro football (UEFA competitions + top 5 leagues, blended). They are
 * intentionally *conservative* medians rather than headline stats so a
 * player matching them looks credible without being oversold. When you
 * import better sources (Wyscout / Statsbomb bulk exports), lift these.
 *
 * Age tiers:
 *   u18   : academy (< 18)
 *   u21   : late formation (18-20)
 *   young : peak development (21-25)
 *   prime : peak career (26-30)
 *   vet   : late career (31+)
 *
 * All per-match metrics are the per-match rate (not per-90) so they can be
 * compared directly to player.<field> which is stored as per-match.
 */
return [
    'Gardien' => [
        'u18' => [
            'clean_sheets'    => ['avg' => 0.20, 'elite' => 0.45],
            'saves'           => ['avg' => 2.4,  'elite' => 4.5],
            'pass_accuracy'   => ['avg' => 68.0, 'elite' => 82.0, 'unit' => '%'],
            'distance_avg_km' => ['avg' => 5.2,  'elite' => 6.1,  'unit' => 'km'],
        ],
        'u21' => [
            'clean_sheets'    => ['avg' => 0.25, 'elite' => 0.50],
            'saves'           => ['avg' => 3.0,  'elite' => 5.2],
            'pass_accuracy'   => ['avg' => 72.0, 'elite' => 86.0, 'unit' => '%'],
            'distance_avg_km' => ['avg' => 5.3,  'elite' => 6.2,  'unit' => 'km'],
        ],
        'young' => [
            'clean_sheets'    => ['avg' => 0.28, 'elite' => 0.55],
            'saves'           => ['avg' => 3.2,  'elite' => 5.5],
            'pass_accuracy'   => ['avg' => 75.0, 'elite' => 88.0, 'unit' => '%'],
            'distance_avg_km' => ['avg' => 5.3,  'elite' => 6.3,  'unit' => 'km'],
        ],
        'prime' => [
            'clean_sheets'    => ['avg' => 0.32, 'elite' => 0.58],
            'saves'           => ['avg' => 3.3,  'elite' => 5.6],
            'pass_accuracy'   => ['avg' => 78.0, 'elite' => 90.0, 'unit' => '%'],
            'distance_avg_km' => ['avg' => 5.3,  'elite' => 6.4,  'unit' => 'km'],
        ],
        'vet' => [
            'clean_sheets'    => ['avg' => 0.30, 'elite' => 0.55],
            'saves'           => ['avg' => 3.1,  'elite' => 5.3],
            'pass_accuracy'   => ['avg' => 77.0, 'elite' => 89.0, 'unit' => '%'],
            'distance_avg_km' => ['avg' => 5.2,  'elite' => 6.2,  'unit' => 'km'],
        ],
    ],

    'Defenseur' => [
        'u18' => [
            'tackles'          => ['avg' => 1.4, 'elite' => 3.0],
            'interceptions'    => ['avg' => 1.2, 'elite' => 2.8],
            'duels_won'        => ['avg' => 3.5, 'elite' => 6.5],
            'pass_accuracy'    => ['avg' => 76.0,'elite' => 90.0, 'unit' => '%'],
            'distance_avg_km'  => ['avg' => 9.5, 'elite' => 11.2, 'unit' => 'km'],
            'top_speed_kmh'    => ['avg' => 30.0,'elite' => 34.0, 'unit' => 'km/h'],
        ],
        'u21' => [
            'tackles'          => ['avg' => 1.7, 'elite' => 3.3],
            'interceptions'    => ['avg' => 1.4, 'elite' => 3.0],
            'duels_won'        => ['avg' => 4.0, 'elite' => 7.0],
            'pass_accuracy'    => ['avg' => 80.0,'elite' => 92.0, 'unit' => '%'],
            'distance_avg_km'  => ['avg' => 10.1,'elite' => 11.8, 'unit' => 'km'],
            'top_speed_kmh'    => ['avg' => 31.0,'elite' => 35.0, 'unit' => 'km/h'],
        ],
        'young' => [
            'tackles'          => ['avg' => 1.9, 'elite' => 3.5],
            'interceptions'    => ['avg' => 1.6, 'elite' => 3.2],
            'duels_won'        => ['avg' => 4.5, 'elite' => 7.5],
            'pass_accuracy'    => ['avg' => 83.0,'elite' => 93.0, 'unit' => '%'],
            'distance_avg_km'  => ['avg' => 10.5,'elite' => 12.0, 'unit' => 'km'],
            'top_speed_kmh'    => ['avg' => 31.5,'elite' => 35.5, 'unit' => 'km/h'],
        ],
        'prime' => [
            'tackles'          => ['avg' => 2.0, 'elite' => 3.6],
            'interceptions'    => ['avg' => 1.7, 'elite' => 3.3],
            'duels_won'        => ['avg' => 4.6, 'elite' => 7.5],
            'pass_accuracy'    => ['avg' => 85.0,'elite' => 94.0, 'unit' => '%'],
            'distance_avg_km'  => ['avg' => 10.6,'elite' => 12.1, 'unit' => 'km'],
            'top_speed_kmh'    => ['avg' => 31.0,'elite' => 35.0, 'unit' => 'km/h'],
        ],
        'vet' => [
            'tackles'          => ['avg' => 1.8, 'elite' => 3.3],
            'interceptions'    => ['avg' => 1.6, 'elite' => 3.1],
            'duels_won'        => ['avg' => 4.3, 'elite' => 7.0],
            'pass_accuracy'    => ['avg' => 84.0,'elite' => 93.0, 'unit' => '%'],
            'distance_avg_km'  => ['avg' => 10.3,'elite' => 11.8, 'unit' => 'km'],
            'top_speed_kmh'    => ['avg' => 30.0,'elite' => 34.0, 'unit' => 'km/h'],
        ],
    ],

    'Milieu' => [
        'u18' => [
            'goals'              => ['avg' => 0.10, 'elite' => 0.35],
            'assists'            => ['avg' => 0.10, 'elite' => 0.35],
            'xg'                 => ['avg' => 0.12, 'elite' => 0.40],
            'xa'                 => ['avg' => 0.12, 'elite' => 0.38],
            'key_passes'         => ['avg' => 1.2,  'elite' => 2.8],
            'pass_accuracy'      => ['avg' => 78.0, 'elite' => 91.0, 'unit' => '%'],
            'dribbles_completed' => ['avg' => 0.8,  'elite' => 2.2],
            'tackles'            => ['avg' => 1.1,  'elite' => 2.8],
            'distance_avg_km'    => ['avg' => 10.5, 'elite' => 12.2, 'unit' => 'km'],
        ],
        'u21' => [
            'goals'              => ['avg' => 0.14, 'elite' => 0.40],
            'assists'            => ['avg' => 0.14, 'elite' => 0.40],
            'xg'                 => ['avg' => 0.16, 'elite' => 0.45],
            'xa'                 => ['avg' => 0.15, 'elite' => 0.42],
            'key_passes'         => ['avg' => 1.5,  'elite' => 3.2],
            'pass_accuracy'      => ['avg' => 82.0, 'elite' => 93.0, 'unit' => '%'],
            'dribbles_completed' => ['avg' => 1.0,  'elite' => 2.6],
            'tackles'            => ['avg' => 1.3,  'elite' => 3.0],
            'distance_avg_km'    => ['avg' => 11.0, 'elite' => 12.6, 'unit' => 'km'],
        ],
        'young' => [
            'goals'              => ['avg' => 0.16, 'elite' => 0.45],
            'assists'            => ['avg' => 0.16, 'elite' => 0.45],
            'xg'                 => ['avg' => 0.18, 'elite' => 0.50],
            'xa'                 => ['avg' => 0.17, 'elite' => 0.48],
            'key_passes'         => ['avg' => 1.7,  'elite' => 3.5],
            'pass_accuracy'      => ['avg' => 85.0, 'elite' => 94.0, 'unit' => '%'],
            'dribbles_completed' => ['avg' => 1.2,  'elite' => 2.8],
            'tackles'            => ['avg' => 1.4,  'elite' => 3.1],
            'distance_avg_km'    => ['avg' => 11.2, 'elite' => 12.8, 'unit' => 'km'],
        ],
        'prime' => [
            'goals'              => ['avg' => 0.17, 'elite' => 0.48],
            'assists'            => ['avg' => 0.17, 'elite' => 0.48],
            'xg'                 => ['avg' => 0.19, 'elite' => 0.52],
            'xa'                 => ['avg' => 0.18, 'elite' => 0.50],
            'key_passes'         => ['avg' => 1.8,  'elite' => 3.6],
            'pass_accuracy'      => ['avg' => 86.0, 'elite' => 95.0, 'unit' => '%'],
            'dribbles_completed' => ['avg' => 1.2,  'elite' => 2.8],
            'tackles'            => ['avg' => 1.4,  'elite' => 3.0],
            'distance_avg_km'    => ['avg' => 11.1, 'elite' => 12.7, 'unit' => 'km'],
        ],
        'vet' => [
            'goals'              => ['avg' => 0.14, 'elite' => 0.40],
            'assists'            => ['avg' => 0.15, 'elite' => 0.42],
            'xg'                 => ['avg' => 0.16, 'elite' => 0.45],
            'xa'                 => ['avg' => 0.16, 'elite' => 0.44],
            'key_passes'         => ['avg' => 1.6,  'elite' => 3.2],
            'pass_accuracy'      => ['avg' => 85.0, 'elite' => 94.0, 'unit' => '%'],
            'dribbles_completed' => ['avg' => 1.0,  'elite' => 2.5],
            'tackles'            => ['avg' => 1.3,  'elite' => 2.8],
            'distance_avg_km'    => ['avg' => 10.7, 'elite' => 12.2, 'unit' => 'km'],
        ],
    ],

    'Attaquant' => [
        'u18' => [
            'goals'              => ['avg' => 0.22, 'elite' => 0.65],
            'assists'            => ['avg' => 0.12, 'elite' => 0.35],
            'xg'                 => ['avg' => 0.25, 'elite' => 0.70],
            'xa'                 => ['avg' => 0.13, 'elite' => 0.38],
            'shots_on_target'    => ['avg' => 0.9,  'elite' => 2.4],
            'dribbles_completed' => ['avg' => 1.2,  'elite' => 3.0],
            'key_passes'         => ['avg' => 1.0,  'elite' => 2.6],
            'top_speed_kmh'      => ['avg' => 30.5, 'elite' => 34.5, 'unit' => 'km/h'],
        ],
        'u21' => [
            'goals'              => ['avg' => 0.28, 'elite' => 0.75],
            'assists'            => ['avg' => 0.14, 'elite' => 0.40],
            'xg'                 => ['avg' => 0.30, 'elite' => 0.80],
            'xa'                 => ['avg' => 0.15, 'elite' => 0.42],
            'shots_on_target'    => ['avg' => 1.1,  'elite' => 2.7],
            'dribbles_completed' => ['avg' => 1.4,  'elite' => 3.2],
            'key_passes'         => ['avg' => 1.2,  'elite' => 2.8],
            'top_speed_kmh'      => ['avg' => 31.5, 'elite' => 35.5, 'unit' => 'km/h'],
        ],
        'young' => [
            'goals'              => ['avg' => 0.32, 'elite' => 0.85],
            'assists'            => ['avg' => 0.16, 'elite' => 0.45],
            'xg'                 => ['avg' => 0.33, 'elite' => 0.90],
            'xa'                 => ['avg' => 0.17, 'elite' => 0.48],
            'shots_on_target'    => ['avg' => 1.2,  'elite' => 3.0],
            'dribbles_completed' => ['avg' => 1.5,  'elite' => 3.4],
            'key_passes'         => ['avg' => 1.3,  'elite' => 3.0],
            'top_speed_kmh'      => ['avg' => 32.0, 'elite' => 36.0, 'unit' => 'km/h'],
        ],
        'prime' => [
            'goals'              => ['avg' => 0.35, 'elite' => 0.90],
            'assists'            => ['avg' => 0.17, 'elite' => 0.48],
            'xg'                 => ['avg' => 0.36, 'elite' => 0.95],
            'xa'                 => ['avg' => 0.18, 'elite' => 0.50],
            'shots_on_target'    => ['avg' => 1.3,  'elite' => 3.1],
            'dribbles_completed' => ['avg' => 1.5,  'elite' => 3.4],
            'key_passes'         => ['avg' => 1.3,  'elite' => 3.0],
            'top_speed_kmh'      => ['avg' => 31.5, 'elite' => 35.5, 'unit' => 'km/h'],
        ],
        'vet' => [
            'goals'              => ['avg' => 0.30, 'elite' => 0.80],
            'assists'            => ['avg' => 0.16, 'elite' => 0.45],
            'xg'                 => ['avg' => 0.31, 'elite' => 0.82],
            'xa'                 => ['avg' => 0.17, 'elite' => 0.46],
            'shots_on_target'    => ['avg' => 1.2,  'elite' => 2.9],
            'dribbles_completed' => ['avg' => 1.3,  'elite' => 3.0],
            'key_passes'         => ['avg' => 1.2,  'elite' => 2.7],
            'top_speed_kmh'      => ['avg' => 30.0, 'elite' => 34.0, 'unit' => 'km/h'],
        ],
    ],
];
