<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\ScoutProspect;
use App\Models\Scouting\ScoutWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD over the scout's private prospects. All queries are scoped by
 * `workspace.owner_user_id = auth()->id` so one scout can never see or
 * mutate another scout's private data.
 */
class ScoutProspectController extends Controller
{
    private function workspaceForUser(Request $request): ScoutWorkspace
    {
        $user = $request->user();
        abort_unless($user, 401);
        return ScoutWorkspace::forUser($user);
    }

    /** Ownership guard: throws 404 (deliberately: don't leak existence)
     *  when the prospect belongs to another scout's workspace. */
    private function ownedProspect(Request $request, ScoutProspect $prospect): ScoutProspect
    {
        $ws = $this->workspaceForUser($request);
        abort_unless($prospect->workspace_id === $ws->id, 404);
        return $prospect;
    }

    public function index(Request $request): JsonResponse
    {
        $ws = $this->workspaceForUser($request);
        $q = ScoutProspect::query()->where('workspace_id', $ws->id);

        // Optional search / filter passthroughs — kept small for MVP.
        if ($search = trim((string) $request->query('q', ''))) {
            $q->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%$search%")
                    ->orWhere('club', 'like', "%$search%");
            });
        }
        if ($cat = trim((string) $request->query('category', ''))) {
            $q->where('category', $cat);
        }
        if ($status = trim((string) $request->query('status', ''))) {
            $q->where('status', $status);
        }

        return response()->json([
            'data' => $q->orderByDesc('updated_at')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $ws = $this->workspaceForUser($request);
        $data = $this->validated($request);
        $data['workspace_id'] = $ws->id;

        $prospect = ScoutProspect::create($data);
        return response()->json(['data' => $prospect], 201);
    }

    public function show(Request $request, ScoutProspect $prospect): JsonResponse
    {
        return response()->json(['data' => $this->ownedProspect($request, $prospect)]);
    }

    public function update(Request $request, ScoutProspect $prospect): JsonResponse
    {
        $this->ownedProspect($request, $prospect);
        $prospect->update($this->validated($request, updating: true));
        return response()->json(['data' => $prospect->fresh()]);
    }

    public function destroy(Request $request, ScoutProspect $prospect): JsonResponse
    {
        $this->ownedProspect($request, $prospect);
        $prospect->delete();
        return response()->json(['ok' => true]);
    }

    private function validated(Request $request, bool $updating = false): array
    {
        $req = $updating ? 'sometimes' : 'required';
        return $request->validate([
            'name'             => [$req, 'string', 'max:255'],
            'age'              => ['nullable', 'integer', 'min:8', 'max:60'],
            'position'         => ['nullable', 'string', 'max:120'],
            'category'         => ['nullable', 'string', 'max:40'],
            'club'             => ['nullable', 'string', 'max:255'],
            'nationality'      => ['nullable', 'string', 'max:120'],
            'preferred_foot'   => ['nullable', 'string', 'max:20'],
            'height'           => ['nullable', 'string', 'max:20'],
            'since'            => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'photo_url'        => ['nullable', 'string', 'max:500'],
            'notes'            => ['nullable', 'string'],
            'strengths'        => ['nullable', 'string'],
            'weaknesses'       => ['nullable', 'string'],
            'rating'           => ['nullable', 'numeric', 'min:0', 'max:10'],
            'potential_rating' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'recommendation'   => ['nullable', 'string', 'max:40'],
            'status'           => ['nullable', 'string', 'max:40'],
            'next_action'      => ['nullable', 'string'],
            'matches_played'   => ['nullable', 'integer', 'min:0'],
            'goals'            => ['nullable', 'integer', 'min:0'],
            'assists'          => ['nullable', 'integer', 'min:0'],
            'xg'               => ['nullable', 'numeric', 'min:0'],
            'xa'               => ['nullable', 'numeric', 'min:0'],
            'minutes_played'   => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
