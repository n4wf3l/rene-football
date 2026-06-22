<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Presentation extends Model
{
    protected $table = 'player_presentations';

    protected $fillable = [
        'player_id',
        'template_key',
        'title',
        'options',
        'file_path',
        'is_published',
        'public_token',
        'generated_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'options'      => 'array',
            'is_published' => 'boolean',
            'generated_at' => 'datetime',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}