<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * HTTP endpoints to run otherwise-SSH-only operations on Hostinger shared
 * hosting, which disables SSH on the Single plan. All routes are protected
 * by a shared `MAINT_SECRET` env value that must be set in production.
 *
 *  - `bootstrap` : first-time boot (migrations + admin creation + storage
 *    symlink). Idempotent for migrations; admin creation is a no-op if the
 *    account already exists.
 *  - `cronPurge` : hit daily by the Hostinger Cron Jobs scheduler to run
 *    the RGPD retention purge (submissions:purge).
 *  - `health`    : lightweight self-check (DB connectivity + Laravel boot).
 */
class MaintenanceController extends Controller
{
    /**
     * Shared secret guard. Returns true iff the header `X-Maint-Secret` on
     * the request matches the one configured in `.env` (`MAINT_SECRET`). In
     * local dev, the secret can be left empty and the guard refuses the
     * request to avoid an accidentally wide-open endpoint.
     */
    private function authorised(Request $request): bool
    {
        $expected = (string) config('maintenance.secret', env('MAINT_SECRET', ''));
        if ($expected === '') return false;
        $provided = (string) $request->header('X-Maint-Secret', '');
        // hash_equals = constant-time comparison, avoids timing side-channels.
        return hash_equals($expected, $provided);
    }

    /**
     * POST /api/_maintenance/bootstrap
     *
     * Runs migrations, creates the storage symlink, and (optionally) seeds
     * the first admin account from `admin_email` + `admin_password` payload.
     * Safe to call multiple times — migrations are idempotent via Laravel's
     * batch tracking, symlink creation is a no-op if the link exists, and
     * admin creation is skipped if the email already exists.
     */
    public function bootstrap(Request $request): JsonResponse
    {
        if (! $this->authorised($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $report = [];

        // --- 1. Migrations ---
        try {
            Artisan::call('migrate', ['--force' => true]);
            $report['migrate'] = ['ok' => true, 'output' => trim(Artisan::output())];
        } catch (Throwable $e) {
            $report['migrate'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // --- 2. Storage symlink ---
        // On Hostinger shared layout we expect `public_html/storage` to point
        // at `backend/storage/app/public`. If `php artisan storage:link` was
        // run as part of the deploy, nothing to do. Otherwise we create it
        // ourselves. Idempotent — skipped if the link / dir already exists.
        try {
            $target = storage_path('app/public');
            $link   = public_path('storage');
            if (! File::exists($link)) {
                // Préfixe `\` : symlink() est une fonction globale, sans ce
                // backslash PHP la cherche dans le namespace du contrôleur
                // (App\Http\Controllers\Api\symlink) et crashe avec
                // "Call to undefined function".
                if (@\symlink($target, $link)) {
                    $report['storage_link'] = ['ok' => true, 'created' => true];
                } else {
                    $report['storage_link'] = ['ok' => false, 'error' => 'symlink() failed — may need manual creation via File Manager'];
                }
            } else {
                $report['storage_link'] = ['ok' => true, 'created' => false];
            }
        } catch (Throwable $e) {
            $report['storage_link'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // --- 3. Admin seed (optional) ---
        $adminEmail = (string) $request->input('admin_email', '');
        $adminName  = (string) $request->input('admin_name', 'René');
        $adminPass  = (string) $request->input('admin_password', '');
        if ($adminEmail !== '' && $adminPass !== '') {
            try {
                $existing = User::where('email', strtolower($adminEmail))->first();
                if ($existing) {
                    $report['admin'] = ['ok' => true, 'action' => 'exists', 'id' => $existing->id];
                } else {
                    $user = User::create([
                        'name'              => $adminName,
                        'email'             => strtolower($adminEmail),
                        'password'          => Hash::make($adminPass),
                        'is_admin'          => true,
                        'email_verified_at' => now(),
                    ]);
                    $report['admin'] = ['ok' => true, 'action' => 'created', 'id' => $user->id];
                }
            } catch (Throwable $e) {
                $report['admin'] = ['ok' => false, 'error' => $e->getMessage()];
            }
        } else {
            $report['admin'] = ['ok' => true, 'action' => 'skipped (no credentials provided)'];
        }

        // --- 4. Clear caches ---
        try {
            Artisan::call('config:clear');
            Artisan::call('route:clear');
            Artisan::call('view:clear');
            $report['cache_clear'] = ['ok' => true];
        } catch (Throwable $e) {
            $report['cache_clear'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        return response()->json([
            'bootstrap_at' => now()->toIso8601String(),
            'report'       => $report,
        ]);
    }

    /**
     * POST /api/_maintenance/cron/purge
     *
     * Hit daily by Hostinger Cron Jobs to run the RGPD retention purge
     * (deletes contact submissions + CVs > 12 months unless archived).
     * Replaces the OS-level `php artisan schedule:run` that we can't use
     * on shared hosting without SSH.
     */
    public function cronPurge(Request $request): JsonResponse
    {
        if (! $this->authorised($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            Artisan::call('submissions:purge');
            $output = trim(Artisan::output());
            Log::info('Maintenance: submissions:purge ran via HTTP cron', ['output' => $output]);
            return response()->json([
                'ok'       => true,
                'at'       => now()->toIso8601String(),
                'output'   => $output,
            ]);
        } catch (Throwable $e) {
            Log::warning('Maintenance: submissions:purge failed', ['error' => $e->getMessage()]);
            return response()->json([
                'ok'    => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/_maintenance/health
     *
     * Lightweight public health check that bypasses the maint secret so
     * UptimeRobot / BetterUptime can hit it without needing the token.
     * Checks :
     *   - DB round-trip (SELECT 1)
     *   - App env + debug flag (debug MUST be false in prod)
     */
    public function health(): JsonResponse
    {
        $ok   = true;
        $info = ['app_env' => app()->environment(), 'debug' => (bool) config('app.debug')];

        try {
            \DB::select('select 1');
            $info['db'] = 'ok';
        } catch (Throwable $e) {
            $ok = false;
            $info['db'] = 'failed: '.$e->getMessage();
        }

        return response()->json(['ok' => $ok, 'at' => now()->toIso8601String(), 'info' => $info], $ok ? 200 : 503);
    }
}
