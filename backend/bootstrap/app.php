<?php

use App\Http\Middleware\EnsureAdmin;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => EnsureAdmin::class,
        ]);

        // Behind nginx / Cloudflare / any reverse proxy, the client IP
        // sits in X-Forwarded-For. Without trustProxies() every request
        // looks like it comes from the proxy → rate limits, IP logs and
        // request()->ip() would all be wrong.
        //
        // `at: '*'` trusts whatever proxy forwarded the request. Safe as
        // long as the app is genuinely behind a proxy in prod (which is
        // our deploy model). If we ever expose PHP-FPM directly to the
        // public internet, tighten `at:` to a CIDR list.
        $middleware->trustProxies(at: '*', headers:
            Request::HEADER_X_FORWARDED_FOR
            | Request::HEADER_X_FORWARDED_HOST
            | Request::HEADER_X_FORWARDED_PORT
            | Request::HEADER_X_FORWARDED_PROTO
            | Request::HEADER_X_FORWARDED_AWS_ELB
        );
    })
    ->withSchedule(function (Schedule $schedule): void {
        // Daily RGPD retention purge — deletes contact submissions + CV
        // files older than 12 months (see /confidentialite §5). Runs at
        // 03:15 UTC to avoid overlap with any morning traffic bursts.
        // Requires `php artisan schedule:work` (dev) or a cron entry
        // `* * * * * php artisan schedule:run` in prod.
        $schedule->command('submissions:purge')
            ->dailyAt('03:15')
            ->onOneServer()
            ->withoutOverlapping();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API routes must return a JSON 401 on missing auth. Without this,
        // Laravel's default handler tries to redirect to a `login` route
        // that we don't expose (there's no server-rendered login page - it
        // lives in the React SPA), which raises RouteNotFoundException 500.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
            return null;
        });
    })->create();
