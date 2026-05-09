# DB tool — local Adminer

Browse the project's SQLite database from your browser, **without XAMPP** and
without launching MySQL. Adminer (single-file PHP DB UI) is downloaded on
demand and served by PHP's built-in server on port 8080.

## One-time setup

From `backend/`:

```bash
composer db:install
```

This downloads the latest Adminer into `dbtool/adminer.php` (gitignored — re-run
the command anytime to upgrade Adminer).

## Daily use

```bash
composer db
```

Then open **http://127.0.0.1:8080** in your browser. You land on Adminer's
login screen with the SQLite driver and the absolute path to
`database/database.sqlite` already filled in — just click **Login**.

Tick **Permanent login** the first time and future visits skip even that one
click (Adminer remembers the connection in a cookie for 30 days).

The server keeps running until you stop it (`Ctrl+C`). It runs alongside
`php artisan serve` (port 8000) without conflict.

> Don't bind this to `0.0.0.0` or expose it on a public network. It's a dev
> tool with zero auth — anyone reaching the port owns the database.
