<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\Presentation;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PresentationController extends Controller
{
    /** Lists the published presentations for a public player profile. */
    public function indexForPlayer(Player $player): JsonResponse
    {
        abort_unless($player->is_published, 404);
        $rows = Presentation::query()
            ->where('player_id', $player->id)
            ->where('is_published', true)
            ->orderByDesc('updated_at')
            ->get(['id', 'template_key', 'title', 'public_token', 'generated_at']);

        return response()->json(['data' => $rows]);
    }

    /**
     * Public PDF download. Uses an unguessable token rather than the primary
     * key so the URL can be shared without leaking sequence information.
     */
    public function show(string $token): StreamedResponse|BinaryFileResponse
    {
        $presentation = Presentation::where('public_token', $token)
            ->where('is_published', true)
            ->firstOrFail();

        if (! $presentation->file_path) abort(404);
        $relative = Str::after($presentation->file_path, '/storage/');
        if (! Storage::disk('public')->exists($relative)) abort(404);

        return Storage::disk('public')->response($relative, 'presentation.pdf', [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="presentation.pdf"',
        ]);
    }
}
