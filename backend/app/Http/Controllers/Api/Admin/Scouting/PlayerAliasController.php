<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\Scouting\PlayerAlias;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerAliasController extends Controller
{
    public function index(Player $player): JsonResponse
    {
        return response()->json(['data' => $player->aliases()->get()]);
    }

    public function store(Request $request, Player $player): JsonResponse
    {
        $data = $request->validate([
            'alias'       => ['required', 'string', 'max:160'],
            'source_type' => ['nullable', 'string', 'max:24'],
        ]);
        $data['player_id'] = $player->id;
        $alias = PlayerAlias::create($data);
        return response()->json(['data' => $alias], 201);
    }

    public function destroy(Player $player, PlayerAlias $alias): JsonResponse
    {
        abort_unless($alias->player_id === $player->id, 404);
        $alias->delete();
        return response()->json(['ok' => true]);
    }
}
