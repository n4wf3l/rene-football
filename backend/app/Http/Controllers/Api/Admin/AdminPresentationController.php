<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Player;
use App\Models\Presentation;
use App\Services\Presentations\PresentationTemplate;
use App\Services\Presentations\PresentationTemplateRegistry;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AdminPresentationController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Presentation::query()
            ->with(['player:id,slug,name,photo_url,position,club', 'author:id,name'])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function show(Presentation $presentation): JsonResponse
    {
        $presentation->load(['player:id,slug,name,photo_url,position,club,category', 'author:id,name']);
        return response()->json(['data' => $presentation]);
    }

    /** Catalogue exposed to the editor so the UI can render template cards + stat pickers. */
    public function catalogue(Request $request): JsonResponse
    {
        $category = $request->query('category', 'Milieu');
        $articles = Article::query()
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'slug', 'title', 'category', 'is_published']);

        return response()->json([
            'templates' => PresentationTemplateRegistry::catalogue(),
            'stats'     => PresentationTemplate::statCatalogue($category),
            'articles'  => $articles,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $player = Player::findOrFail($data['player_id']);

        $options = $this->normaliseOptions($data['options'] ?? [], $request);

        $presentation = Presentation::create([
            'player_id'    => $player->id,
            'template_key' => $data['template_key'],
            'title'        => $data['title'],
            'options'      => $options,
            'is_published' => (bool) ($data['is_published'] ?? false),
            'public_token' => ! empty($data['is_published']) ? Str::random(40) : null,
            'created_by'   => $request->user()?->id,
        ]);

        $this->renderAndStorePdf($presentation, $player);

        return response()->json(['data' => $presentation->fresh(['player', 'author'])], 201);
    }

    public function update(Request $request, Presentation $presentation): JsonResponse
    {
        $data = $this->validateData($request, $presentation);
        $player = Player::findOrFail($data['player_id'] ?? $presentation->player_id);

        $options = $this->normaliseOptions($data['options'] ?? $presentation->options ?? [], $request);

        $payload = [
            'player_id'    => $player->id,
            'template_key' => $data['template_key'] ?? $presentation->template_key,
            'title'        => $data['title'] ?? $presentation->title,
            'options'      => $options,
        ];

        if (array_key_exists('is_published', $data)) {
            $payload['is_published'] = (bool) $data['is_published'];
            if ($payload['is_published'] && ! $presentation->public_token) {
                $payload['public_token'] = Str::random(40);
            }
            // We deliberately keep the token even when un-publishing so the
            // same link can be re-published later without breaking shares.
        }

        $presentation->update($payload);
        $this->renderAndStorePdf($presentation, $player);

        return response()->json(['data' => $presentation->fresh(['player', 'author'])]);
    }

    public function destroy(Presentation $presentation): JsonResponse
    {
        $this->deleteLocal($presentation->file_path);
        $presentation->delete();
        return response()->json(['ok' => true]);
    }

    /** Streams the freshly-rendered PDF to the admin for inline preview / download. */
    public function preview(Presentation $presentation): Response
    {
        $player = $presentation->player;
        if (! $player) abort(404);
        $html = $this->renderHtml($presentation, $player);
        $pdf  = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        return $pdf->stream('presentation-'.$player->slug.'-'.$presentation->id.'.pdf');
    }

    /** Allows the admin to upload a custom hero photo separately from the player photo. */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:6144'],
        ]);
        $file = $request->file('photo');
        $ext  = $file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'jpg';
        $name = 'presentation-photo-'.substr(bin2hex(random_bytes(4)), 0, 8).'.'.$ext;
        $path = $file->storeAs('presentations', $name, 'public');

        return response()->json(['url' => Storage::url($path)]);
    }

    // -------------------- helpers --------------------

    private function validateData(Request $request, ?Presentation $existing = null): array
    {
        return $request->validate([
            'player_id'    => [$existing ? 'sometimes' : 'required', 'integer', 'exists:players,id'],
            'template_key' => [$existing ? 'sometimes' : 'required', 'string', 'in:'.implode(',', PresentationTemplateRegistry::keys())],
            'title'        => [$existing ? 'sometimes' : 'required', 'string', 'max:200'],
            'is_published' => ['nullable', 'boolean'],
            'options'                       => ['nullable', 'array'],
            'options.accent_color'          => ['nullable', 'string', 'max:9'],
            'options.secondary_color'       => ['nullable', 'string', 'max:9'],
            'options.text_color'            => ['nullable', 'string', 'max:9'],
            'options.background_color'      => ['nullable', 'string', 'max:9'],
            'options.tagline'               => ['nullable', 'string', 'max:200'],
            'options.selected_stats'        => ['nullable', 'array', 'max:6'],
            'options.selected_stats.*'      => ['string', 'max:40'],
            'options.show_heatmap'          => ['nullable', 'boolean'],
            'options.photo_source'          => ['nullable', 'string', 'in:player,custom'],
            'options.custom_photo_url'      => ['nullable', 'string', 'max:500'],
            'options.photo_zoom'            => ['nullable', 'integer', 'min:100', 'max:250'],
            'options.photo_position_x'      => ['nullable', 'integer', 'min:0', 'max:100'],
            'options.photo_position_y'      => ['nullable', 'integer', 'min:0', 'max:100'],
            'options.article_slug'              => ['nullable', 'string', 'max:200'],
            'options.youtube_url'               => ['nullable', 'string', 'max:500'],
            'options.previous_clubs'            => ['nullable', 'array', 'max:12'],
            'options.previous_clubs.*'          => ['array'],
            'options.previous_clubs.*.name'     => ['nullable', 'string', 'max:100'],
            'options.previous_clubs.*.logo_url' => ['nullable', 'string', 'max:500'],
        ]);
    }

    private function normaliseOptions(array $opts, Request $request): array
    {
        // Cast booleans coming from JSON.
        if (array_key_exists('show_heatmap', $opts)) {
            $opts['show_heatmap'] = filter_var($opts['show_heatmap'], FILTER_VALIDATE_BOOLEAN);
        }
        // Trim and sanitise colours - DomPDF tolerates #rgb / #rrggbb only.
        foreach (['accent_color', 'secondary_color', 'text_color', 'background_color'] as $k) {
            if (isset($opts[$k]) && is_string($opts[$k])) {
                $opts[$k] = trim($opts[$k]);
                if (! preg_match('/^#([0-9a-fA-F]{3}){1,2}$/', $opts[$k])) {
                    unset($opts[$k]);
                }
            }
        }
        // Empty strings -> null on the optional text fields so they don't
        // accidentally trip downstream length / format checks.
        foreach (['tagline', 'custom_photo_url', 'article_slug', 'youtube_url'] as $k) {
            if (isset($opts[$k]) && is_string($opts[$k]) && trim($opts[$k]) === '') {
                $opts[$k] = null;
            }
        }
        // Drop fully-empty previous_clubs rows (saved by accident when the
        // admin clicks "Ajouter un club" without filling anything in).
        if (isset($opts['previous_clubs']) && is_array($opts['previous_clubs'])) {
            $opts['previous_clubs'] = array_values(array_filter(
                $opts['previous_clubs'],
                static fn ($row) => is_array($row)
                    && ((isset($row['name']) && trim((string) $row['name']) !== '')
                        || (isset($row['logo_url']) && trim((string) $row['logo_url']) !== '')),
            ));
        }
        return $opts;
    }

    private function renderHtml(Presentation $presentation, Player $player): string
    {
        $template = PresentationTemplateRegistry::resolve($presentation->template_key);
        return $template->render($player, $presentation->options ?? [], $presentation->title);
    }

    private function renderAndStorePdf(Presentation $presentation, Player $player): void
    {
        $this->deleteLocal($presentation->file_path);

        $html = $this->renderHtml($presentation, $player);
        $pdf  = Pdf::loadHTML($html)->setPaper('a4', 'portrait');

        $filename = 'presentations/'.$player->slug.'-'.$presentation->id.'-'.substr(bin2hex(random_bytes(3)), 0, 6).'.pdf';
        Storage::disk('public')->put($filename, $pdf->output());

        $presentation->update([
            'file_path'    => Storage::url($filename),
            'generated_at' => now(),
        ]);
    }

    private function deleteLocal(?string $url): void
    {
        if (! $url) return;
        if (! Str::startsWith($url, '/storage/')) return;
        $relative = Str::after($url, '/storage/');
        Storage::disk('public')->delete($relative);
    }
}
