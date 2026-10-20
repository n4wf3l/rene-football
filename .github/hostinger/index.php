<?php

/**
 * Hostinger shared-hosting bootstrap for Laravel.
 *
 * Standard Laravel ships its own `public/index.php` that assumes
 * `../vendor/autoload.php`. On Hostinger shared we keep the Laravel app
 * outside the webroot (in `../backend/`) so .env, storage/ and vendor/ are
 * NOT reachable via HTTP. This file replaces Laravel's default and
 * re-routes the paths to the `../backend/` location.
 *
 * Expected filesystem layout :
 *   /home/u123456/
 *   ├── backend/                 ← Laravel app (uploaded by GH Actions)
 *   │   ├── vendor/
 *   │   ├── bootstrap/
 *   │   ├── storage/
 *   │   └── .env
 *   └── public_html/             ← webroot (served by Apache)
 *       ├── index.php            ← THIS FILE
 *       ├── .htaccess            ← routes /api, /storage, /up to this file
 *       ├── index.html           ← React SPA entry
 *       ├── assets/              ← React build assets
 *       └── storage/             ← symlink to ../backend/storage/app/public
 */

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$backend = __DIR__ . '/../backend';

// Determine if the framework is in maintenance mode (Laravel's own kill-switch).
if (file_exists($maintenance = $backend . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Composer autoload lives in backend/vendor, not vendor/.
require $backend . '/vendor/autoload.php';

// Bootstrap Laravel and handle the request.
(require_once $backend . '/bootstrap/app.php')
    ->handleRequest(Request::capture());
