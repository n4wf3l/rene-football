<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Player extends Model
{
    /** @use HasFactory<\Database\Factories\PlayerFactory> */
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'age',
        'height',
        'position',
        'category',
        'club',
        'nationality',
        'preferred_foot',
        'since',
        'photo_url',
        'bio',
        'matches_played',
        'goals',
        'assists',
        'minutes_played',
        'shots',
        'shots_on_target',
        'xg',
        'xa',
        'key_passes',
        'pass_accuracy',
        'dribbles_completed',
        'tackles',
        'interceptions',
        'duels_won',
        'yellow_cards',
        'red_cards',
        'clean_sheets',
        'saves',
        'heatmap_grid',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'age' => 'integer',
            'since' => 'integer',
            'matches_played' => 'integer',
            'goals' => 'integer',
            'assists' => 'integer',
            'minutes_played' => 'integer',
            'shots' => 'integer',
            'shots_on_target' => 'integer',
            'xg' => 'float',
            'xa' => 'float',
            'key_passes' => 'integer',
            'pass_accuracy' => 'float',
            'dribbles_completed' => 'integer',
            'tackles' => 'integer',
            'interceptions' => 'integer',
            'duels_won' => 'integer',
            'yellow_cards' => 'integer',
            'red_cards' => 'integer',
            'clean_sheets' => 'integer',
            'saves' => 'integer',
            'heatmap_grid' => 'array',
            'is_published' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
