<?php

namespace App\Services\Analysis;

use App\Models\Benchmark;
use App\Models\Player;
use Illuminate\Support\Facades\Cache;

/**
 * Reads the position × age-tier reference table (config/benchmarks.php) and
 * turns raw player stats into two useful outputs for the analytics UI:
 *
 * 1. `vs_avg` — how the player compares to the average peer (percentage,
 *    positive = above average, negative = below). Bounded to [-100, +100].
 * 2. `vs_elite` — where the player sits on the avg→elite axis (0 = at avg,
 *    100 = at or above elite). Used to color-code / gauge the radar.
 *
 * Only metrics defined in the benchmark for the player's (position, tier)
 * come back — the caller decides what to render when a metric has no
 * reference (e.g. show as "no benchmark" instead of guessing).
 */
class Benchmarks
{
    public const TIERS = ['u18', 'u21', 'young', 'prime', 'vet'];

    /** Age tier bucket a given age falls into. */
    public static function tierForAge(?int $age): string
    {
        $age = (int) ($age ?? 0);
        if ($age < 18) return 'u18';
        if ($age < 21) return 'u21';
        if ($age < 26) return 'young';
        if ($age < 31) return 'prime';
        return 'vet';
    }

    /** In-memory cache key for the merged (DB + config fallback) table.
     *  Flushed by `Benchmarks::flush()` after an admin edit. */
    private const CACHE_KEY = 'analysis.benchmarks.table';

    /**
     * Reference row for a given (position, tier), or an empty array when
     * either the category or the tier isn't defined. Caller-safe: never null.
     *
     * @return array<string, array{avg:float, elite:float, unit?:string}>
     */
    public static function profile(?string $category, string $tier): array
    {
        if (! $category) return [];
        $table = self::table();
        return $table[$category][$tier] ?? [];
    }

    /**
     * Full benchmark table. Merges the DB-persisted overrides on top of the
     * config defaults so a fresh install works out of the box and edits
     * take precedence once made. Cached for the duration of the request via
     * the array cache to avoid re-querying per player during a bulk report.
     *
     * @return array<string, array<string, array<string, array{avg:float, elite:float, unit?:string}>>>
     */
    public static function table(): array
    {
        return Cache::store('array')->rememberForever(self::CACHE_KEY, function () {
            $out = config('benchmarks', []);
            // Overlay DB rows on top of the config defaults.
            foreach (Benchmark::all() as $row) {
                $out[$row->category][$row->tier][$row->metric] = array_filter([
                    'avg'   => (float) $row->avg,
                    'elite' => (float) $row->elite,
                    'unit'  => $row->unit,
                ], fn ($v) => $v !== null && $v !== '');
            }
            return $out;
        });
    }

    /** Drop the in-memory table cache. Called after any admin write. */
    public static function flush(): void
    {
        Cache::store('array')->forget(self::CACHE_KEY);
    }

    /**
     * Compare a single value to its benchmark: returns `vs_avg` (signed %)
     * and `vs_elite` (0-100 scale where 0 = avg, 100 = elite). Both clamped.
     * Returns null when there's no benchmark row so the UI can degrade.
     *
     * @return array{vs_avg:float, vs_elite:float, avg:float, elite:float}|null
     */
    public static function compare(?string $category, string $tier, string $metric, float $value): ?array
    {
        $row = self::profile($category, $tier)[$metric] ?? null;
        if (! is_array($row)) return null;
        $avg   = (float) ($row['avg']   ?? 0);
        $elite = (float) ($row['elite'] ?? max($avg * 1.5, 0.001));
        $span  = max($elite - $avg, 0.0001);

        $vsAvg   = $avg > 0 ? round((($value - $avg) / $avg) * 100, 1) : 0.0;
        $vsElite = round((($value - $avg) / $span) * 100, 1);

        return [
            'avg'      => $avg,
            'elite'    => $elite,
            'vs_avg'   => max(-100.0, min(200.0, $vsAvg)),   // asymmetric: allow +200% but cap
            'vs_elite' => max(-50.0, min(120.0, $vsElite)),  // small underflow / overshoot allowed
        ];
    }

    /**
     * Full benchmark comparison for a player. Returns each defined metric
     * with the player's raw value + comparison struct. Non-benchmarked
     * metrics are omitted.
     *
     * @return array<string, array{value:float, avg:float, elite:float, vs_avg:float, vs_elite:float}>
     */
    public static function playerReport(Player $player): array
    {
        $tier    = self::tierForAge($player->age);
        $profile = self::profile($player->category, $tier);

        $out = [];
        foreach ($profile as $metric => $_row) {
            $value = (float) ($player->{$metric} ?? 0);
            $cmp   = self::compare($player->category, $tier, $metric, $value);
            if ($cmp === null) continue;
            $out[$metric] = array_merge(['value' => $value], $cmp);
        }
        return $out;
    }
}
