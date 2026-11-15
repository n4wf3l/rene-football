<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PageView;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * POST /api/track/view — anonymous page-view counter for the public site.
 *
 * The browser only sends the path it displays (and the referrer on the first
 * page of a visit). Everything else is derived here so a client can't inject
 * arbitrary resource types or slugs:
 *
 *   - bots and headless browsers are ignored;
 *   - admin, API and share-link paths are ignored;
 *   - the IP and user-agent are only used to compute a daily-rotating
 *     visitor_hash and are never stored.
 *
 * Always answers 204 so the client never has anything to handle.
 */
class TrackController extends Controller
{
    private const BOT_PATTERN = '/bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|okhttp/i';

    private const IGNORED_PREFIXES = ['/admin', '/api', '/p/', '/storage', '/.well-known'];

    public function view(Request $request): Response
    {
        $validated = $request->validate([
            'path'     => ['required', 'string', 'max:255'],
            'referrer' => ['nullable', 'string', 'max:2048'],
            'entry'    => ['nullable', 'boolean'],
        ]);

        $userAgent = (string) $request->userAgent();
        if ($userAgent === '' || preg_match(self::BOT_PATTERN, $userAgent)) {
            return response()->noContent();
        }

        $path = $this->normalisePath($validated['path']);
        if ($path === null) {
            return response()->noContent();
        }

        [$type, $slug] = $this->resourceFor($path);
        $isEntry = (bool) ($validated['entry'] ?? false);

        PageView::create([
            'path'          => $path,
            'resource_type' => $type,
            'slug'          => $slug,
            'visitor_hash'  => hash_hmac('sha256', $request->ip().'|'.$userAgent.'|'.now()->toDateString(), (string) config('app.key')),
            'is_entry'      => $isEntry,
            'referrer_host' => $isEntry ? $this->referrerHost($validated['referrer'] ?? null, $request) : null,
            'viewed_at'     => now(),
        ]);

        return response()->noContent();
    }

    /** "/joueurs/saeed-adams/?x=1#top" → "/joueurs/saeed-adams"; null when not worth counting. */
    private function normalisePath(string $raw): ?string
    {
        // Only a site-relative path is accepted, never a full URL.
        if (! str_starts_with($raw, '/') || str_starts_with($raw, '//')) {
            return null;
        }
        $path = parse_url($raw, PHP_URL_PATH);
        if (! is_string($path)) {
            return null;
        }
        $path = strtolower($path === '/' ? '/' : rtrim($path, '/'));
        if (! preg_match('#^/[a-z0-9/_-]*$#', $path)) {
            return null;
        }
        foreach (self::IGNORED_PREFIXES as $prefix) {
            if ($path === rtrim($prefix, '/') || str_starts_with($path, $prefix)) {
                return null;
            }
        }
        return $path;
    }

    /** @return array{0: string, 1: ?string} */
    private function resourceFor(string $path): array
    {
        if (preg_match('#^/joueurs/([a-z0-9-]+)$#', $path, $m)) {
            return ['player', $m[1]];
        }
        if (preg_match('#^/actualites/([a-z0-9-]+)$#', $path, $m)) {
            return ['article', $m[1]];
        }
        return ['page', null];
    }

    /** Keeps only the host of an external referrer ("l.instagram.com" → "instagram.com"). */
    private function referrerHost(?string $referrer, Request $request): ?string
    {
        if (! $referrer) {
            return null;
        }
        $host = parse_url($referrer, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return null;
        }
        $host = preg_replace('/^(www|m|l|lm)\./', '', strtolower($host));

        $ownHosts = array_filter([
            $request->getHost(),
            parse_url((string) config('app.url'), PHP_URL_HOST),
        ]);
        foreach ($ownHosts as $own) {
            if ($host === preg_replace('/^www\./', '', strtolower($own))) {
                return null;
            }
        }
        return substr($host, 0, 191);
    }
}
