<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\Scouting\PlayerSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerSourceController extends Controller
{
    public function index(Player $player): JsonResponse
    {
        return response()->json(['data' => $player->sources()->with('author:id,name')->latest()->get()]);
    }

    public function store(Request $request, Player $player): JsonResponse
    {
        $data = $this->validateData($request);
        $data['player_id'] = $player->id;
        $data['added_by']  = $request->user()?->id;
        $row = PlayerSource::create($data);
        return response()->json(['data' => $row], 201);
    }

    public function update(Request $request, Player $player, PlayerSource $source): JsonResponse
    {
        abort_unless($source->player_id === $player->id, 404);
        $source->update($this->validateData($request));
        return response()->json(['data' => $source->fresh()]);
    }

    public function destroy(Player $player, PlayerSource $source): JsonResponse
    {
        abort_unless($source->player_id === $player->id, 404);
        $source->delete();
        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'field_name'        => ['required', 'string', 'max:60'],
            'value'             => ['nullable', 'string', 'max:255'],
            'source_type'       => ['required', 'string', 'in:' . implode(',', PlayerSource::SOURCE_TYPES)],
            'source_label'      => ['nullable', 'string', 'max:160'],
            'reliability_score' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);
    }
}
