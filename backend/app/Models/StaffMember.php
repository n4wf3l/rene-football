<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffMember extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'role',
        'bio',
        'photo_url',
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
