# Rene Football — Audit sécurité avant prod

**Dernière révision :** 2026-09-28 — 9/9 items applicatifs corrigés.

Audit croisé avec les checklists Laravel 11 + Sanctum + SPA de 2026 (voir
sources en fin de doc). Format : ✅ conforme · ⚠️ à corriger · 🔴 bloquant prod.

---

## Résumé exécutif

**État actuel : 9/9 items applicatifs corrigés ✅**
Reste uniquement les items de config serveur (nginx headers) documentés
dans [DEPLOYMENT.md](DEPLOYMENT.md) §4, à appliquer au déploiement.

Tests de non-régression sécurité : `login rate limits ip` + `login rate
limits per email` + `partner logo rejects svg uploads` + `partner logo
accepts png uploads` (4 nouveaux tests, tous verts dans la suite 61/61).

Aucun secret dans git. Pas de SQL injection. Pas d'XSS exploitable. Auth
correcte + rate-limitée. Uploads sanitizés. Reverse-proxy-aware. Debug
mode bloqué runtime en production.

---

## 🔴 Bloquants — TOUS CORRIGÉS ✅

### B1. ✅ CORS wildcard — `Access-Control-Allow-Origin: *`

**Fichier** : [backend/config/cors.php](backend/config/cors.php)
**Actuel** :
```php
'allowed_origins' => ['*'],
'allowed_methods' => ['*'],
```
**Risque** : n'importe quel domaine peut appeler l'API depuis un navigateur.
Amplifie tout leak de token (XSS sur un autre site → vol de session).

**Corrigé** : `config/cors.php` lit `CORS_ALLOWED_ORIGINS` (comma-separated),
defaults dev-friendly, `allowed_methods` restreint aux verbes réels,
`allowed_headers` explicites. `.env.example` documente la variable prod.

### B2. ✅ Tokens Sanctum sans expiration

**Fichier** : [backend/config/sanctum.php](backend/config/sanctum.php) ligne ~50
**Actuel** : `'expiration' => null` → un token volé reste valide à vie.

**Corrigé** : `config/sanctum.php` — `'expiration' => (int) env('SANCTUM_EXPIRATION_MINUTES', 60 * 24 * 7)` (7 jours par défaut, overridable via env). Le frontend catche déjà 401 → redirect login.

### B3. ✅ Pas de rate limit sur `/api/admin/login` — brute-force ouvert

**Fichier** : [backend/routes/api.php](backend/routes/api.php) ligne 42
**Actuel** :
```php
Route::post('/admin/login', [AuthController::class, 'login']);
```
Un attaquant peut spam-tester des mots de passe sans limite.

**Corrigé** : `routes/api.php` — `->middleware('throttle:login')` +
`AppServiceProvider::configureRateLimiters()` déclare le limiteur nommé
`login` avec **double contrainte** : 10/min/IP ET 5/min/email. Le premier
seuil atteint déclenche 429. Tests : `login rate limits ip after 10 attempts`
+ `login rate limits per email after 5 attempts`.

### B4. ✅ Upload SVG sur logos partenaires → XSS potentiel

**Fichier** : [backend/app/Http/Controllers/Api/Admin/AdminPartnerController.php](backend/app/Http/Controllers/Api/Admin/AdminPartnerController.php)
**Actuel** : `'logo' => ['..., 'mimes:jpeg,jpg,png,webp,svg', ...']`
**Risque** : un SVG peut contenir `<script>`. Servi depuis `/storage/partners/*`, il s'exécute dans l'origine du site → session admin exfiltrable.

**Corrigé** : `svg` retiré des mimes acceptés dans `AdminPartnerController`.
Un logo SVG doit être converti offline en PNG/WebP avant upload. Test :
`partner logo rejects svg uploads`.

---

## ⚠️ À corriger avant ship — TOUS CORRIGÉS ✅

### W1. ✅ `APP_DEBUG=true` dans `.env`

**Corrigé** : `AppServiceProvider::assertSafeProductionConfig()` lance une
`RuntimeException` explicite si `APP_ENV=production` + `APP_DEBUG=true` au
boot. Impossible de servir une seule requête avec cette combinaison.

### W2. ✅ Comptes de démo dans `DatabaseSeeder`

**Fichier** : [backend/database/seeders/DatabaseSeeder.php](backend/database/seeders/DatabaseSeeder.php)
Contient `admin@rene-football.test` / `admin1234` + 3 autres comptes faibles
(chef1234, youth1234, scout1234). Si `php artisan db:seed` tourne en prod →
comptes admin faibles accessibles.

