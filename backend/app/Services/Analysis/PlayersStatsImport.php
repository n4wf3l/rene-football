<?php

namespace App\Services\Analysis;

use App\Models\Player;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

/**
 * Ingests a CSV of player stats and applies it to existing players.
 *
 * Row shape (header required, case-insensitive):
 *   slug          - required; matches Player::slug
 *   OR name       - fallback lookup by exact name when slug missing
 *   any other column matching a whitelisted stat field is written
 *
 * On success each touched player also gets its `stats_source`,
 * `stats_updated_at` and `stats_reliability` bumped so downstream analytics
 * can display data provenance.
 *
 * The whole apply happens in a single transaction: either everything
 * imports or nothing does. Return payload lists per-row outcomes so the UI
 * can show a diff (created 0 / updated N / errors M).
 */
class PlayersStatsImport
{
    /** Only these columns are import-writable. Prevents accidentally
     *  clobbering identity / relational fields via CSV. */
    public const WRITABLE = [
        'matches_played', 'minutes_played', 'goals', 'assists',
        'shots', 'shots_on_target', 'xg', 'xa', 'key_passes',
        'pass_accuracy', 'dribbles_completed', 'tackles', 'interceptions',
        'duels_won', 'yellow_cards', 'red_cards', 'clean_sheets', 'saves',
        'distance_avg_km', 'sprints_avg', 'top_speed_kmh', 'high_intensity_runs_avg',
        'potential_rating',
    ];

    /**
     * @param  string  $csv        Raw CSV content (UTF-8, with header row)
     * @param  string  $source     Provenance label (e.g. 'csv', 'wyscout')
     * @param  int     $reliability 1-5 self-declared reliability
     * @return array{
     *   updated: int,
     *   skipped: int,
     *   errors: array<int, array{row:int, slug:?string, reason:string}>,
     * }
     */
    public function apply(string $csv, string $source = 'csv', int $reliability = 4): array
    {
        return $this->applyRows($this->parseCsv($csv), $source, $reliability);
    }

    /**
     * Read an XLSX file from disk and apply the same import pipeline. Uses
     * PhpSpreadsheet — accepts anything the library can open (.xlsx, .xls,
     * .ods). Only the first sheet is read; the header row is line 1.
     */
    public function applyXlsx(string $path, string $source = 'xlsx', int $reliability = 4): array
    {
        try {
            $spreadsheet = IOFactory::load($path);
        } catch (\Throwable $e) {
            return ['updated' => 0, 'skipped' => 0, 'errors' => [['row' => 0, 'slug' => null, 'reason' => 'Unreadable spreadsheet: '.$e->getMessage()]]];
        }
        return $this->applyRows($this->xlsxToRows($spreadsheet), $source, $reliability);
    }

