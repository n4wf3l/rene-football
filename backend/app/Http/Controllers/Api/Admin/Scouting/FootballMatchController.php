<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\FootballMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FootballMatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = FootballMatch::query()
            ->with('creator:id,name')
            ->orderByDesc('kickoff_at');

        if ($request->filled('category')) $q->where('category', $request->string('category'));
        if ($request->filled('competition')) $q->where('competition', 'like', '%' . $request->string('competition') . '%');

        return response()->json(['data' => $q->get()]);
    }

    public function show(FootballMatch $match): JsonResponse
    {
        $match->load([
            'creator:id,name',
            'reports.player:id,slug,name,position,photo_url',
            'reports.scout:id,name',
            'assignments.assignee:id,name',
            'quickObservations.player:id,slug,name',
            'quickObservations.scout:id,name',
        ]);
        return response()->json(['data' => $match]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $data['created_by'] = $request->user()?->id;
        $match = FootballMatch::create($data);
        return response()->json(['data' => $match], 201);
    }

    public function update(Request $request, FootballMatch $match): JsonResponse
    {
        $data = $this->validateData($request);
        $match->update($data);
        return response()->json(['data' => $match->fresh()]);
    }

    public function destroy(FootballMatch $match): JsonResponse
    {
        $match->delete();
        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'kickoff_at'  => ['required', 'date'],
            'competition' => ['required', 'string', 'max:120'],
            'season'      => ['nullable', 'string', 'max:20'],
            'home_team'   => ['required', 'string', 'max:120'],
            'away_team'   => ['required', 'string', 'max:120'],
            'category'    => ['required', 'string', 'in:Pro,U23,U19,U18,U16'],
            'venue'       => ['nullable', 'string', 'max:160'],
            'score_home'  => ['nullable', 'integer', 'min:0', 'max:99'],
            'score_away'  => ['nullable', 'integer', 'min:0', 'max:99'],
            'notes'       => ['nullable', 'string'],
            'status'      => ['nullable', 'string', 'in:scheduled,live,played,postponed,cancelled'],
        ]);
    }
}
