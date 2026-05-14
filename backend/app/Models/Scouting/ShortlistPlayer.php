<?php

namespace App\Models\Scouting;

use App\Models\Player;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShortlistPlayer extends Model
{
    protected $fillable = [
        'shortlist_id',
        'player_id',
        'rank',
        'stage',
        'reason',
        'next_action',
        'estimated_price',
        'risk_level',
        'confidence_score',
    ];

    protected function casts(): array
    {
        return [
            'rank' => 'integer',
            'estimated_price' => 'integer',
            'confidence_score' => 'float',
        ];
    }

    public function shortlist(): BelongsTo
    {
        return $this->belongsTo(Shortlist::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}