**Corrigé** : les 4 comptes de démo (admin1234, chef1234, youth1234,
scout1234) extraits dans `DemoAccountsSeeder`. Ce seeder :
- refuse de tourner en `APP_ENV=production` (throw explicite),
- n'est **pas** appelé par `DatabaseSeeder::run()` en staging/prod,
- reste auto-invoqué en `APP_ENV=local` pour préserver le workflow dev.
En prod, l'admin se crée manuellement via tinker avec un mot de passe fort
(cf DEPLOYMENT.md §2).

### W3. ✅ Session cookies non hardened en prod

**Fichier** : [backend/config/session.php](backend/config/session.php)
`'secure' => env('SESSION_SECURE_COOKIE')` → défaut `null` → cookies transmis
en HTTP clair aussi. Idem pour `same_site` (défaut `lax`, correct mais à
verrouiller).

**Corrigé** : `.env.example` documente maintenant explicitement ces
variables avec un bloc dédié `--- Cookie hardening — PROD ONLY ---` et
les valeurs recommandées. `config/session.php` lisait déjà ces env vars
avec des defaults sûrs (`HTTP_ONLY=true`, `SAME_SITE=lax`), il suffit de
setter `SESSION_SECURE_COOKIE=true` et `SESSION_DOMAIN` en prod.

### W4. ✅ Aucun `TrustProxies` derrière le reverse proxy