    /**
     * Shared apply pipeline once rows have been normalised (first row = header,
     * subsequent rows = data). Used by both CSV and XLSX paths so validation
     * + provenance write are identical whatever the source format.
     *
     * @param array<int, array<int|string, string>> $rows
     */
    private function applyRows(array $rows, string $source, int $reliability): array
    {
        if (count($rows) < 2) {
            return ['updated' => 0, 'skipped' => 0, 'errors' => [['row' => 0, 'slug' => null, 'reason' => 'Empty file']]];
        }

        $headerRow = array_shift($rows);
        $header = array_map(fn ($h) => strtolower(trim((string) $h)), array_values($headerRow));
        if (! in_array('slug', $header, true) && ! in_array('name', $header, true)) {
            return ['updated' => 0, 'skipped' => 0, 'errors' => [['row' => 0, 'slug' => null, 'reason' => 'Header must include `slug` or `name`']]];
        }

        $updated = 0;
        $skipped = 0;
        $errors  = [];

        DB::transaction(function () use ($rows, $header, $source, $reliability, &$updated, &$skipped, &$errors) {
            foreach ($rows as $i => $cellsRaw) {
                $rowNum = $i + 2; // header was line 1
                $cells = array_map(fn ($c) => (string) $c, array_values($cellsRaw));
                if (implode('', array_map('trim', $cells)) === '') { $skipped++; continue; }
                $row = array_combine($header, array_pad($cells, count($header), '')) ?: [];

                $slug = trim((string) ($row['slug'] ?? ''));
                $name = trim((string) ($row['name'] ?? ''));

                $player = null;
                if ($slug !== '') {
                    $player = Player::where('slug', $slug)->first();
                }
                if (! $player && $name !== '') {
                    $player = Player::where('name', $name)->first();
                }
                if (! $player) {
                    $errors[] = ['row' => $rowNum, 'slug' => $slug ?: null, 'reason' => 'Player not found (by slug or name)'];
                    continue;
                }

                $writes = [];
                foreach (self::WRITABLE as $field) {
                    if (! array_key_exists($field, $row)) continue;
                    $raw = trim((string) $row[$field]);
                    if ($raw === '') continue; // blank cell = leave existing value alone
                    $normalized = str_replace([',', ' '], ['.', ''], $raw);
                    if (! is_numeric($normalized)) {
                        $errors[] = ['row' => $rowNum, 'slug' => $player->slug, 'reason' => "Non-numeric value for $field: `$raw`"];
                        continue 2; // skip this whole row on any bad cell
                    }
                    $writes[$field] = $this->castField($field, (float) $normalized);
                }

                if (empty($writes)) { $skipped++; continue; }

                $writes['stats_source']       = Str::limit($source, 40, '');
                $writes['stats_updated_at']   = now();
                $writes['stats_reliability']  = max(1, min(5, $reliability));

                $player->update($writes);
                $updated++;
            }
        });

        return ['updated' => $updated, 'skipped' => $skipped, 'errors' => $errors];
    }

    /** Simple RFC4180-ish CSV row parser (handles quoted fields with commas
     *  and doubled quotes). Enough for spreadsheet exports; no schema-full lib. */
    private function parseRow(string $line): array
    {
        $out = [];
        $buf = '';
        $inQuotes = false;
        $len = strlen($line);
        for ($i = 0; $i < $len; $i++) {
            $c = $line[$i];
            if ($inQuotes) {
                if ($c === '"') {
                    if ($i + 1 < $len && $line[$i + 1] === '"') { $buf .= '"'; $i++; }
                    else { $inQuotes = false; }
                } else {
                    $buf .= $c;
                }
            } else {
                if ($c === ',') { $out[] = $buf; $buf = ''; }
                elseif ($c === '"') { $inQuotes = true; }
                else { $buf .= $c; }
            }
        }
        $out[] = $buf;
        return $out;
    }

    /** Split a raw CSV string into an array of row arrays using parseRow.
     *  Header is included as row 0 - applyRows() shifts it. */
    private function parseCsv(string $csv): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($csv));
        if (! is_array($lines)) return [];
        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') continue;
            $rows[] = $this->parseRow($line);
        }
        return $rows;
    }

    /** Read the first sheet of a PhpSpreadsheet workbook as a rows array. */
    private function xlsxToRows(Spreadsheet $spreadsheet): array
    {
        $sheet = $spreadsheet->getActiveSheet();
        $data  = $sheet->toArray(null, true, true, false);
        // Drop trailing fully-empty rows PhpSpreadsheet sometimes emits.
        while (! empty($data)) {
            $last = end($data);
            if (implode('', array_map(fn ($c) => trim((string) $c), (array) $last)) === '') array_pop($data);
            else break;
        }
        return array_values($data);
    }

    /** Integer vs float coercion per known stat shape. Uses the same schema
     *  the DB migration declared. */
    private function castField(string $field, float $value): int|float
    {
        $floats = ['xg', 'xa', 'pass_accuracy', 'distance_avg_km', 'top_speed_kmh', 'potential_rating'];
        if (in_array($field, $floats, true)) return round($value, 2);
        return (int) round($value);
    }
}
