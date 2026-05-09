<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactSubmission extends Model
{
    protected $fillable = [
        'reason',
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'consent_at',
        'ip',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'consent_at' => 'datetime',
        ];
    }
}
