<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\QuickObservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuickObservationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = QuickObservation::query()
            ->with('player:id,slug,name', 'match:id,slug,home_team,away_team', 'scout:id,name')
            ->latest();

        if ($request->filled('match')) $q->where('football_match_id', $request->integer('match'));
        if ($request->filled('player')) $q->whereHas('player', fn ($qq) => $qq->where('slug', $request->string('player')));

        return response()->json(['data' => $q->limit(200)->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'football_match_id' => ['required', 'integer', 'exists:football_matches,id'],
            'player_id'         => ['required', 'integer', 'exists:players,id'],
            'minute'            => ['nullable', 'integer', 'min:0', 'max:200'],
            'kind'              => ['required', 'string', 'in:' . implode(',', QuickObservation::KINDS)],
            'note'              => ['nullable', 'string', 'max:255'],
            'impact'            => ['nullable', 'string', 'in:' . implode(',', QuickObservation::IMPACTS)],
        ]);
        $data['scout_id'] = $request->user()?->id;
        $obs = QuickObservation::create($data);
        return response()->json(['data' => $obs], 201);
    }

    public function destroy(QuickObservation $observation): JsonResponse
    {
        $observation->delete();
        return response()->json(['ok' => true]);
    }
}
