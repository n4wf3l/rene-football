<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\Scouting\PlayerRisk;
use App\Services\Scouting\ScoutingScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerRiskController extends Controller
{
    public function __construct(private ScoutingScoreService $scoreService) {}

    public function index(Player $player): JsonResponse
    {
        return response()->json(['data' => $player->risks()->with('creator:id,name')->get()]);
    }

    public function store(Request $request, Player $player): JsonResponse
    {
        $data = $this->validateData($request);
        $data['player_id']  = $player->id;
        $data['created_by'] = $request->user()?->id;
        $risk = PlayerRisk::create($data);
        $this->scoreService->refresh($player);
        return response()->json(['data' => $risk], 201);
    }

    public function update(Request $request, Player $player, PlayerRisk $risk): JsonResponse
    {
        abort_unless($risk->player_id === $player->id, 404);
        $risk->update($this->validateData($request));
        $this->scoreService->refresh($player);
        return response()->json(['data' => $risk->fresh()]);
    }

    public function destroy(Player $player, PlayerRisk $risk): JsonResponse
    {
        abort_unless($risk->player_id === $player->id, 404);
        $risk->delete();
        $this->scoreService->refresh($player);
        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'risk_type'       => ['required', 'string', 'in:' . implode(',', PlayerRisk::TYPES)],
            'title'           => ['required', 'string', 'max:180'],
            'description'     => ['nullable', 'string'],
            'probability'     => ['nullable', 'string', 'in:' . implode(',', PlayerRisk::PROBABILITIES)],
            'impact'          => ['nullable', 'string', 'in:' . implode(',', PlayerRisk::LEVELS)],
            'mitigation_plan' => ['nullable', 'string'],
            'status'          => ['nullable', 'string', 'in:' . implode(',', PlayerRisk::STATUSES)],
        ]);
    }
}
