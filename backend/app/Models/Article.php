<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Article extends Model
{
    /** @use HasFactory<\Database\Factories\ArticleFactory> */
    use HasFactory;

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

    /**
     * A slug change (title edited in the admin) keeps the former slug as a
     * redirect, so URLs already shared or indexed keep working.
     */
    protected static function booted(): void
    {
        static::updated(function (Article $article) {
            if (! $article->wasChanged('slug')) {
                return;
            }
            $old = $article->getOriginal('slug');
            if ($old) {
                ArticleSlugRedirect::updateOrCreate(['slug' => $old], ['article_id' => $article->id]);
            }
            // The new slug is a live URL again: it no longer redirects anywhere.
            ArticleSlugRedirect::where('slug', $article->slug)->delete();
        });
    }

    /** The published article that used to live at this slug, if any. */
    public static function publishedFormerlyAt(string $slug): ?self
    {
        return static::query()
            ->where('is_published', true)
            ->whereHas('slugRedirects', fn ($q) => $q->where('slug', $slug))
            ->first();
    }

    public function slugRedirects(): HasMany
    {
        return $this->hasMany(ArticleSlugRedirect::class);
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
