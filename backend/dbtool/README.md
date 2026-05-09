# DB tool — local Adminer

Browse the project's SQLite database from your browser, **without XAMPP** and
without launching MySQL. Adminer (single-file PHP DB UI) + the
`login-password-less` plugin are downloaded on demand and served by PHP's
built-in server on port 8080.

## One-time setup

From `backend/`:

```bash
composer db:install
```

Downloads `dbtool/adminer.php` and `dbtool/login-password-less.php` (both
gitignored — re-run anytime to upgrade).

## Daily use

```bash
composer db
```

Then open **http://127.0.0.1:8080**. The first time you'll see the Adminer
login screen pre-filled with the SQLite driver and the path to
`database/database.sqlite`:

- Username/Server: leave **empty**
- **Password: `rene`**  *(local fixed password — required because Adminer 5
  refuses empty passwords; this file is gitignored and the server only
  listens on loopback)*
- ☑️ **Permanent login** ← tick this and you'll never see the form again
- Click **Login**

After that, opening **http://127.0.0.1:8080** auto-logs you in for 30 days
(via Adminer's permanent-login cookie). It runs alongside `php artisan serve`
(port 8000) without conflict.

`Ctrl+C` in the terminal stops the server.

> Don't bind this to `0.0.0.0` or expose it on a public network. It's a dev
> tool with a hardcoded password — anyone reaching the port owns the database.
