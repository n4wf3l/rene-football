<?php

namespace App\Models\Scouting;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class RecruitmentNeed extends Model
{
    public const STATUSES = ['actif', 'en_pause', 'cloture'];
    public const PRIORITIES = ['basse', 'moyenne', 'haute', 'urgente'];

    protected $fillable = [
        'slug',
        'title',
        'position',
        'priority',
        'season',
        'category',
        'budget_min',
        'budget_max',
        'age_min',
        'age_max',
        'preferred_foot',
        'profile_description',
        'required_attributes',
        'status',
        'deadline',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'budget_min' => 'integer',
            'budget_max' => 'integer',
            'age_min' => 'integer',
            'age_max' => 'integer',
            'required_attributes' => 'array',
            'deadline' => 'date',
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

    public function shortlists(): HasMany
    {
        return $this->hasMany(Shortlist::class);
    }

    protected static function booted(): void
    {
        static::creating(function (self $n) {
            if (empty($n->slug)) {
                $base = Str::slug($n->title ?: 'besoin');
                $slug = $base; $i = 2;
                while (self::where('slug', $slug)->exists()) { $slug = "{$base}-{$i}"; $i++; }
                $n->slug = $slug;
            }
        });
    }
}
