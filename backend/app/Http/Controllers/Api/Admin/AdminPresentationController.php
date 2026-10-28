<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Player;
use App\Models\Presentation;
use App\Services\Presentations\Fiche\FicheCompositions;
use App\Services\Presentations\Fiche\FicheI18n;
use App\Services\Presentations\Fiche\FicheLayoutException;
use App\Services\Presentations\Fiche\FicheResult;
use App\Services\Presentations\Fiche\FicheTheme;
use App\Services\Presentations\PresentationPdfService;
use App\Services\Presentations\PresentationTemplate;
use App\Services\Presentations\PresentationTemplateRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AdminPresentationController extends Controller
{
    public function __construct(private readonly PresentationPdfService $pdfs)
    {
    }

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

    /** Catalogue exposed to the editor so the UI can render composition cards + option controls. */
    public function catalogue(Request $request): JsonResponse
    {
        $category = $request->query('category', 'Milieu');
        $lang     = $request->query('language', 'fr');
        $articles = Article::query()
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'slug', 'title', 'category', 'is_published']);

        return response()->json([
            'templates'    => PresentationTemplateRegistry::catalogue(),
            // Premium fiche system: compositions with their defaults and the
            // option groups they render, plus the theme palettes. The editor
            // builds its controls from this, never from its own copy.
            'compositions' => FicheCompositions::catalogue(),
            'themes'       => FicheTheme::catalogue(),
            'languages'    => FicheI18n::LANGUAGES,
            'stats'        => PresentationTemplate::statCatalogue($category, $lang),
            'articles'     => $articles,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $player = Player::findOrFail($data['player_id']);
        $isPublished = (bool) ($data['is_published'] ?? false);

        $presentation = new Presentation([
            'player_id'    => $player->id,
            'template_key' => $this->normaliseTemplateKey($data['template_key']),
            'title'        => $data['title'],
            'options'      => $this->normaliseOptions($data['options'] ?? []),
            'is_published' => $isPublished,
            'public_token' => $isPublished ? Str::random(40) : null,
            'created_by'   => $request->user()?->id,
        ]);

        // Render and verify first: nothing is saved if the fiche cannot be
        // produced as exactly one A4 page.
        try {
            $result = $this->pdfs->render($presentation, $player);
        } catch (FicheLayoutException $e) {
            return $this->layoutError($e);
        }

        $presentation->save();
        $this->storePdf($presentation, $player, $result);

        return response()->json(['data' => $presentation->fresh(['player', 'author'])], 201);
    }

    public function update(Request $request, Presentation $presentation): JsonResponse
    {
        $data = $this->validateData($request, $presentation);
        $player = Player::findOrFail($data['player_id'] ?? $presentation->player_id);

        $payload = [
            'player_id'    => $player->id,
            'template_key' => $this->normaliseTemplateKey($data['template_key'] ?? $presentation->template_key),
            'title'        => $data['title'] ?? $presentation->title,
            'options'      => $this->normaliseOptions($data['options'] ?? $presentation->options ?? []),
        ];

        if (array_key_exists('is_published', $data)) {
            $payload['is_published'] = (bool) $data['is_published'];
            if ($payload['is_published'] && ! $presentation->public_token) {
                $payload['public_token'] = Str::random(40);
            }
            // We deliberately keep the token even when un-publishing so the
            // same link can be re-published later without breaking shares.
        }

        // Render the edited state before persisting it: a failed layout keeps
        // the previous options AND the previous valid PDF untouched.
        $presentation->fill($payload);
        try {
            $result = $this->pdfs->render($presentation, $player);
        } catch (FicheLayoutException $e) {
            $presentation->refresh();
            return $this->layoutError($e);
        }

        $presentation->save();
        $this->storePdf($presentation, $player, $result);

        return response()->json(['data' => $presentation->fresh(['player', 'author'])]);
    }

    public function destroy(Presentation $presentation): JsonResponse
    {
        $this->deleteLocal($presentation->file_path);
        $this->deleteLocal($presentation->external_asset_path);
        $presentation->delete();
        return response()->json(['ok' => true]);
    }

    /** Streams the freshly-rendered PDF to the admin for inline preview / download. */
    public function preview(Presentation $presentation): Response
    {
        $player = $presentation->player;
        if (! $player) abort(404);
        try {
            $result = $this->pdfs->render($presentation, $player);
        } catch (FicheLayoutException $e) {
            return $this->layoutError($e);
        }
        return response($result->pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="presentation-'.$player->slug.'-'.$presentation->id.'.pdf"',
        ]);
    }

    /**
     * Renders the current *unsaved* editor state with the same engine as the
     * final file and returns the real PDF (base64) plus its layout report. The
     * editor paints that PDF, so the preview is the document itself.
     * `overrides.bio` previews an edited bio without writing it to the player.
     */
    public function previewPdf(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'player_id'       => ['required', 'integer', 'exists:players,id'],
            'options'         => ['nullable', 'array'],
            'overrides'       => ['nullable', 'array'],
            'overrides.bio'   => ['nullable', 'string', 'max:2000'],
            'presentation_id' => ['nullable', 'integer', 'exists:player_presentations,id'],
        ]);
        $player = Player::findOrFail($validated['player_id']);
        $presentation = new Presentation([
            'player_id' => $player->id,
            'options'   => $this->normaliseOptions($validated['options'] ?? []),
        ]);
        // An attached external fiche is what guests get: preview that.
        if (! empty($validated['presentation_id'])) {
            $existing = Presentation::find($validated['presentation_id']);
            $presentation->external_asset_path = $existing?->external_asset_path;
            $presentation->external_asset_type = $existing?->external_asset_type;
        }
        $overrides = array_key_exists('bio', $validated['overrides'] ?? [])
            ? ['bio' => (string) $validated['overrides']['bio']]
            : [];

        try {
            $result = $this->pdfs->render($presentation, $player, $overrides);
        } catch (FicheLayoutException $e) {
            return $this->layoutError($e);
        }
        return response()->json([
            'pdf'    => base64_encode($result->pdf),
            'layout' => $result->meta(),
        ]);
    }

    /**
     * Raw HTML of the unsaved state, kept for API compatibility and layout
     * inspection. The editor previews the real PDF (previewPdf) instead,
     * because a browser does not lay out like the PDF engine.
     */
    public function previewHtml(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'player_id'    => ['required', 'integer', 'exists:players,id'],
            'template_key' => ['required', 'string'],
            'title'        => ['nullable', 'string', 'max:200'],
            'options'      => ['nullable', 'array'],
        ]);

        $player = Player::findOrFail($validated['player_id']);
        try {
            $html = $this->pdfs->render(new Presentation(['options' => $validated['options'] ?? []]), $player)->html;
        } catch (FicheLayoutException $e) {
            return $this->layoutError($e);
        }

        // DomPDF loads files from disk; map storage paths back to public URLs.
        $slash = static fn (string $p) => str_replace('\\', '/', $p);
        $html = str_replace(
            [$slash(public_path('storage/')), $slash(storage_path('app/public/'))],
            '/storage/',
            $slash($html),
        );

        return response()->json(['html' => $html]);
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

    /**
     * Uploads a ready-made fiche (PNG/JPG/WebP/PDF) that bypasses the
     * generator. Images are wrapped on one A4 page; PDFs are accepted only if
     * they already are exactly one A4 portrait page.
     */
    public function uploadAsset(Request $request, Presentation $presentation): JsonResponse
    {
        $request->validate([
            'asset' => ['required', 'file', 'mimes:jpeg,jpg,png,webp,pdf', 'max:12288'],
        ]);
        $player = $presentation->player;
        if (! $player) abort(404);

        $file  = $request->file('asset');
        $ext   = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'bin');
        $type  = $ext === 'pdf' ? 'pdf' : 'image';
        $bytes = (string) file_get_contents($file->getRealPath());

        if ($type === 'pdf') {
            try {
                $this->pdfs->assertUploadedPdf($bytes);
            } catch (FicheLayoutException $e) {
                return $this->layoutError($e);
            }
        }

        $stored = 'presentations/assets/'.$player->slug.'-'.$presentation->id.'-'.substr(bin2hex(random_bytes(3)), 0, 6).'.'.$ext;
        Storage::disk('public')->put($stored, $bytes);
        $previousAsset = $presentation->external_asset_path;

        $presentation->fill([
            'external_asset_path'          => Storage::url($stored),
            'external_asset_type'          => $type,
            'external_asset_original_name' => mb_substr($file->getClientOriginalName() ?: ('fiche.'.$ext), 0, 200),
        ]);
        try {
            $result = $this->pdfs->render($presentation, $player);
        } catch (FicheLayoutException $e) {
            Storage::disk('public')->delete($stored);
            $presentation->refresh();
            return $this->layoutError($e);
        }

        $presentation->save();
        $this->deleteLocal($previousAsset);
        $this->storePdf($presentation, $player, $result);

        return response()->json(['data' => $presentation->fresh(['player', 'author'])]);
    }

    /** Clears the external asset and falls back to the auto-generated PDF. */
    public function clearAsset(Presentation $presentation): JsonResponse
    {
        $player = $presentation->player;
        if (! $player) abort(404);

        $previousAsset = $presentation->external_asset_path;
        $presentation->fill([
            'external_asset_path'          => null,
            'external_asset_type'          => null,
            'external_asset_original_name' => null,
        ]);
        try {
            $result = $this->pdfs->render($presentation, $player);
        } catch (FicheLayoutException $e) {
            $presentation->refresh();
            return $this->layoutError($e);
        }

        $presentation->save();
        $this->deleteLocal($previousAsset);
        $this->storePdf($presentation, $player, $result);

        return response()->json(['data' => $presentation->fresh(['player', 'author'])]);
    }

    // -------------------- helpers --------------------

    private function validateData(Request $request, ?Presentation $existing = null): array
    {
        // Legacy template keys (classic/signature/magazine/minimal/stadium) are
        // silently accepted so historic presentations can still be edited and
        // saved. They are normalised to `marketing` before hitting the DB.
        $allowedKeys = array_unique(array_merge(
            PresentationTemplateRegistry::keys(),
            ['classic', 'signature', 'magazine', 'minimal', 'stadium'],
        ));

        return $request->validate([
            'player_id'    => [$existing ? 'sometimes' : 'required', 'integer', 'exists:players,id'],
            'template_key' => [$existing ? 'sometimes' : 'required', 'string', 'in:'.implode(',', $allowedKeys)],
            'title'        => [$existing ? 'sometimes' : 'required', 'string', 'max:200'],
            'is_published' => ['nullable', 'boolean'],
            'options'                       => ['nullable', 'array'],
            'options.accent_color'          => ['nullable', 'string', 'max:9'],
            'options.secondary_color'       => ['nullable', 'string', 'max:9'],
            'options.text_color'            => ['nullable', 'string', 'max:9'],
            'options.background_color'      => ['nullable', 'string', 'max:9'],
            'options.tagline'               => ['nullable', 'string', 'max:200'],
            'options.selected_stats'        => ['nullable', 'array', 'max:4'],
            'options.selected_stats.*'      => ['string', 'max:40'],
            'options.show_heatmap'          => ['nullable', 'boolean'],
            'options.photo_source'          => ['nullable', 'string', 'in:player,custom'],
            'options.custom_photo_url'      => ['nullable', 'string', 'max:500'],
            'options.photo_fit'             => ['nullable', 'string', 'in:contain,cover'],
            'options.photo_zoom'            => ['nullable', 'integer', 'min:100', 'max:250'],
            'options.photo_position_x'      => ['nullable', 'integer', 'min:0', 'max:100'],
            'options.photo_position_y'      => ['nullable', 'integer', 'min:0', 'max:100'],
            'options.font_family'               => ['nullable', 'string', 'in:editorial,sans,grotesque'],
            'options.font_scale'                => ['nullable', 'string', 'in:small,normal,large'],
            'options.language'                  => ['nullable', 'string', 'in:fr,en,de,nl'],
            'options.article_slug'              => ['nullable', 'string', 'max:200'],
            'options.youtube_url'               => ['nullable', 'string', 'max:500'],
            'options.qr_custom_url'             => ['nullable', 'string', 'max:500'],
            'options.previous_clubs'            => ['nullable', 'array', 'max:12'],
            'options.previous_clubs.*'          => ['array'],
            'options.previous_clubs.*.name'     => ['nullable', 'string', 'max:100'],
            'options.previous_clubs.*.logo_url' => ['nullable', 'string', 'max:500'],
            'options.partner_agency'                => ['nullable', 'array'],
            'options.partner_agency.name'           => ['nullable', 'string', 'max:120'],
            'options.partner_agency.logo_url'       => ['nullable', 'string', 'max:500'],
            'options.partner_agency.country'        => ['nullable', 'string', 'max:80'],
            'options.partner_agency.country_code'   => ['nullable', 'string', 'max:6'],
            'options.partner_agency.description'    => ['nullable', 'string', 'max:300'],
            'options.partner_academies'                    => ['nullable', 'array', 'max:8'],
            'options.partner_academies.*'                  => ['array'],
            'options.partner_academies.*.country'          => ['nullable', 'string', 'max:80'],
            'options.partner_academies.*.country_code'     => ['nullable', 'string', 'max:6'],
            'options.partner_academies.*.clubs'            => ['nullable', 'array', 'max:20'],
            'options.partner_academies.*.clubs.*'          => ['array'],
            'options.partner_academies.*.clubs.*.name'     => ['nullable', 'string', 'max:100'],
            'options.partner_academies.*.clubs.*.logo_url' => ['nullable', 'string', 'max:500'],
            'options.theme'          => ['nullable', 'string', 'in:violet,navy,black-gold,black-yellow,custom'],
            'options.photo_side'     => ['nullable', 'string', 'in:left,right'],
            'options.motto'          => ['nullable', 'string', 'max:120'],
            'options.slogan_cursive' => ['nullable', 'string', 'max:160'],
            'options.supervised_by'              => ['nullable', 'array'],
            'options.supervised_by.name'         => ['nullable', 'string', 'max:120'],
            'options.supervised_by.logo_url'     => ['nullable', 'string', 'max:500'],
            'options.supervised_by.country'      => ['nullable', 'string', 'max:80'],
            'options.supervised_by.country_code' => ['nullable', 'string', 'max:6'],
            'options.supervised_by.description'  => ['nullable', 'string', 'max:300'],
            'options.player_profile_bars'        => ['nullable', 'array', 'max:8'],
            'options.player_profile_bars.*'      => ['array'],
            'options.player_profile_bars.*.label'=> ['nullable', 'string', 'max:40'],
            'options.player_profile_bars.*.pct'  => ['nullable', 'integer', 'min:0', 'max:100'],
            // Premium fiche system.
            'options.composition'       => ['nullable', 'string', 'in:'.implode(',', FicheCompositions::keys())],
            'options.middle_variant'    => ['nullable', 'string', 'in:profile-strengths,profile-caracteristiques,parcours-strengths,profile-bars'],
            'options.projet_intro'      => ['nullable', 'string', 'max:600'],
            'options.header_motto'      => ['nullable', 'string', 'max:120'],
            'options.show_watermark'    => ['nullable', 'boolean'],
            'options.contact'           => ['nullable', 'array'],
            'options.contact.instagram' => ['nullable', 'string', 'max:80'],
            'options.contact.email'     => ['nullable', 'string', 'max:120'],
            'options.contact.phone'     => ['nullable', 'string', 'max:40'],
        ]);
    }

    private function normaliseOptions(array $opts): array
    {
        foreach (['show_heatmap', 'show_watermark'] as $k) {
            if (array_key_exists($k, $opts)) {
                $opts[$k] = filter_var($opts[$k], FILTER_VALIDATE_BOOLEAN);
            }
        }
        // Trim and sanitise colours - the renderer accepts #rgb / #rrggbb only.
        foreach (['accent_color', 'secondary_color', 'text_color', 'background_color'] as $k) {
            if (isset($opts[$k]) && is_string($opts[$k])) {
                $opts[$k] = trim($opts[$k]);
                if (! preg_match('/^#([0-9a-fA-F]{3}){1,2}$/', $opts[$k])) {
                    unset($opts[$k]);
                }
            }
        }
        // Empty strings -> null on the optional text fields so they fall back to defaults.
        foreach (['tagline', 'custom_photo_url', 'article_slug', 'youtube_url', 'qr_custom_url', 'motto', 'slogan_cursive', 'projet_intro', 'header_motto'] as $k) {
            if (isset($opts[$k]) && is_string($opts[$k]) && trim($opts[$k]) === '') {
                $opts[$k] = null;
            }
        }
        // Player profile bars: drop empty rows (label AND pct missing).
        if (isset($opts['player_profile_bars']) && is_array($opts['player_profile_bars'])) {
            $opts['player_profile_bars'] = array_values(array_filter(
                $opts['player_profile_bars'],
                static fn ($row) => is_array($row)
                    && ((isset($row['label']) && trim((string) $row['label']) !== '')
                        || (isset($row['pct']) && $row['pct'] !== null && $row['pct'] !== '')),
            ));
        }
        foreach (['supervised_by', 'partner_agency'] as $orgKey) {
            $opts = $this->normaliseOrg($opts, $orgKey);
        }
        // Drop fully-empty previous_clubs rows.
        if (isset($opts['previous_clubs']) && is_array($opts['previous_clubs'])) {
            $opts['previous_clubs'] = array_values(array_filter(
                $opts['previous_clubs'],
                static fn ($row) => is_array($row)
                    && ((isset($row['name']) && trim((string) $row['name']) !== '')
                        || (isset($row['logo_url']) && trim((string) $row['logo_url']) !== '')),
            ));
        }
        // Same for partner_academies: drop empty countries and clubs so the
        // grid doesn't render orphaned rows.
        if (isset($opts['partner_academies']) && is_array($opts['partner_academies'])) {
            $opts['partner_academies'] = array_values(array_filter(array_map(static function ($row) {
                if (! is_array($row)) return null;
                $clubs = array_values(array_filter(
                    is_array($row['clubs'] ?? null) ? $row['clubs'] : [],
                    static fn ($c) => is_array($c)
                        && ((isset($c['name']) && trim((string) $c['name']) !== '')
                            || (isset($c['logo_url']) && trim((string) $c['logo_url']) !== '')),
                ));
                $country = isset($row['country']) ? trim((string) $row['country']) : '';
                if ($country === '' && empty($clubs)) return null;
                $code = isset($row['country_code']) ? strtolower(trim((string) $row['country_code'])) : '';
                return ['country' => $country, 'country_code' => $code !== '' ? $code : null, 'clubs' => $clubs];
            }, $opts['partner_academies'])));
        }
        if (isset($opts['contact']) && is_array($opts['contact'])) {
            $opts['contact'] = array_map(
                static fn ($v) => is_string($v) ? trim($v) : '',
                array_intersect_key($opts['contact'], array_flip(['instagram', 'email', 'phone'])),
            );
        }
        return $opts;
    }

    /** Supervisor / partner agency blocks: trim, drop when entirely empty, lowercase the country code. */
    private function normaliseOrg(array $opts, string $key): array
    {
        if (! isset($opts[$key]) || ! is_array($opts[$key])) return $opts;
        $fields = ['name', 'logo_url', 'country', 'country_code', 'description'];
        $org = $opts[$key];
        if (collect($fields)->every(fn ($k) => ! isset($org[$k]) || trim((string) $org[$k]) === '')) {
            unset($opts[$key]);
            return $opts;
        }
        foreach ($fields as $k) {
            if (isset($org[$k]) && is_string($org[$k])) {
                $trimmed = trim($org[$k]);
                $org[$k] = $trimmed === '' ? null : $trimmed;
            }
        }
        if (! empty($org['country_code'])) $org['country_code'] = strtolower($org['country_code']);
        $opts[$key] = $org;
        return $opts;
    }

    /**
     * Migrate a legacy template key (classic/signature/magazine/minimal/
     * stadium) to `marketing` — the only template key currently shipped.
     */
    private function normaliseTemplateKey(string $key): string
    {
        $registered = PresentationTemplateRegistry::keys();
        if (in_array($key, $registered, true)) return $key;
        return 'marketing';
    }

    /**
     * Stores a verified PDF under a fresh name, then removes the previous
     * file — a valid PDF is never replaced by nothing.
     */
    private function storePdf(Presentation $presentation, Player $player, FicheResult $result): void
    {
        $previous = $presentation->file_path;
        $filename = 'presentations/'.$player->slug.'-'.$presentation->id.'-'.substr(bin2hex(random_bytes(3)), 0, 6).'.pdf';
        Storage::disk('public')->put($filename, $result->pdf);

        $presentation->update([
            'file_path'    => Storage::url($filename),
            'generated_at' => now(),
            'render_meta'  => $result->meta(),
        ]);
        if ($previous && $previous !== $presentation->file_path) {
            $this->deleteLocal($previous);
        }
    }

    private function layoutError(FicheLayoutException $e): JsonResponse
    {
        return response()->json([
            'message' => $e->getMessage(),
            'errors'  => ['layout' => [$e->getMessage()]],
            'details' => $e->details,
        ], 422);
    }

    private function deleteLocal(?string $url): void
    {
        if (! $url) return;
        if (! Str::startsWith($url, '/storage/')) return;
        $relative = Str::after($url, '/storage/');
        Storage::disk('public')->delete($relative);
    }
}
