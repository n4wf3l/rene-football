<?php

namespace App\Policies;

use App\Models\User;

/**
 * V1 - any admin can do anything in the scouting cockpit. Wired through so
 * future role-based rules (scout_junior / scout_senior / head_of_scouting /
 * sporting_director) drop in here without touching controllers.
 *
 * Controllers can call `$this->authorize('scouting.viewDashboard')` etc.
 */
class ScoutingPolicy
{
    public function before(User $user): ?bool
    {
        return $user->is_admin ? true : null;
    }

    public function viewDashboard(User $user): bool   { return $user->is_admin; }
    public function manageReports(User $user): bool   { return $user->is_admin; }
    public function validateReports(User $user): bool { return $user->is_admin; }
    public function manageMissions(User $user): bool  { return $user->is_admin; }
    public function manageShortlists(User $user): bool{ return $user->is_admin; }
    public function manageNeeds(User $user): bool     { return $user->is_admin; }
}
