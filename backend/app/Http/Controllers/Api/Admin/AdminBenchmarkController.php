<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Benchmark;
use App\Services\Analysis\Benchmarks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * Editable position × tier × metric benchmarks. The default set lives in
 * config/benchmarks.php and gets seeded on install; from there the DS can
 * update / add rows or reset a subset back to the seed.
 *
 * Kept intentionally light — a resource controller with 4 actions:
 *   GET    /admin/benchmarks              → full table (grouped)
 *   POST   /admin/benchmarks              → upsert a single row
 *   DELETE /admin/benchmarks/{id}         → remove an override (falls back to config)
 *   POST   /admin/benchmarks/reset        → re-run the seeder to restore defaults
 */
class AdminBenchmarkController extends Controller
{
    public function index(): JsonResponse
    {
        // Returns the merged view (DB + config fallback) so the UI never
        // sees a "half-empty" table for missing tiers, plus the raw DB
        // rows keyed by id so it can render the edit / delete affordance.
        return response()->json([
            'data' => [
                'table' => Benchmarks::table(),
                'rows'  => Benchmark::orderBy('category')->orderBy('tier')->orderBy('metric')->get(),
                'categories' => ['Gardien', 'Defenseur', 'Milieu', 'Attaquant'],
                'tiers'      => Benchmarks::TIERS,
            ],
        ]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category' => ['required', 'string', 'in:Gardien,Defenseur,Milieu,Attaquant'],
            'tier'     => ['required', 'string', 'in:'.implode(',', Benchmarks::TIERS)],
            'metric'   => ['required', 'string', 'max:60'],
            'avg'      => ['required', 'numeric', 'min:0'],
            'elite'    => ['required', 'numeric', 'min:0'],
            'unit'     => ['nullable', 'string', 'max:12'],
        ]);

        $row = Benchmark::updateOrCreate(
            ['category' => $data['category'], 'tier' => $data['tier'], 'metric' => $data['metric']],
            ['avg' => (float) $data['avg'], 'elite' => (float) $data['elite'], 'unit' => $data['unit'] ?? null],
        );
        Benchmarks::flush();
        return response()->json(['data' => $row]);
    }

    public function destroy(Benchmark $benchmark): JsonResponse
    {
        $benchmark->delete();
        Benchmarks::flush();
        return response()->json(['ok' => true]);
    }

    public function reset(): JsonResponse
    {
        Artisan::call('db:seed', ['--class' => 'BenchmarkSeeder', '--force' => true]);
        Benchmarks::flush();
        return response()->json(['ok' => true]);
    }
}
