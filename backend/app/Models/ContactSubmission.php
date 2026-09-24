<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactSubmission extends Model
{
    public const STATUSES = ['new', 'read', 'handled', 'archived'];

    protected $fillable = [
        'reason',
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'payload',
        'status',
        'cv_path',
        'consent_at',
        'ip',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'consent_at' => 'datetime',
            'payload'    => 'array',
        ];
    }
}
