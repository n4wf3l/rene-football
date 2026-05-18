<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/**
 * The root route is reserved for a tiny API-only landing - this Laravel
 * instance is the API/PDF backend; the SPA lives on Vite (port 5173 in dev).
 * Blade is intentionally not used in the project (PdfController also renders
 * inline HTML instead of views).
 */
Route::get('/', function (Request $request) {
    if ($request->expectsJson() || $request->wantsJson()) {
        return response()->json([
            'service' => 'rene-football-api',
            'status'  => 'ok',
            'docs'    => [
                'players'        => '/api/players',
                'admin_login'    => '/api/admin/login (POST)',
                'health'         => '/up',
            ],
        ]);
    }

    $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
    $appUrl      = config('app.url');

    $html = <<<HTML
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Rene Football - API</title>
    <meta name="robots" content="noindex">
    <style>
        :root { color-scheme: light dark; }
        body {
            font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
            color: #18181b;
            background: #fafaf9;
            margin: 0;
            padding: 64px 24px;
            display: flex;
            justify-content: center;
        }
        @media (prefers-color-scheme: dark) {
            body { color: #f5f5f4; background: #0a0a0a; }
            .card { background: #18181b; border-color: rgba(245,245,244,0.08); }
            code { background: rgba(245,245,244,0.08); }
            a { color: #84b896; }
        }
        .card {
            max-width: 560px;
            width: 100%;
            background: #fff;
            border: 1px solid #e7e5e4;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 20px 40px -20px rgba(0,0,0,0.08);
        }
        .badge {
            display: inline-block;
            font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #0f5132;
            margin-bottom: 12px;
        }
        h1 { font-size: 28px; margin: 0 0 12px; letter-spacing: -0.02em; }
        p  { margin: 0 0 16px; color: #52525b; }
        @media (prefers-color-scheme: dark) { p { color: #a1a1aa; } }
        ul { padding-left: 18px; margin: 0; }
        li { margin: 6px 0; }
        code, a {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 13px;
        }
        code { background: #f5f5f4; padding: 2px 6px; border-radius: 4px; }
        a { color: #0f5132; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">René Football · API</span>
        <h1>Backend opérationnel.</h1>
        <p>Cette adresse sert l'API JSON et la génération PDF. L'interface utilisateur (SPA) tourne ailleurs.</p>
        <ul>
            <li>Frontend (dev) → <a href="{$frontendUrl}">{$frontendUrl}</a></li>
            <li>API roster → <a href="/api/players"><code>/api/players</code></a></li>
            <li>API health → <a href="/up"><code>/up</code></a></li>
            <li>DB browser local → <code>composer db</code> puis <a href="http://127.0.0.1:8080">127.0.0.1:8080</a></li>
        </ul>
    </div>
</body>
</html>
HTML;

    return response($html)->header('Content-Type', 'text/html; charset=utf-8');
});
