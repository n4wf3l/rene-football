<?php

namespace App\Models\Scouting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScoutProspect extends Model
{
    protected $fillable = [
        'workspace_id',
        // Identity
        'name', 'age', 'position', 'category', 'club', 'nationality',
        'preferred_foot', 'height', 'since', 'photo_url',
        // Scout observation
        'notes', 'strengths', 'weaknesses', 'rating', 'potential_rating',
        'recommendation', 'status', 'next_action',
        // Stats snapshot
        'matches_played', 'goals', 'assists', 'xg', 'xa', 'minutes_played',
    ];

    protected function casts(): array
    {
        return [
            'age'              => 'integer',
            'since'            => 'integer',
            'rating'           => 'float',
            'potential_rating' => 'float',
            'matches_played'   => 'integer',
            'goals'            => 'integer',
            'assists'          => 'integer',
            'xg'               => 'float',
            'xa'               => 'float',
            'minutes_played'   => 'integer',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(ScoutWorkspace::class, 'workspace_id');
    }
}
