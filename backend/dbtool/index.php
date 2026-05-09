<?php

/**
 * Local DB browser entry-point.
 *
 * Goal: typing http://127.0.0.1:8080/ in the browser lands you straight on the
 * project's SQLite database in Adminer — no login form, no XAMPP, no MySQL.
 *
 * Strategy:
 *   1. The PHP built-in server (`php -S 127.0.0.1:8080 -t dbtool`) serves
 *      this file as `/`, and `adminer.php` as `/adminer.php`.
 *   2. On the bare URL we redirect to Adminer with the SQLite driver, the
 *      empty username, and the absolute path to database/database.sqlite
 *      pre-filled — Adminer connects immediately.
 *
 * Never expose this folder over a public network. It's a dev tool.
 */

$adminer = __DIR__ . DIRECTORY_SEPARATOR . 'adminer.php';
if (!file_exists($adminer)) {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo <<<HTML
<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Adminer manquant</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#18181b;background:#fafaf9;padding:32px;max-width:560px}
code{background:#e7e5e4;padding:2px 6px;border-radius:4px;font-family:ui-monospace,Menlo,monospace}
h1{font-size:22px;margin:0 0 12px}p{margin:0 0 12px}</style></head><body>
<h1>Adminer n'est pas encore installé</h1>
<p>Lance d'abord depuis <code>backend/</code> :</p>
<p><code>composer db:install</code></p>
<p>Puis relance le serveur (<code>composer db</code>) et recharge cette page.</p>
</body></html>
HTML;
    exit;
}

$sqlite     = realpath(__DIR__ . '/../database/database.sqlite');
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if (in_array($requestUri, ['/', '/index.php'], true)) {
    if ($sqlite === false) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Le fichier SQLite n'existe pas (database/database.sqlite). Lance `php artisan migrate` d'abord.";
        exit;
    }

    // PHP's built-in server rejects URIs containing %5C (encoded backslash) as
    // a path-traversal guard, so we feed Adminer a forward-slash path. SQLite
    // accepts either separator on Windows.
    $sqliteUrl = str_replace('\\', '/', $sqlite);

    $params = http_build_query([
        'sqlite'   => '',
        'username' => '',
        'db'       => $sqliteUrl,
    ]);
    header('Location: /adminer.php?' . $params, true, 302);
    exit;
}

// Any other URL (assets, etc.) — fall through to PHP's built-in router so
// adminer.php and its served sub-resources work normally.
return false;
