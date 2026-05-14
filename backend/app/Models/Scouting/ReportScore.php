<?php

namespace App\Models\Scouting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportScore extends Model
{
    public const CATEGORIES = ['technique', 'tactique', 'physique', 'mental', 'offensif', 'defensif'];

    protected $fillable = [
        'scouting_report_id',
        'category',
        'criterion',
        'score',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(ScoutingReport::class, 'scouting_report_id');
    }
}
