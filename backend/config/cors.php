<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Whitelist of origins allowed to call the API from a browser. Never keep
    | `['*']` in production — that would let any third-party site XHR into
    | our endpoints. Managed via env so staging/prod each declare their own
    | frontends without editing config.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Comma-separated whitelist. Local dev defaults keep Vite + php artisan serve
    // working out of the box; production `.env` must set CORS_ALLOWED_ORIGINS
    // to the actual frontend domain(s), e.g.
    //   CORS_ALLOWED_ORIGINS=https://renefootball.com,https://www.renefootball.com
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(
        ',',
        (string) env(
            'CORS_ALLOWED_ORIGINS',
            'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000'
        )
    )))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-Requested-With', 'X-XSRF-TOKEN'],

    'exposed_headers' => [],

    'max_age' => 86400,

    // We use bearer tokens (localStorage), not cookie-based Sanctum SPA mode.
    // Flip to true if we ever migrate to cookie auth.
    'supports_credentials' => false,

];
