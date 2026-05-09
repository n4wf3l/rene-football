<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appearance;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin CRUD on a player's match appearances. Always scoped via the route's
 * {player:slug} so we never accept a player_id from the request body.
 */
class AdminAppearanceController extends Controller
{
    public function index(Player $player): JsonResponse
    {
        return response()->json([
            'data' => $player->appearances()->get(),
        ]);
    }

    public function store(Request $request, Player $player): JsonResponse
    {
        $data = $this->validateData($request);
        $data['player_id'] = $player->id;
        $appearance = Appearance::create($data);

        return response()->json(['data' => $appearance], 201);
    }

    public function update(Request $request, Player $player, Appearance $appearance): JsonResponse
    {
        abort_unless($appearance->player_id === $player->id, 404);

        $data = $this->validateData($request);
        $appearance->update($data);

        return response()->json(['data' => $appearance->fresh()]);
    }

    public function destroy(Player $player, Appearance $appearance): JsonResponse
    {
        abort_unless($appearance->player_id === $player->id, 404);
        $appearance->delete();

        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'match_date'      => ['required', 'date'],
            'competition'     => ['required', 'string', 'max:80'],
            'opponent'        => ['required', 'string', 'max:120'],
            'home'            => ['nullable', 'boolean'],
            'score_team'      => ['nullable', 'integer', 'min:0', 'max:20'],
            'score_opponent'  => ['nullable', 'integer', 'min:0', 'max:20'],
            'minutes_played'  => ['nullable', 'integer', 'min:0', 'max:130'],
            'goals'           => ['nullable', 'integer', 'min:0', 'max:10'],
            'assists'         => ['nullable', 'integer', 'min:0', 'max:10'],
            'shots'           => ['nullable', 'integer', 'min:0', 'max:30'],
            'shots_on_target' => ['nullable', 'integer', 'min:0', 'max:30'],
            'yellow_card'     => ['nullable', 'boolean'],
            'red_card'        => ['nullable', 'boolean'],
            'rating'          => ['nullable', 'numeric', 'min:0', 'max:10'],
            'notes'           => ['nullable', 'string', 'max:1000'],
        ]);
    }
}
