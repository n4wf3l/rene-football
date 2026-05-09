<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerClip extends Model
{
    protected $fillable = [
        'player_id',
        'image_path',
        'title',
        'timestamp_seconds',
        'video_source_label',
        'notes',
        'annotations_json',
        'width',
        'height',
    ];

    protected function casts(): array
    {
        return [
            'timestamp_seconds' => 'float',
            'annotations_json'  => 'array',
            'width'             => 'integer',
            'height'            => 'integer',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}
