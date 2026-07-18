<?php

namespace App\Services\Analysis;

use App\Models\Appearance;
use App\Models\Player;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

/**
 * Bulk-import match appearances (one row = one match played by one player).
 *
 * Row shape (header case-insensitive):
 *   slug              required (or `name` fallback) — player identifier
 *   date              required — match_date (accepts YYYY-MM-DD, DD/MM/YYYY,
 *                     Excel serial numbers)
 *   opponent          optional
 *   competition       optional (e.g. "Ligue 1", "Champions League Q2")
 *   home              optional 1/0/true/false (defaults 1)
 *   score_team        optional
 *   score_opponent    optional
 *   minutes           optional (0-120)
 *   goals             optional
 *   assists           optional
 *   shots             optional
 *   shots_on_target   optional
 *   yellow_card       optional 0/1
 *   red_card          optional 0/1
 *   rating            optional 0-10
 *   notes             optional short text
 *
 * De-duplication: (player_id + match_date + opponent) is treated as a
 * unique triplet. Re-importing the same match updates the existing row
 * instead of stacking duplicates — safe to rerun a monthly export.
 */
class AppearancesImport
{
    public const NUMERIC = [
        'score_team', 'score_opponent', 'minutes', 'goals', 'assists',
        'shots', 'shots_on_target', 'rating',
    ];
    public const BOOL = ['home', 'yellow_card', 'red_card'];

    /**
     * @return array{
     *   created:int, updated:int, skipped:int,
     *   errors: array<int, array{row:int, slug:?string, reason:string}>,
     * }
     */
    public function applyCsv(string $csv): array
    {
        return $this->applyRows($this->parseCsv($csv));
    }

