<?php

namespace App\Models\Scouting;

use App\Models\Player;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuickObservation extends Model
{
    public const KINDS = ['positif', 'negatif', 'offensif', 'defensif', 'mental', 'video', 'key_moment'];
    public const IMPACTS = ['faible', 'moyen', 'fort'];

    protected $fillable = [
        'football_match_id',
        'player_id',
        'scout_id',
        'minute',
        'kind',
        'note',
        'impact',
    ];

    protected function casts(): array
    {
        return [
            'minute' => 'integer',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'football_match_id');
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function scout(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scout_id');
    }
}
