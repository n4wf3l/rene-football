<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\ScoutAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScoutAssignmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ScoutAssignment::query()
            ->with(['match:id,slug,kickoff_at,home_team,away_team,competition', 'assignee:id,name', 'assigner:id,name'])
            ->orderByDesc('due_date');

        if ($request->filled('status')) $q->where('status', $request->string('status'));
        if ($request->filled('mine') && $request->user()) {
            $q->where('assigned_to', $request->user()->id);
        }

        return response()->json(['data' => $q->get()]);
    }

    public function show(ScoutAssignment $assignment): JsonResponse
    {
        $assignment->load(['match', 'assignee:id,name', 'assigner:id,name']);
        return response()->json(['data' => $assignment]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $data['assigned_by'] = $request->user()?->id;
        $assignment = ScoutAssignment::create($data);
        return response()->json(['data' => $assignment->fresh(['match', 'assignee', 'assigner'])], 201);
    }

    public function update(Request $request, ScoutAssignment $assignment): JsonResponse
    {
        $data = $this->validateData($request, $assignment);
        $assignment->update($data);
        return response()->json(['data' => $assignment->fresh(['match', 'assignee', 'assigner'])]);
    }

    public function destroy(ScoutAssignment $assignment): JsonResponse
    {
        $assignment->delete();
        return response()->json(['ok' => true]);
    }

    /** Lightweight status patch - used by the kanban drag/drop. */
    public function setStatus(Request $request, ScoutAssignment $assignment): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:' . implode(',', ScoutAssignment::STATUSES)],
        ]);
        $assignment->update($data);
        return response()->json(['data' => $assignment->fresh()]);
    }

    private function validateData(Request $request, ?ScoutAssignment $assignment = null): array
    {
        return $request->validate([
            'title'            => ['required', 'string', 'max:180'],
            'football_match_id'=> ['nullable', 'integer', 'exists:football_matches,id'],
            'assigned_to'      => ['nullable', 'integer', 'exists:users,id'],
            'priority'         => ['nullable', 'string', 'in:' . implode(',', ScoutAssignment::PRIORITIES)],
            'objective'        => ['nullable', 'string'],
            'players_to_watch' => ['nullable', 'array'],
            'players_to_watch.*' => ['integer', 'exists:players,id'],
            'due_date'         => ['nullable', 'date'],
            'status'           => ['nullable', 'string', 'in:' . implode(',', ScoutAssignment::STATUSES)],
            'checklist'        => ['nullable', 'array'],
        ]);
    }
}
