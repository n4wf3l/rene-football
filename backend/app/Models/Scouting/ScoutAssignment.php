<?php

namespace App\Models\Scouting;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScoutAssignment extends Model
{
    public const STATUSES = ['a_faire', 'en_cours', 'rapport_soumis', 'a_completer', 'valide'];
    public const PRIORITIES = ['basse', 'moyenne', 'haute', 'urgente'];

    protected $fillable = [
        'title',
        'football_match_id',
        'assigned_to',
        'assigned_by',
        'priority',
        'objective',
        'players_to_watch',
        'due_date',
        'status',
        'checklist',
    ];

    protected function casts(): array
    {
        return [
            'players_to_watch' => 'array',
            'checklist' => 'array',
            'due_date' => 'date',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'football_match_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
