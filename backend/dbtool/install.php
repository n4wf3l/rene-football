<?php

/**
 * Downloads the latest Adminer (single-file DB UI) into dbtool/adminer.php.
 * Run via `composer db:install` from the backend/ directory.
 *
 * Adminer is intentionally not vendored in the repo — we fetch it on demand
 * and keep dbtool/adminer.php in .gitignore. Re-run this script to upgrade.
 */

$url     = 'https://www.adminer.org/latest-en.php'; // English-only build, ~120 KB
$dest    = __DIR__ . DIRECTORY_SEPARATOR . 'adminer.php';
$ctxOpts = ['http' => ['user_agent' => 'rene-football-installer', 'timeout' => 20]];
$ctx     = stream_context_create($ctxOpts);

echo "→ Téléchargement d'Adminer depuis {$url}…", PHP_EOL;
$body = @file_get_contents($url, false, $ctx);
if ($body === false || strlen($body) < 50_000) {
    fwrite(STDERR, "✗ Échec du téléchargement (réseau ? proxy ? https ?). Tu peux télécharger manuellement {$url} et le placer en dbtool/adminer.php.\n");
    exit(1);
}

if (file_put_contents($dest, $body) === false) {
    fwrite(STDERR, "✗ Impossible d'écrire {$dest}.\n");
    exit(1);
}

printf("✓ Adminer installé : %s (%d Ko).%s", $dest, (int) (strlen($body) / 1024), PHP_EOL);
echo "Lance maintenant `composer db` puis ouvre http://127.0.0.1:8080", PHP_EOL;
