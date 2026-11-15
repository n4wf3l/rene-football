<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One anonymous page view. See the create_page_views_table migration for
 * what is (and is deliberately not) stored.
 */
class PageView extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'path',
        'resource_type',
        'slug',
        'visitor_hash',
        'is_entry',
        'referrer_host',
        'viewed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_entry'  => 'boolean',
            'viewed_at' => 'datetime',
        ];
    }
}
