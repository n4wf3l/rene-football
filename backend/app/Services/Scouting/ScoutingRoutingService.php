<?php

namespace App\Services\Scouting;

use App\Models\Player;
use App\Models\User;

/**
 * Picks the validator a scouting report should be routed to when the scout hits
 * "Soumettre" without explicitly choosing a recipient.
 *
 * Routing rules (in order) :
 *   1. A head of scouting whose `scouting_scope` JSON array contains the
 *      player's category ("Pro", "U19", …). First match wins (deterministic by id).
 *   2. A head of scouting with NO scope set (= covers everything).
 *   3. Any admin user. Last-resort fallback so submissions never silently fail.
 */
class ScoutingRoutingService
{
    /**
     * Maps a player's age to one of the three routing buckets used by
     * head-of-scouting scopes. Three buckets only - keeps validator inboxes
     * cleanly separated without micro-categorising teenagers.
     *   age < 19  → "U19"  (académie + jeune élite)
     *   age < 23  → "U23"  (post-formation)
     *   else      → "Pro"  (recrutement senior)
     */
    public function categoryFor(Player $player): string
    {
        $age = (int) ($player->age ?? 0);
        if ($age <= 0) return 'Pro';
        if ($age < 19) return 'U19';
        if ($age < 23) return 'U23';
        return 'Pro';
    }

    /** Returns the user id the report should land on, or null if no eligible user exists. */
    public function pickValidatorIdFor(Player $player): ?int
    {
        $category = $this->categoryFor($player);

        // 1. Heads of scouting whose scope explicitly covers the player's category.
        $heads = User::query()
            ->where('is_head_of_scouting', true)
            ->whereNotNull('scouting_scope')
            ->orderBy('id')
            ->get();
        foreach ($heads as $u) {
            $scope = $u->scouting_scope; // array (cast) or null
            if (is_array($scope) && in_array($category, $scope, true)) {
                return (int) $u->id;
            }
        }

        // 2. Generic head of scouting (no scope = covers everything).
        $generic = User::query()
            ->where('is_head_of_scouting', true)
            ->whereNull('scouting_scope')
            ->orderBy('id')
            ->first();
        if ($generic) return (int) $generic->id;

        // 3. Final fallback : any admin. Better than failing the submission.
        $admin = User::query()
            ->where('is_admin', true)
            ->orderBy('id')
            ->first();

        return $admin ? (int) $admin->id : null;
    }

    /** Returns the list of eligible validators, ready for a "Soumettre à" picker. */
    public function listValidators(): \Illuminate\Support\Collection
    {
        return User::query()
            ->where(function ($q) {
                $q->where('is_head_of_scouting', true)
                  ->orWhere('is_admin', true);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'is_admin', 'is_head_of_scouting', 'scouting_scope']);
    }
}
