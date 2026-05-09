<?php

/**
 * Local DB browser entry-point.
 *
 * Goal: typing http://127.0.0.1:8080/ in the browser lands you straight on the
 * project's SQLite database in Adminer — no XAMPP, no MySQL.
 *
 * Adminer 5 refuses empty passwords by default, so we wrap it with the
 * `login-password-less` plugin and a fixed local password (`rene`). Tick
 * "Permanent login" the first time and you never see the form again.
 *
 * Never expose this folder over a public network. It's a dev tool.
 */

$adminer = __DIR__ . '/adminer.php';
$plugin  = __DIR__ . '/login-password-less.php';

if (!file_exists($adminer) || !file_exists($plugin)) {
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

// Pre-fill the connection on the very first visit so the user lands on the
// SQLite driver with the database path already typed in. PHP's built-in
// server rejects %5C (encoded backslash) as path-traversal, so we feed
// Adminer a forward-slash path — SQLite accepts both on Windows.
$sqlitePath = realpath(__DIR__ . '/../database/database.sqlite');
$sqliteUrl  = $sqlitePath !== false ? str_replace('\\', '/', $sqlitePath) : '';

// Always redirect bare `/` to a URL with the SQLite + db= query string so:
//   - first-time visitors land on a pre-filled login form;
//   - returning visitors with the `adminer_permanent` cookie hit a URL whose
//     (driver, db) tuple matches their saved login → Adminer auto-logs them in.
if ($sqliteUrl !== '' && empty($_GET) && empty($_POST)) {
    $params = http_build_query([
        'sqlite'   => '',
        'username' => '',
        'db'       => $sqliteUrl,
    ]);
    header('Location: /?' . $params, true, 302);
    exit;
}

/**
 * Adminer hook — invoked from inside adminer.php after its core (including
 * the namespaced Adminer\Plugin base class) has been bootstrapped.
 */
function adminer_object() {
    require_once __DIR__ . '/login-password-less.php';

    // Adminer 5 expects a `Plugins` manager that wraps user plugins and
    // proxies un-handled methods (bruteForceKey, …) to a base Adminer
    // instance. Returning the bare plugin breaks at first failed login.
    //
    // Local-only credential: typing this once unlocks Adminer until the
    // permanent-login cookie is cleared. This file is gitignored, and
    // `php -S 127.0.0.1:8080` only listens on loopback.
    return new \Adminer\Plugins([
        new \AdminerLoginPasswordLess(
            password_hash('rene', PASSWORD_DEFAULT)
        ),
    ]);
}

include __DIR__ . '/adminer.php';
