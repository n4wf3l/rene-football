<?php

/**
 * Downloads Adminer + the `login-password-less` plugin so we can browse the
 * project's SQLite database with a fixed local password (Adminer 5 refuses
 * empty passwords by default).
 *
 * Adminer 5 ships its plugin base class (Adminer\Plugin) inside adminer.php
 * itself — no separate plugin.php needed.
 *
 * Re-run via `composer db:install` whenever you want to upgrade.
 */

$pinned = 'v5.4.2';

$files = [
    [
        'url'  => 'https://www.adminer.org/latest-en.php',
        'dest' => __DIR__ . '/adminer.php',
        'min'  => 50_000,
    ],
    [
        'url'  => "https://raw.githubusercontent.com/vrana/adminer/{$pinned}/plugins/login-password-less.php",
        'dest' => __DIR__ . '/login-password-less.php',
        'min'  => 400,
    ],
];

$ctx = stream_context_create(['http' => ['user_agent' => 'rene-football-installer', 'timeout' => 20]]);

foreach ($files as $f) {
    echo "→ {$f['url']}", PHP_EOL;
    $body = @file_get_contents($f['url'], false, $ctx);
    if ($body === false || strlen($body) < $f['min']) {
        fwrite(STDERR, "✗ Échec du téléchargement (réseau ? proxy ? https ?). Tu peux télécharger manuellement et placer le fichier en {$f['dest']}.\n");
        exit(1);
    }
    if (file_put_contents($f['dest'], $body) === false) {
        fwrite(STDERR, "✗ Impossible d'écrire {$f['dest']}.\n");
        exit(1);
    }
    printf("  ✓ %s (%d Ko)%s", basename($f['dest']), (int) (strlen($body) / 1024), PHP_EOL);
}

echo PHP_EOL, "Installation terminée. Lance `composer db` puis ouvre http://127.0.0.1:8080", PHP_EOL;
echo "Mot de passe local : rene (à taper une fois, coche « Permanent login » pour ne plus jamais le retaper).", PHP_EOL;
