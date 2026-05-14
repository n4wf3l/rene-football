<?php

namespace App\Models\Scouting;

use App\Models\Player;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Shortlist extends Model
{
    public const STATUSES = ['active', 'closed', 'archived'];

    public const STAGES = ['watchlist', 'shortlist_b', 'shortlist_a', 'valide', 'rejete'];

    protected $fillable = [
        'slug',
        'name',
        'recruitment_need_id',
        'description',
        'season',
        'status',
        'created_by',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function entries(): HasMany
    {
        return $this->hasMany(ShortlistPlayer::class);
    }

    public function players(): BelongsToMany
    {
        return $this
            ->belongsToMany(Player::class, 'shortlist_players')
            ->withPivot(['id', 'rank', 'stage', 'reason', 'next_action', 'estimated_price', 'risk_level', 'confidence_score'])
            ->withTimestamps();
    }

    public function need(): BelongsTo
    {
        return $this->belongsTo(RecruitmentNeed::class, 'recruitment_need_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    protected static function booted(): void
    {
        static::creating(function (self $s) {
            if (empty($s->slug)) {
                $base = Str::slug($s->name ?: 'shortlist');
                $slug = $base; $i = 2;
                while (self::where('slug', $slug)->exists()) { $slug = "{$base}-{$i}"; $i++; }
                $s->slug = $slug;
            }
        });
    }
}
