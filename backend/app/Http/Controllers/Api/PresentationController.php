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
     * Public PDF stream. Kept lightweight (no HTML wrapper) so the React
     * landing page at /p/{token} can embed it via <iframe> or trigger a
     * direct download. The unguessable 40-char token stands in for the id.
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

    /**
     * Public JSON meta for the landing page: player name / club, agent name,
     * template, generated date. Same visibility rules as the PDF endpoint
     * (published only). No auth, unguessable token guards enumeration.
     */
    public function meta(string $token): JsonResponse
    {
        $presentation = Presentation::where('public_token', $token)
            ->where('is_published', true)
            ->with(['player:id,slug,name,photo_url,position,club', 'author:id,name'])
            ->firstOrFail();

        return response()->json([
            'data' => [
                'title'         => $presentation->title,
                'template_key'  => $presentation->template_key,
                'generated_at'  => $presentation->generated_at,
                'pdf_url'       => '/api/presentations/'.$presentation->public_token,
                'player'        => $presentation->player ? [
                    'name'      => $presentation->player->name,
                    'position'  => $presentation->player->position,
                    'club'      => $presentation->player->club,
                    'photo_url' => $presentation->player->photo_url,
                ] : null,
                'agent'         => $presentation->author?->name,
            ],
        ]);
    }
}
