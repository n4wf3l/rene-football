<?php

namespace App\Models\Scouting;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only history of every status change applied to a ScoutingReport.
 * Never UPDATE these rows — only INSERT — so the audit trail stays trustworthy.
 */
class ScoutingReportTransition extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'scouting_report_id',
        'from_status',
        'to_status',
        'from_user_id',
        'to_user_id',
        'comment',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(ScoutingReport::class, 'scouting_report_id');
    }

    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }
}
