<?php

namespace App\Models\Scouting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ClubDnaProfile extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'position',
        'category',
        'description',
        'attributes',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'attributes' => 'array',
            'active' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected static function booted(): void
    {
        static::creating(function (self $p) {
            if (empty($p->slug)) {
                $base = Str::slug($p->name ?: 'profil');
                $slug = $base; $i = 2;
                while (self::where('slug', $slug)->exists()) { $slug = "{$base}-{$i}"; $i++; }
                $p->slug = $slug;
            }
        });
    }
}