    public function applyXlsx(string $path): array
    {
        try {
            $spreadsheet = IOFactory::load($path);
        } catch (\Throwable $e) {
            return ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => [['row' => 0, 'slug' => null, 'reason' => 'Unreadable spreadsheet: '.$e->getMessage()]]];
        }
        return $this->applyRows($this->xlsxToRows($spreadsheet));
    }

    /** @param array<int, array<int, string>> $rows */
    private function applyRows(array $rows): array
    {
        if (count($rows) < 2) {
            return ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => [['row' => 0, 'slug' => null, 'reason' => 'Empty file']]];
        }

        $headerRow = array_shift($rows);
        $header = array_map(fn ($h) => strtolower(trim((string) $h)), array_values($headerRow));
        if (! in_array('slug', $header, true) && ! in_array('name', $header, true)) {
            return ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => [['row' => 0, 'slug' => null, 'reason' => 'Header must include `slug` or `name`']]];
        }
        if (! in_array('date', $header, true)) {
            return ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => [['row' => 0, 'slug' => null, 'reason' => 'Header must include `date`']]];
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors  = [];

        DB::transaction(function () use ($rows, $header, &$created, &$updated, &$skipped, &$errors) {
            foreach ($rows as $i => $cellsRaw) {
                $rowNum = $i + 2;
                $cells = array_map(fn ($c) => (string) $c, array_values($cellsRaw));
                if (implode('', array_map('trim', $cells)) === '') { $skipped++; continue; }
                $row = array_combine($header, array_pad($cells, count($header), '')) ?: [];

                $slug = trim((string) ($row['slug'] ?? ''));
                $name = trim((string) ($row['name'] ?? ''));
                $player = null;
                if ($slug !== '') $player = Player::where('slug', $slug)->first();
                if (! $player && $name !== '') $player = Player::where('name', $name)->first();
                if (! $player) {
                    $errors[] = ['row' => $rowNum, 'slug' => $slug ?: null, 'reason' => 'Player not found (by slug or name)'];
                    continue;
                }

                $date = $this->parseDate((string) ($row['date'] ?? ''));
                if (! $date) {
                    $errors[] = ['row' => $rowNum, 'slug' => $player->slug, 'reason' => 'Invalid or missing date'];
                    continue;
                }

                $writes = [
                    'player_id'      => $player->id,
                    'match_date'     => $date->toDateString(),
                    'competition'    => trim((string) ($row['competition'] ?? '')) ?: null,
                    'opponent'       => trim((string) ($row['opponent'] ?? '')) ?: null,
                    'notes'          => trim((string) ($row['notes'] ?? '')) ?: null,
                ];

                foreach (self::NUMERIC as $field) {
                    $raw = trim((string) ($row[$field] ?? ''));
                    if ($raw === '') continue;
                    $normalized = str_replace([',', ' '], ['.', ''], $raw);
                    if (! is_numeric($normalized)) {
                        $errors[] = ['row' => $rowNum, 'slug' => $player->slug, 'reason' => "Non-numeric $field: `$raw`"];
                        continue 2;
                    }
                    // Column name in the CSV vs the DB column name.
                    $dbField = $field === 'minutes' ? 'minutes_played' : $field;
                    $writes[$dbField] = $field === 'rating' ? round((float) $normalized, 2) : (int) round((float) $normalized);
                }

                foreach (self::BOOL as $field) {
                    $raw = trim((string) ($row[$field] ?? ''));
                    if ($raw === '') continue;
                    $writes[$field] = in_array(strtolower($raw), ['1', 'true', 'yes', 'oui', 'y'], true);
                }
                // Home defaults to true when unspecified so a bare export from a
                // system that only ships home matches doesn't get all flagged away.
                if (! array_key_exists('home', $writes)) $writes['home'] = true;

                // Upsert by (player_id, match_date, opponent) so re-imports don't
                // duplicate. The unique-ish triplet is enforced logically here
                // rather than at the DB level to keep the table portable.
                $existing = Appearance::where('player_id', $player->id)
                    ->whereDate('match_date', $writes['match_date'])
                    ->where('opponent', $writes['opponent'])
                    ->first();

                if ($existing) {
                    $existing->update($writes);
                    $updated++;
                } else {
                    Appearance::create($writes);
                    $created++;
                }
            }
        });

        return ['created' => $created, 'updated' => $updated, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * Accept ISO YYYY-MM-DD, French DD/MM/YYYY, US MM/DD/YYYY (heuristic),
     * and Excel serial numbers (both the 1900 and 1904 systems). Returns
     * null on unrecognizable input so the caller can surface a per-row error.
     */
    private function parseDate(string $raw): ?Carbon
    {
        $raw = trim($raw);
        if ($raw === '') return null;

        // Excel serial numbers are 5-6-digit integers in the 20000-70000 range.
        if (preg_match('/^\d{4,6}$/', $raw)) {
            $days = (int) $raw;
            // Excel's day-0 (with the 1900 leap-year bug) starts at 1899-12-30
            // for practical Unix mapping.
            return Carbon::createFromTimestamp(($days - 25569) * 86400);
        }
        // Try known formats in order.
        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y', 'm/d/Y', 'Y/m/d'] as $fmt) {
            try {
                $d = Carbon::createFromFormat($fmt, $raw);
                if ($d) return $d->startOfDay();
            } catch (\Throwable) { /* ignore, try next */ }
        }
        // Last resort: strtotime — permissive.
        try {
            $ts = strtotime($raw);
            return $ts ? Carbon::createFromTimestamp($ts)->startOfDay() : null;
        } catch (\Throwable) { return null; }
    }

    private function parseCsv(string $csv): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($csv));
        if (! is_array($lines)) return [];
        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') continue;
            $rows[] = $this->parseCsvRow($line);
        }
        return $rows;
    }

    private function parseCsvRow(string $line): array
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
                } else { $buf .= $c; }
            } else {
                if ($c === ',') { $out[] = $buf; $buf = ''; }
                elseif ($c === '"') { $inQuotes = true; }
                else { $buf .= $c; }
            }
        }
        $out[] = $buf;
        return $out;
    }

    private function xlsxToRows(Spreadsheet $spreadsheet): array
    {
        $sheet = $spreadsheet->getActiveSheet();
        $data  = $sheet->toArray(null, true, true, false);
        while (! empty($data)) {
            $last = end($data);
            if (implode('', array_map(fn ($c) => trim((string) $c), (array) $last)) === '') array_pop($data);
            else break;
        }
        return array_values($data);
    }
}
