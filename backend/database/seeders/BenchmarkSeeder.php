<?php

namespace Database\Seeders;

use App\Models\Benchmark;
use Illuminate\Database\Seeder;

/**
 * Seeds the `benchmarks` table from `config/benchmarks.php`. Idempotent:
 * uses (category, tier, metric) as the upsert key. Running the seeder
 * again after a config bump re-applies the defaults without wiping any
 * manual DS overrides that happen to share a triplet (updates them to
 * the new default — that's the intent of "reset").
 */
class BenchmarkSeeder extends Seeder
{
    public function run(): void
    {
        $table = config('benchmarks', []);
        foreach ($table as $category => $tiers) {
            foreach ((array) $tiers as $tier => $metrics) {
                foreach ((array) $metrics as $metric => $row) {
                    Benchmark::updateOrCreate(
                        ['category' => $category, 'tier' => $tier, 'metric' => $metric],
                        [
                            'avg'   => (float) ($row['avg']   ?? 0),
                            'elite' => (float) ($row['elite'] ?? 0),
                            'unit'  => $row['unit'] ?? null,
                        ],
                    );
                }
            }
        }
    }
}
