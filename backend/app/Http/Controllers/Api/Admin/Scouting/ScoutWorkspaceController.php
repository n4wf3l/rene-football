<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\ScoutWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Scout's own personal workspace. Auto-created on first read so the UI
 * doesn't need an explicit "create workspace" step — the switcher just
 * lands the user in it with a default label.
 *
 * Rename is a one-line PATCH: empty string / null resets to the default
 * "Ma boîte perso" client-side label.
 */
class ScoutWorkspaceController extends Controller
{
    /** Returns the current user's workspace + prospect count. Auto-creates
     *  the workspace on first access. */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $workspace = ScoutWorkspace::forUser($user);
        return response()->json([
            'data' => [
                'id'             => $workspace->id,
                'name'           => $workspace->name,
                'owner_user_id'  => $workspace->owner_user_id,
                'prospect_count' => $workspace->prospects()->count(),
                'created_at'     => $workspace->created_at,
                'updated_at'     => $workspace->updated_at,
            ],
        ]);
    }

    /** Rename the workspace. Empty/whitespace becomes null so the UI
     *  falls back to the "Ma boîte perso" default label. */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:80'],
        ]);

        $workspace = ScoutWorkspace::forUser($user);
        $workspace->update([
            'name' => isset($data['name']) && trim((string) $data['name']) !== ''
                ? trim((string) $data['name'])
                : null,
        ]);

        return response()->json(['data' => $workspace->fresh()]);
    }
}
