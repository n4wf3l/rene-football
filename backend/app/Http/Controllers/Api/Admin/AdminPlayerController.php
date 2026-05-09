<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminPlayerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Player::query()->orderBy('name')->get(),
        ]);
    }

    public function show(Player $player): JsonResponse
    {
        return response()->json(['data' => $player]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $data['slug'] = $this->ensureUniqueSlug($data['name']);

        $player = Player::create($data);

        return response()->json(['data' => $player], 201);
    }

    public function update(Request $request, Player $player): JsonResponse
    {
        $data = $this->validateData($request, $player);

        if (isset($data['name']) && $data['name'] !== $player->name) {
            $data['slug'] = $this->ensureUniqueSlug($data['name'], $player->id);
        }

        $player->update($data);

        return response()->json(['data' => $player->fresh()]);
    }

    public function destroy(Player $player): JsonResponse
    {
        $player->delete();

        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request, ?Player $player = null): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:14', 'max:60'],
            'height' => ['nullable', 'string', 'max:20'],
            'position' => ['required', 'string', 'max:120'],
            'category' => ['required', 'string', 'in:Gardien,Defenseur,Milieu,Attaquant'],
            'club' => ['nullable', 'string', 'max:255'],
            'nationality' => ['nullable', 'string', 'max:120'],
            'preferred_foot' => ['nullable', 'string', 'max:20'],
            'since' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'photo_url' => ['nullable', 'string', 'max:500'],
            'bio' => ['nullable', 'string'],
            'matches_played' => ['nullable', 'integer', 'min:0', 'max:200'],
            'goals' => ['nullable', 'integer', 'min:0', 'max:200'],
            'assists' => ['nullable', 'integer', 'min:0', 'max:200'],
            'minutes_played' => ['nullable', 'integer', 'min:0', 'max:20000'],
            'shots' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'shots_on_target' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'xg' => ['nullable', 'numeric', 'min:0', 'max:200'],
            'xa' => ['nullable', 'numeric', 'min:0', 'max:200'],
            'key_passes' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'pass_accuracy' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'dribbles_completed' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'tackles' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'interceptions' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'duels_won' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'yellow_cards' => ['nullable', 'integer', 'min:0', 'max:50'],
            'red_cards' => ['nullable', 'integer', 'min:0', 'max:20'],
            'clean_sheets' => ['nullable', 'integer', 'min:0', 'max:200'],
            'saves' => ['nullable', 'integer', 'min:0', 'max:1000'],

            // Heatmap: 4 rows × 6 cols, each cell is an int 0-100.
            'heatmap_grid' => ['nullable', 'array', 'size:4'],
            'heatmap_grid.*' => ['array', 'size:6'],
            'heatmap_grid.*.*' => ['integer', 'min:0', 'max:100'],

            'is_published' => ['nullable', 'boolean'],
        ];

        return $request->validate($rules);
    }

    private function ensureUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'joueur';
        }
        $slug = $base;
        $i = 2;
        while (Player::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }
}
