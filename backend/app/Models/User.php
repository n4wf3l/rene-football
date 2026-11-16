<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** Back-office roles; labels are the French names shown in the admin. */
    public const ROLES = [
        'superadmin' => 'Superadmin',
        'admin'      => 'Admin',
        'scout'      => 'Scout',
        'analyst'    => 'Data analyste',
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'is_admin',
        'role',
        'is_head_of_scouting',
        'scouting_scope',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'     => 'datetime',
            'password'              => 'hashed',
            'is_admin'              => 'boolean',
            'is_head_of_scouting'   => 'boolean',
            'scouting_scope'        => 'array',
        ];
    }

    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin';
    }

    /** Scouting cockpit (reports, missions, shortlists…). */
    public function canScout(): bool
    {
        return in_array($this->role, ['superadmin', 'scout'], true);
    }

    /** Data analyse (metrics, percentiles, benchmarks). */
    public function canAnalyse(): bool
    {
        return in_array($this->role, ['superadmin', 'analyst'], true);
    }

    /** What the admin SPA may show this member. */
    public function permissions(): array
    {
        return [
            'scouting' => $this->canScout(),
            'analysis' => $this->canAnalyse(),
            'members'  => $this->isSuperadmin(),
        ];
    }
}