**Manque** : `App\Http\Middleware\TrustProxies` n'est pas configuré. Si
nginx/Cloudflare est devant Laravel, `$request->ip()` renverra l'IP du
proxy (pas celle du visiteur) → le rate limit `throttle:5,1` sur `/contact`
peut se déclencher trop tôt (tout le monde a l'IP du proxy).

**Corrigé** : `bootstrap/app.php` — `$middleware->trustProxies(at: '*',
headers: HEADER_X_FORWARDED_FOR|HOST|PORT|PROTO|AWS_ELB)`. `request()->ip()`
et `throttle` renvoient/limitent maintenant sur la vraie IP client
derrière nginx/Cloudflare.

### W5. ✅ Endpoint `/` (Laravel) — expose des URLs internes

**Fichier** : [backend/routes/web.php](backend/routes/web.php) ligne 90-95
Le landing page HTML liste `/api/players`, "DB browser local → composer db →
127.0.0.1:8080". Ces liens ne sont pas exploitables (localhost) mais
révèlent le stack et invitent au fingerprinting.

**Corrigé** : `routes/web.php` — `if (app()->environment('production')) abort(404);`
au tout début du handler. Le landing complet reste servi en dev / staging.

### W6. Health endpoint `/up` public et non authentifié

Le health check Laravel `/up` retourne 200 + du HTML. C'est utilisé par le
monitoring, mais si un attaquant identifie que c'est Laravel via cet
endpoint (fingerprint), il peut cibler des CVE.

**Fix optionnel** : protéger par IP whitelist côté nginx, ou custom key
`/up?token=...`. Faible risque mais bonne hygiène.

---

## ✅ Déjà bien fait

| Point | Où | État |
|---|---|---|
| **Laravel 12** (support jusqu'à fév 2027) | `composer.json` | ✅ ligne `"laravel/framework": "^12.0"` |
| **Sanctum 4** | `composer.json` | ✅ |
| **Password hashing bcrypt** (Laravel default) | `Hash::make()` partout | ✅ |
| **Token abilities définies** au login | `AuthController::login` | ✅ `->createToken('admin-spa', ['admin'])` (⚠️ mais `tokenCan()` jamais appelé — voir I1) |
| **Middleware admin custom** sur toutes les routes admin | `EnsureAdmin` + prefix `/admin` | ✅ |
| **401 JSON** au lieu de redirect vers `login` (route inexistante) | `bootstrap/app.php` | ✅ |
| **Mass assignment protégé** — tous les modèles utilisent `$fillable` | `app/Models/*` | ✅ Aucun `Model::unguard`, aucun `$guarded = []` |
| **File uploads validés** (mime + max size) | Tous les controllers admin | ✅ (sauf SVG partenaires — voir B4) |
| **CV upload isolé** : nom randomisé, storage/public disk | `ContactController::store` | ✅ `Str::random(20)` |
| **Rate limit sur contact form** (5/min/IP) | `routes/api.php` ligne 60 | ✅ |
| **Public endpoints refusent les unpublished** | `PlayerController::show`, `ArticleController::show` | ✅ `abort_unless($p->is_published, 404)` |
| **Pas de SQL injection** | grep `whereRaw`/`selectRaw` | ✅ Un seul `selectRaw` sans input user |
| **Pas de XSS exploitable côté React** | React auto-escape, un seul `dangerouslySetInnerHTML` sur SVG serveur statique | ✅ |
| **Pas de `dd()`/`dump()` oubliés** | grep app/ | ✅ |
| **Pas de `console.log` en prod frontend** | grep frontend/src/ | ✅ |
| **`.env` gitignoré, jamais commité** | `git log --all --full-history` | ✅ |
| **Health endpoint** existe (`/up`) | Laravel healthcheck | ✅ (mais voir W6) |

---

## ℹ️ Améliorations optionnelles

### I1. `tokenCan()` jamais utilisé

Les tokens ont l'ability `['admin']` mais aucun endpoint ne vérifie
`->tokenCan('admin')`. Ça marche parce que le middleware `admin` bloque déjà
les non-admins, donc pas de faille — mais les abilities Sanctum ne servent
à rien tant qu'on ne les utilise pas. Utile si tu ajoutes plus tard
un token "read-only" ou "scout" avec abilities différentes.

### I2. Pas de `SecurityHeaders` middleware Laravel

Toute la sécurité HTTP (CSP, HSTS, X-Frame-Options, etc.) est déférée à
nginx. C'est la bonne approche pour la perf, mais un middleware Laravel
optionnel (`spatie/laravel-csp` ou custom) permet de builder une CSP
nonce-based dynamique. Faible priorité pour ce site (pas de tiers scripts
en dehors de Google Fonts + YouTube embed).

### I3. Aucun package de scan sécurité en CI

Aucun `composer audit` ni `npm audit --production` automatisé. Rapide à
ajouter dans le workflow GitHub Actions.

### I4. Pas de `laravel/pulse` / monitoring proactif

Optionnel. Utile pour détecter les anomalies (spike de 401, spike de
uploads), mais pas critique pour un site avec 1-2 admins.

---

## 📋 Actions à faire — checklist finale avant push prod

**Code applicatif — TOUT FAIT ✅**

- [x] **B1** : CORS verrouillé, `CORS_ALLOWED_ORIGINS` env-driven
- [x] **B2** : `SANCTUM_EXPIRATION_MINUTES=10080` (7 jours) par défaut
- [x] **B3** : rate limiter `login` (10/min/IP + 5/min/email)
- [x] **B4** : SVG retiré des uploads partenaires
- [x] **W1** : `APP_DEBUG=true` en prod → runtime exception au boot
- [x] **W2** : comptes démo isolés dans `DemoAccountsSeeder`
- [x] **W3** : `.env.example` documente `SESSION_SECURE_COOKIE` + friends
- [x] **W4** : `TrustProxies` configuré (`*`, X-Forwarded-*)
- [x] **W5** : landing `/` répond 404 en production

**À faire côté ops au moment du déploiement** :

- [ ] Générer un **nouveau `APP_KEY`** en prod (`php artisan key:generate`) — ne pas réutiliser celui du `.env` dev
- [ ] Setter dans `.env` prod : `CORS_ALLOWED_ORIGINS`, `SESSION_SECURE_COOKIE=true`, `SESSION_DOMAIN=.renefootball.com`, `APP_DEBUG=false`, `APP_ENV=production`
- [ ] Créer l'admin manuellement via tinker (mot de passe fort, jamais un des seeds démo)
- [ ] Ne **jamais** lancer `php artisan db:seed` en prod

**Sur le serveur nginx** (déjà dans DEPLOYMENT.md §4, mais rappel) :

- [ ] Redirect 301 HTTP → HTTPS
- [ ] HSTS : `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] `X-Frame-Options: SAMEORIGIN` (ou `frame-ancestors 'none'` via CSP)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] CSP simple : `default-src 'self'; style-src 'self' fonts.googleapis.com 'unsafe-inline'; font-src fonts.gstatic.com; img-src 'self' data: flagcdn.com; frame-src www.youtube-nocookie.com`
- [ ] Bloquer accès `.env`, `.git/`, `composer.json` — `location ~ /\. { deny all; }`

---

## Sources — checklists 2026

- [Laravel Security Checklist 2026: 50 Production Items — Deploynix](https://dev.to/deploynix/a-laravel-developers-production-security-checklist-2026-edition-406c)
- [Laravel Security Best Practices — TuxCare](https://tuxcare.com/blog/laravel-security/)
- [16 Laravel security best practices for 2026 — Benjamin Crozat](https://benjamincrozat.com/laravel-security-best-practices)
- [Nginx Security Headers Configuration 2026 — HostMyCode](https://www.hostmycode.com/tutorials/nginx-security-headers-configuration-tutorial-2026-csp-hsts-safer-defaults-vps)
- [Laravel CSP Complete Guide 2026 — Shakil Tech](https://blog.shakiltech.com/laravel-content-security-policy-guide/)
- [Laravel authentication guide 2026 — WorkOS](https://workos.com/blog/laravel-authentication-guide-2026)
- OWASP Laravel Cheat Sheet (référence conseillée par plusieurs articles)
