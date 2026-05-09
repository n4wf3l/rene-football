<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Illuminate\Http\JsonResponse;

class PlayerController extends Controller
{
    public function index(): JsonResponse
    {
        $players = Player::query()
            ->where('is_published', true)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $players]);
    }

    public function show(Player $player): JsonResponse
    {
        abort_unless($player->is_published, 404);

        return response()->json(['data' => $player]);
    }
}
