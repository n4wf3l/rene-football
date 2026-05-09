<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    public function appearances(): HasMany
    {
        return $this->hasMany(Appearance::class)->orderBy('match_date', 'desc');
    }

    public function clips(): HasMany
    {
        return $this->hasMany(PlayerClip::class)->orderBy('created_at', 'desc');
    }

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
        'comparisons',
        'strengths',
        'potential_rating',
        'potential_label',
        'scout_quote',
        'tags',
        'distance_avg_km',
        'sprints_avg',
        'top_speed_kmh',
        'high_intensity_runs_avg',
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
            'comparisons' => 'array',
            'strengths' => 'array',
            'tags' => 'array',
            'potential_rating' => 'float',
            'distance_avg_km' => 'float',
            'sprints_avg' => 'integer',
            'top_speed_kmh' => 'float',
            'high_intensity_runs_avg' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
