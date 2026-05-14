<?php

namespace App\Models;

use App\Models\Scouting\PlayerAlias;
use App\Models\Scouting\PlayerRisk;
use App\Models\Scouting\PlayerSource;
use App\Models\Scouting\PlayerStatusHistory;
use App\Models\Scouting\ScoutingReport;
use App\Models\Scouting\ShortlistPlayer;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    public const SCOUTING_STATUSES = [
        'decouvert', 'watchlist', 'shortlist_b', 'shortlist_a', 'valide', 'rejete', 'archive',
    ];

    public function appearances(): HasMany
    {
        return $this->hasMany(Appearance::class)->orderBy('match_date', 'desc');
    }

    public function clips(): HasMany
    {
        return $this->hasMany(PlayerClip::class)->orderBy('created_at', 'desc');
    }

    /* ---- Scouting relations ---- */

    public function scoutingReports(): HasMany
    {
        return $this->hasMany(ScoutingReport::class)->orderByDesc('created_at');
    }

    public function risks(): HasMany
    {
        return $this->hasMany(PlayerRisk::class)->orderByDesc('created_at');
    }

    public function aliases(): HasMany
    {
        return $this->hasMany(PlayerAlias::class);
    }

    public function sources(): HasMany
    {
        return $this->hasMany(PlayerSource::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(PlayerStatusHistory::class)->orderByDesc('created_at');
    }

    public function shortlistEntries(): HasMany
    {
        return $this->hasMany(ShortlistPlayer::class);
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
        // Scouting
        'scouting_status',
        'score_current',
        'score_potential',
        'score_club_fit',
        'score_market',
        'score_risk',
        'score_confidence',
        'score_global',
        'completeness_pct',
        'next_action',
        'scout_summary',
        'source_label',
        'reliability_score',
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
            // Scouting
            'score_current'     => 'float',
            'score_potential'   => 'float',
            'score_club_fit'    => 'float',
            'score_market'      => 'float',
            'score_risk'        => 'float',
            'score_confidence'  => 'float',
            'score_global'      => 'float',
            'completeness_pct'  => 'integer',
            'reliability_score' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
