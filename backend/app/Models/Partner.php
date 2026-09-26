<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Partner extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'role',
        'logo_url',
        'website_url',
        'country_code',
        'country_label',
        'sort_order',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'sort_order'   => 'integer',
            'is_published' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
