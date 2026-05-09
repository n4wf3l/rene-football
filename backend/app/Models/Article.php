<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Article extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'excerpt',
        'content',
        'category',
        'cover_url',
        'featured',
        'player_id',
        'is_published',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'featured'     => 'boolean',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ArticleImage::class)->orderBy('sort_order');
    }

    public function clips(): BelongsToMany
    {
        return $this->belongsToMany(PlayerClip::class, 'article_player_clip')
            ->withPivot('sort_order')
            ->withTimestamps()
            ->orderBy('article_player_clip.sort_order');
    }
}
