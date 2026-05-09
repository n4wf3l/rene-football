<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\PlayerClip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Admin CRUD on a player's annotated frame clips. The original video file is
 * NEVER uploaded — only the rendered PNG (already merged with annotations
 * client-side) plus the JSON annotation list (so the editor can re-open it).
 */
class AdminClipController extends Controller
{
    public function index(Player $player): JsonResponse
    {
        return response()->json([
            'data' => $player->clips()->get(),
        ]);
    }

    /**
     * Flat index across all players. Used by the article editor's clip picker
     * so the admin can attach annotations from any player to a news article.
     */
    public function indexAll(): JsonResponse
    {
        $clips = PlayerClip::query()
            ->with('player:id,slug,name,photo_url')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $clips]);
    }

    public function store(Request $request, Player $player): JsonResponse
    {
        $data = $this->validateData($request, requireImage: true);

        $data['player_id']  = $player->id;
        $data['image_path'] = $this->storeImage($request, $player->slug);
        $data['annotations_json'] = $this->decodeAnnotations($request->input('annotations_json'));

        $clip = PlayerClip::create($data);

        return response()->json(['data' => $clip], 201);
    }

    public function update(Request $request, Player $player, PlayerClip $clip): JsonResponse
    {
        abort_unless($clip->player_id === $player->id, 404);

        $data = $this->validateData($request, requireImage: false);

        // Optional: replace the image (e.g. user re-edited the annotations and re-rendered).
        if ($request->hasFile('image')) {
            $this->deleteLocal($clip->image_path);
            $data['image_path'] = $this->storeImage($request, $player->slug);
        }
        if ($request->has('annotations_json')) {
            $data['annotations_json'] = $this->decodeAnnotations($request->input('annotations_json'));
        }

        $clip->update($data);

        return response()->json(['data' => $clip->fresh()]);
    }

    public function destroy(Player $player, PlayerClip $clip): JsonResponse
    {
        abort_unless($clip->player_id === $player->id, 404);

        $this->deleteLocal($clip->image_path);
        $clip->delete();

        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request, bool $requireImage): array
    {
        return $request->validate([
            'image'              => [$requireImage ? 'required' : 'nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:6144'],
            'title'              => ['required', 'string', 'max:160'],
            'timestamp_seconds'  => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'video_source_label' => ['nullable', 'string', 'max:200'],
            'notes'              => ['nullable', 'string', 'max:2000'],
            'annotations_json'   => ['nullable'], // string JSON or array
            'width'              => ['nullable', 'integer', 'min:0', 'max:8000'],
            'height'             => ['nullable', 'integer', 'min:0', 'max:8000'],
        ]);
    }

    private function decodeAnnotations(mixed $raw): array|null
    {
        if (is_array($raw)) return $raw;
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : null;
        }
        return null;
    }

    private function storeImage(Request $request, string $playerSlug): string
    {
        $file = $request->file('image');
        $ext = $file->guessExtension() ?: 'png';
        $name = $playerSlug.'-clip-'.substr(bin2hex(random_bytes(4)), 0, 8).'.'.$ext;
        $path = $file->storeAs('clips', $name, 'public');
        return Storage::url($path);
    }

    private function deleteLocal(?string $url): void
    {
        if (! $url) return;
        if (! Str::startsWith($url, '/storage/')) return;
        $relative = Str::after($url, '/storage/');
        Storage::disk('public')->delete($relative);
    }
}
