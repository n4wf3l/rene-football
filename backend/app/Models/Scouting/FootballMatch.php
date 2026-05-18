<?php

namespace App\Models\Scouting;

use App\Models\Player;
use App\Models\User;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class FootballMatch extends Model
{
    protected $fillable = [
        'slug',
        'kickoff_at',
        'competition',
        'season',
        'home_team',
        'away_team',
        'category',
        'venue',
        'score_home',
        'score_away',
        'notes',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'kickoff_at' => 'datetime',
            'score_home' => 'integer',
            'score_away' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(ScoutingReport::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ScoutAssignment::class);
    }

    public function quickObservations(): HasMany
    {
        return $this->hasMany(QuickObservation::class);
    }

    /** Players observed during this match - derived through scouting_reports. */
    public function observedPlayers()
    {
        return Player::query()
            ->whereIn('id', $this->reports()->pluck('player_id'));
    }

    /** Auto-generate a unique slug from home/away + date. */
    protected static function booted(): void
    {
        static::creating(function (self $m) {
            if (empty($m->slug)) {
                $base = Str::slug(($m->home_team ?? '') . '-vs-' . ($m->away_team ?? '') . '-' . optional($m->kickoff_at)->format('Y-m-d'));
                $base = $base !== '' ? $base : 'match-'.now()->format('YmdHis');
                $slug = $base; $i = 2;
                while (self::where('slug', $slug)->exists()) { $slug = "{$base}-{$i}"; $i++; }
                $m->slug = $slug;
            }
        });
    }
}
