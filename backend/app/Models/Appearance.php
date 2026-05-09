<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appearance extends Model
{
    protected $fillable = [
        'player_id',
        'match_date',
        'competition',
        'opponent',
        'home',
        'score_team',
        'score_opponent',
        'minutes_played',
        'goals',
        'assists',
        'shots',
        'shots_on_target',
        'yellow_card',
        'red_card',
        'rating',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'match_date'      => 'date',
            'home'            => 'boolean',
            'score_team'      => 'integer',
            'score_opponent'  => 'integer',
            'minutes_played'  => 'integer',
            'goals'           => 'integer',
            'assists'         => 'integer',
            'shots'           => 'integer',
            'shots_on_target' => 'integer',
            'yellow_card'     => 'boolean',
            'red_card'        => 'boolean',
            'rating'          => 'float',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}
