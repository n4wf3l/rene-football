<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->assertSafeProductionConfig();
        $this->configureRateLimiters();
    }

    /**
     * Fail-fast if someone deploys with APP_DEBUG=true in production —
     * that would expose stack traces (env vars, file paths, versions)
     * to every 500 hit. Better to refuse boot loudly than serve one
     * request in that state.
     */
    private function assertSafeProductionConfig(): void
    {
        if ($this->app->environment('production') && $this->app['config']->get('app.debug')) {
            throw new \RuntimeException(
                'Refus de démarrer : APP_DEBUG=true en environnement production. '
                .'Corrigez APP_DEBUG=false dans le .env prod puis relancez.'
            );
        }
    }

    /**
     * Named rate limiters.
     *
     * `login` is composite:
     *   - 10 attempts/min per remote IP (blocks a single attacker),
     *   - 5  attempts/min per email    (protects a legitimate user behind
     *     a shared NAT from being locked out by someone else's spam, and
     *     also stops distributed brute-force targeted at one account).
     *
     * The first limit hit wins; the response is the standard 429 with a
     * `Retry-After` header.
     */
    private function configureRateLimiters(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower((string) $request->input('email', ''));
            return [
                Limit::perMinute(10)->by('ip:'.$request->ip()),
                Limit::perMinute(5)->by('email:'.$email),
            ];
        });
    }
}
