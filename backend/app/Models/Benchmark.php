<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Benchmark extends Model
{
    protected $fillable = ['category', 'tier', 'metric', 'avg', 'elite', 'unit'];

    protected function casts(): array
    {
        return [
            'avg'   => 'float',
            'elite' => 'float',
        ];
    }
}
