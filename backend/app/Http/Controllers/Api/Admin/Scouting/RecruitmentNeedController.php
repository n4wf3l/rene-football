<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\RecruitmentNeed;
use App\Models\Scouting\Shortlist;
use App\Models\Scouting\ShortlistPlayer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecruitmentNeedController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = RecruitmentNeed::query()->with('creator:id,name')->orderByDesc('priority');

        if ($request->filled('status')) $q->where('status', $request->string('status'));

        $needs = $q->get();

        // Coverage stats per need: count of linked players + best score
        $stats = [];
        foreach ($needs as $need) {
            $players = ShortlistPlayer::query()
                ->whereHas('shortlist', fn ($qq) => $qq->where('recruitment_need_id', $need->id))
                ->with('player:id,score_global')
                ->get();

            $stats[$need->id] = [
                'players_count' => $players->count(),
                'shortlist_a'   => $players->where('stage', 'shortlist_a')->count(),
                'best_score'    => $players->max(fn ($p) => $p->player?->score_global) ?? null,
            ];
        }

        return response()->json(['data' => $needs, 'stats' => $stats]);
    }

    public function show(RecruitmentNeed $need): JsonResponse
    {
        $shortlists = Shortlist::query()
            ->where('recruitment_need_id', $need->id)
            ->with(['players:players.id,slug,name,position,photo_url,score_global,scouting_status'])
            ->get();

        return response()->json([
            'data' => $need->load('creator:id,name'),
            'shortlists' => $shortlists,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $data['created_by'] = $request->user()?->id;
        $need = RecruitmentNeed::create($data);
        return response()->json(['data' => $need], 201);
    }

    public function update(Request $request, RecruitmentNeed $need): JsonResponse
    {
        $data = $this->validateData($request, $need);
        $need->update($data);
        return response()->json(['data' => $need->fresh()]);
    }

    public function destroy(RecruitmentNeed $need): JsonResponse
    {
        $need->delete();
        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request, ?RecruitmentNeed $need = null): array
    {
        return $request->validate([
            'title'               => ['required', 'string', 'max:180'],
            'position'            => ['required', 'string', 'max:80'],
            'priority'            => ['nullable', 'string', 'in:' . implode(',', RecruitmentNeed::PRIORITIES)],
            'season'              => ['nullable', 'string', 'max:20'],
            'category'            => ['nullable', 'string', 'in:Pro,U23,U19,U18,U16'],
            'budget_min'          => ['nullable', 'integer', 'min:0'],
            'budget_max'          => ['nullable', 'integer', 'min:0'],
            'age_min'             => ['nullable', 'integer', 'min:14', 'max:60'],
            'age_max'             => ['nullable', 'integer', 'min:14', 'max:60'],
            'preferred_foot'      => ['nullable', 'string', 'max:16'],
            'profile_description' => ['nullable', 'string'],
            'required_attributes' => ['nullable', 'array'],
            'status'              => ['nullable', 'string', 'in:' . implode(',', RecruitmentNeed::STATUSES)],
            'deadline'            => ['nullable', 'date'],
        ]);
    }
}
