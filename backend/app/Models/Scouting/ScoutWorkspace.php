<?php

namespace App\Models\Scouting;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A scout's personal workspace (Option B "boîte perso").
 *
 * One row per scout. Owns a private set of prospects that never appear in
 * Rene's shared roster. `name` is optional — the UI substitutes "Ma boîte
 * perso" when null. Scout can rename it to the external client's name
 * (e.g. "FC X Recruiting").
 */
class ScoutWorkspace extends Model
{
    protected $fillable = ['owner_user_id', 'name'];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function prospects(): HasMany
    {
        return $this->hasMany(ScoutProspect::class, 'workspace_id');
    }

    /** Find-or-create the workspace for a given user. Kept here so
     *  controllers don't reinvent the race-safe upsert. */
    public static function forUser(User $user): self
    {
        return self::firstOrCreate(['owner_user_id' => $user->id]);
    }
}
