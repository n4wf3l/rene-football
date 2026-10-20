<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Maintenance secret
    |--------------------------------------------------------------------------
    | Shared token guarding the /api/_maintenance/* endpoints. Required to
    | run bootstrap (migrations + admin seed) and the daily cron purge over
    | HTTP on hosting providers that don't offer SSH (e.g. Hostinger Single).
    | Keep it long (>= 48 random chars) and set it in .env as MAINT_SECRET.
    */
    'secret' => env('MAINT_SECRET', ''),
];
