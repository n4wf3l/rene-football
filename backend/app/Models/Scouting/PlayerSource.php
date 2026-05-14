<?php

namespace App\Models\Scouting;

use App\Models\Player;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerSource extends Model
{
    public const SOURCE_TYPES = ['scout', 'officiel', 'feuille_match', 'video', 'agent', 'autre'];

    protected $fillable = [
        'player_id',
        'field_name',
        'value',
        'source_type',
        'source_label',
        'reliability_score',
        'added_by',
    ];

    protected function casts(): array
    {
        return [
            'reliability_score' => 'integer',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
