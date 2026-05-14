<?php

namespace App\Models\Scouting;

use App\Models\Player;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerAlias extends Model
{
    protected $fillable = [
        'player_id',
        'alias',
        'source_type',
    ];

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}
