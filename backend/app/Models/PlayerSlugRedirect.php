<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A former slug of a player, kept so his old URL redirects to the current one. */
class PlayerSlugRedirect extends Model
{
    protected $fillable = ['slug', 'player_id'];

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}
