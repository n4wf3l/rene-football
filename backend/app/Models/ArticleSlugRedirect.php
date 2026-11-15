<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A former slug of an article, kept so its old URL redirects to the current one. */
class ArticleSlugRedirect extends Model
{
    protected $fillable = ['slug', 'article_id'];

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
