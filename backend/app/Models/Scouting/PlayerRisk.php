<?php

namespace App\Models\Scouting;

use App\Models\Player;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerRisk extends Model
{
    public const TYPES = ['sportif', 'physique', 'mental', 'adaptation', 'marche', 'entourage', 'blessure'];
    public const STATUSES = ['ouvert', 'surveille', 'resolu'];
    public const LEVELS = ['faible', 'moyen', 'eleve'];
    public const PROBABILITIES = ['faible', 'moyenne', 'elevee'];

    protected $fillable = [
        'player_id',
        'risk_type',
        'title',
        'description',
        'probability',
        'impact',
        'mitigation_plan',
        'status',
        'created_by',
    ];

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
