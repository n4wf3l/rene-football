<?php

namespace App\Models\Scouting;

use App\Models\Player;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScoutingReport extends Model
{
    public const STATUSES = ['draft', 'submitted', 'needs_changes', 'validated', 'archived'];

    public const RECOMMENDATIONS = [
        'ne_pas_poursuivre',
        'a_revoir',
        'watchlist',
        'shortlist_b',
        'shortlist_a',
        'recruter',
    ];

    protected $fillable = [
        'player_id',
        'football_match_id',
        'scout_id',
        'observed_position',
        'minutes_observed',
        'context',
        'tactical_role',
        'strengths',
        'weaknesses',
        'key_actions',
        'global_rating',
        'current_level',
        'potential_level',
        'recommendation',
        'next_action',
        'status',
        'submitted_at',
        'submitted_to',
        'validated_by',
        'validated_at',
    ];

    protected function casts(): array
    {
        return [
            'minutes_observed' => 'integer',
            'key_actions' => 'array',
            'global_rating' => 'float',
            'current_level' => 'float',
            'potential_level' => 'float',
            'submitted_at' => 'datetime',
            'validated_at' => 'datetime',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'football_match_id');
    }

    public function scout(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scout_id');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    /** Recipient currently expected to action this report (validate / send back). */
    public function submittedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_to');
    }

    public function scores(): HasMany
    {
        return $this->hasMany(ReportScore::class);
    }

    public function transitions(): HasMany
    {
        return $this->hasMany(ScoutingReportTransition::class)->orderBy('created_at');
    }
}
