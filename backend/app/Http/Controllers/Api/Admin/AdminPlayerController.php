<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Services\Analysis\AppearancesImport;
use App\Services\Analysis\PlayerAnalysisReport;
use App\Services\Analysis\PlayersStatsImport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AdminPlayerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Player::query()->orderBy('name')->get(),
        ]);
    }

    /**
     * Bulk-import numeric stats from a CSV. See PlayersStatsImport::WRITABLE
     * for the accepted columns. Header row must include `slug` (preferred)
     * or `name`. Blank cells leave existing values untouched.
     *
     * Body:
     *   file          (required) CSV upload, up to 2 MB
     *   source        (optional) provenance label, default 'csv'
     *   reliability   (optional) 1-5 self-declared reliability, default 4
     */
    public function importStats(Request $request, PlayersStatsImport $importer): JsonResponse
    {
        $request->validate([
            'file'        => ['required', 'file', 'mimes:csv,txt,xlsx,xls,ods', 'max:4096'],
            'source'      => ['nullable', 'string', 'max:40'],
            'reliability' => ['nullable', 'integer', 'min:1', 'max:5'],
        ]);

        $file = $request->file('file');
        $ext  = strtolower((string) ($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'csv'));
        $source      = (string) $request->input('source', 'csv');
        $reliability = (int) $request->input('reliability', 4);

        // Spreadsheet formats go through PhpSpreadsheet, everything else is
        // treated as CSV (which handles our template + generic exports).
        if (in_array($ext, ['xlsx', 'xls', 'ods'], true)) {
            $result = $importer->applyXlsx($file->getRealPath(), $source, $reliability);
        } else {
            $csv = (string) file_get_contents($file->getRealPath());
            $result = $importer->apply($csv, $source, $reliability);
        }

        return response()->json(['data' => $result]);
    }

    /**
     * Bulk-import match appearances. Same UX contract as importStats but
     * writes into the `appearances` table so the Évolution tab has data to
     * plot. Payload validation intentionally lax: the service does the
     * heavy per-row checks and returns a diff the UI can render.
     */
    public function importAppearances(Request $request, AppearancesImport $importer): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls,ods', 'max:8192'],
        ]);
        $file = $request->file('file');
        $ext  = strtolower((string) ($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'csv'));
        $result = in_array($ext, ['xlsx', 'xls', 'ods'], true)
            ? $importer->applyXlsx($file->getRealPath())
            : $importer->applyCsv((string) file_get_contents($file->getRealPath()));
        return response()->json(['data' => $result]);
    }

    /**
     * Blank appearances CSV template with the roster's slug + name pre-filled
     * so the admin can copy their Wyscout/club export column by column.
     */
    public function appearancesTemplate(): Response
    {
        $cols = ['slug', 'name', 'date', 'competition', 'opponent', 'home', 'score_team', 'score_opponent',
            'minutes', 'goals', 'assists', 'shots', 'shots_on_target', 'yellow_card', 'red_card', 'rating', 'notes'];
        $csv = implode(',', $cols)."\n";
        foreach (Player::query()->orderBy('name')->get(['slug', 'name']) as $p) {
            $csv .= '"'.str_replace('"', '""', $p->slug).'","'.str_replace('"', '""', $p->name).'"'
                .str_repeat(',', count($cols) - 2)."\n";
        }
        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="rene-football-appearances-template.csv"',
        ]);
    }

    /**
     * Internal analysis dossier PDF for a single player. Dense, sober,
     * data-first — meant for staff meetings / archives, not to be sent to
     * clubs (use the marketing Presentation PDF for that).
     */
    public function analysisReport(Player $player, PlayerAnalysisReport $report): SymfonyResponse
    {
        $html = $report->render($player);
        $pdf  = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        return $pdf->stream('analyse-'.$player->slug.'.pdf');
    }

    /**
     * Empty CSV template with all supported columns + the current roster
     * pre-filled (slug + name) so the admin can just fill in the numbers
     * from an Excel export.
     */
    public function statsTemplate(): Response
    {
        $cols = array_merge(['slug', 'name'], PlayersStatsImport::WRITABLE);
        $csv  = implode(',', $cols)."\n";
        foreach (Player::query()->orderBy('name')->get(['slug', 'name']) as $p) {
            $csv .= '"'.str_replace('"', '""', $p->slug).'","'.str_replace('"', '""', $p->name).'"'
                .str_repeat(',', count(PlayersStatsImport::WRITABLE))."\n";
        }
        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="rene-football-stats-template.csv"',
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

        // Photo upload: file beats photo_url string when both are present.
        if ($request->hasFile('photo')) {
            $data['photo_url'] = $this->storePhoto($request, $data['slug']);
        }
        unset($data['photo'], $data['photo_remove']);

        $player = Player::create($data);

        return response()->json(['data' => $player], 201);
    }

    public function update(Request $request, Player $player): JsonResponse
    {
        $data = $this->validateData($request, $player);

        if (isset($data['name']) && $data['name'] !== $player->name) {
            $data['slug'] = $this->ensureUniqueSlug($data['name'], $player->id);
        }

        if ($request->hasFile('photo')) {
            $this->deleteLocalPhoto($player->photo_url);
            $data['photo_url'] = $this->storePhoto($request, $data['slug'] ?? $player->slug);
        } elseif ($request->boolean('photo_remove')) {
            $this->deleteLocalPhoto($player->photo_url);
            $data['photo_url'] = null;
        }
        unset($data['photo'], $data['photo_remove']);

        $player->update($data);

        return response()->json(['data' => $player->fresh()]);
    }

    public function destroy(Player $player): JsonResponse
    {
        $this->deleteLocalPhoto($player->photo_url);
        $player->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Store an uploaded photo on the public disk under players/<slug>-<hash>.<ext>.
     * Returns the URL the frontend can render directly (e.g. /storage/players/xxx.jpg).
     */
    private function storePhoto(Request $request, string $slugForName): string
    {
        $file = $request->file('photo');
        $ext = $file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'jpg';
        $filename = $slugForName.'-'.substr(bin2hex(random_bytes(4)), 0, 8).'.'.$ext;
        $path = $file->storeAs('players', $filename, 'public');
        return Storage::url($path);
    }

    /** Delete the file behind a photo_url if (and only if) it points to our local /storage. */
    private function deleteLocalPhoto(?string $url): void
    {
        if (! $url) return;
        if (! Str::startsWith($url, '/storage/')) return; // ignore external URLs
        $relative = Str::after($url, '/storage/');
        Storage::disk('public')->delete($relative);
    }

    private function validateData(Request $request, ?Player $player = null): array
    {
        // Multipart requests can't carry nested arrays cleanly; the frontend
        // serializes complex fields as JSON strings. Decode them back here so
        // the validator sees real arrays.
        foreach (['heatmap_grid', 'comparisons', 'strengths', 'tags'] as $jsonField) {
            $val = $request->input($jsonField);
            if (is_string($val) && $val !== '') {
                $decoded = json_decode($val, true);
                if (is_array($decoded)) {
                    $request->merge([$jsonField => $decoded]);
                }
            }
        }
        // Cast string booleans coming from FormData ("0"/"1"/"true"/"false").
        foreach (['is_published', 'photo_remove'] as $boolField) {
            if ($request->has($boolField)) {
                $request->merge([
                    $boolField => filter_var($request->input($boolField), FILTER_VALIDATE_BOOLEAN),
                ]);
            }
        }

        // On update we accept partial payloads (e.g. the presentation editor
        // only sends `bio`), so the fields that would otherwise be `required`
        // become `sometimes`. `sometimes` skips the rule when the field is
        // absent from the request but still enforces the remaining rules when
        // it *is* present, which is exactly PATCH semantics.
        $req = $player ? 'sometimes' : 'required';
        $rules = [
            'name' => [$req, 'string', 'max:255'],
            // Lowered to 8 to allow young academy players (e.g. U13 representés
            // par l'agence). The frontend mirrors this bound.
            'age' => [$req, 'integer', 'min:8', 'max:60'],
            'height' => ['nullable', 'string', 'max:20'],
            'position' => [$req, 'string', 'max:120'],
            'category' => [$req, 'string', 'in:Gardien,Defenseur,Milieu,Attaquant'],
            'club' => ['nullable', 'string', 'max:255'],
            'nationality' => ['nullable', 'string', 'max:120'],
            'preferred_foot' => ['nullable', 'string', 'max:20'],
            'since' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'photo_url'    => ['nullable', 'string', 'max:500'],
            'photo'        => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'], // 4 MB
            'photo_remove' => ['nullable', 'boolean'],
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

            // Tags: free-form short labels.
            'tags'   => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:40'],

            // Physical tracking (per-match averages).
            'distance_avg_km'         => ['nullable', 'numeric', 'min:0', 'max:20'],
            'sprints_avg'             => ['nullable', 'integer', 'min:0', 'max:200'],
            'top_speed_kmh'           => ['nullable', 'numeric', 'min:0', 'max:50'],
            'high_intensity_runs_avg' => ['nullable', 'integer', 'min:0', 'max:300'],

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
