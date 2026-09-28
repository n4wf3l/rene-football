# Rene Football — Déploiement production

Checklist à parcourir intégralement **avant** chaque mise en prod. Reprend
les vérifications qui n'ont pas d'équivalent automatisé côté tests.

## 0. Pré-flight (à froid)

- [ ] Suite de tests **backend** verte : `cd backend && php artisan test`
  - Attendu : `57 passed` (à date). Un test rouge = on ne push pas.
- [ ] **Frontend typecheck** vert : `cd frontend && npx tsc --noEmit`
- [ ] Aucun `console.log` / `dd()` / `dump()` oublié :
  ```powershell
  Select-String -Pattern "console\.log|dd\(|dump\(" -Path backend/app/**/*.php,frontend/src/**/*.tsx -SimpleMatch
  ```
- [ ] `git status` clean sur `main`, dernier commit taggué au besoin.

## 1. Backend Laravel — variables d'environnement

Créer / mettre à jour `.env` sur le serveur. Valeurs critiques :

| Clé | Valeur prod | Notes |
|-----|-------------|-------|
| `APP_ENV` | `production` | jamais `local` en prod |
| `APP_DEBUG` | `false` | **impératif** — sinon stack traces exposées |
| `APP_URL` | `https://renefootball.com` | HTTPS, sans slash final |
| `APP_KEY` | (généré) | `php artisan key:generate` si absent |
| `LOG_LEVEL` | `warning` | `debug` pollue les logs |
| `DB_CONNECTION` | `mysql` (ou `pgsql`) | pas SQLite en prod |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | à setter | Mot de passe fort |
| `SESSION_DRIVER` | `database` ou `redis` | pas `file` derrière un load balancer |
| `CACHE_STORE` | `database` ou `redis` | idem |
| `QUEUE_CONNECTION` | `database` ou `redis` | si des jobs sont poussés plus tard |
| `MAIL_MAILER` | `smtp` | pas `log` / `array` en prod |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USERNAME` / `MAIL_PASSWORD` | à setter | Provider SMTP (Postmark / Resend / SES) |
| `MAIL_FROM_ADDRESS` | `noreply@renefootball.com` | domaine vérifié SPF/DKIM |
| `MAIL_FROM_NAME` | `Rene Football` | |
| `CONTACT_RECIPIENT` | `contact@renefootball.com` | destinataire des notifications de demande |
| `SANCTUM_STATEFUL_DOMAINS` | `renefootball.com,www.renefootball.com` | pas d'espaces |
| `SESSION_DOMAIN` | `.renefootball.com` | avec le point initial |
| `FILESYSTEM_DISK` | `public` | ou `s3` si stockage distant |

Vérifier : `php artisan config:show app.env` doit répondre `production`.

## 2. Migrations & seeds

- [ ] Sauvegarde de la BDD prod **avant** toute migration :
  ```bash
  mysqldump -u <user> -p <db> > backup-$(date +%F).sql
  ```
- [ ] Lancer les migrations :
  ```bash
  php artisan migrate --force
  ```
- [ ] **Seed de l'utilisateur admin** (si première install ou reset compte) :
  ```bash
  php artisan tinker
  >>> App\Models\User::create([
  ...   'name' => 'Admin',
  ...   'email' => 'admin@renefootball.com',
  ...   'password' => Hash::make('MOT_DE_PASSE_FORT'),
  ...   'is_admin' => true,
  ...   'email_verified_at' => now(),
  ... ]);
  ```
  Puis changer le mot de passe côté admin dès la première connexion.
- [ ] `php artisan storage:link` — pour que `/storage/*` serve les uploads (photos joueurs, CV, logos partenaires).

## 3. Cache & optimisation

À lancer sur chaque déploiement :

```bash
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

Attention : `config:cache` fige les variables `.env`. Toute modif du `.env`
nécessite de rejouer `php artisan config:clear && php artisan config:cache`.

## 4. Sécurité serveur

- [ ] **HTTPS forcé** — redirection 301 depuis HTTP côté nginx/Apache.
- [ ] `storage/`, `bootstrap/cache/`, `public/storage/` **writable** par l'utilisateur PHP-FPM (`chown -R www-data:www-data`).
- [ ] Le répertoire `.env` **n'est pas** exposé (nginx : ajouter un bloc `location ~ /\.` qui deny all).
- [ ] Headers de sécurité (nginx) :
  ```nginx
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  ```
- [ ] `CORS` — si le frontend est sur un domaine différent, mettre à jour `config/cors.php` (`allowed_origins`) et `SANCTUM_STATEFUL_DOMAINS`.
- [ ] Rate limiting : la route `/api/contact` est déjà en `throttle:5,1`. Vérifier qu'aucune autre route publique sensible n'est en accès libre illimité.

## 5. Frontend React — architecture single-domain

**Le code frontend suppose une architecture single-domain** : `renefootball.com`
sert **à la fois** le SPA React et l'API Laravel. Le client HTTP fait
`fetch('/api/...')` en chemins relatifs, il n'y a **pas** de `VITE_API_URL`.

Nginx doit router :
- `/api/*` → PHP-FPM (Laravel `public/index.php`)
- `/storage/*` → PHP-FPM (Laravel storage symlink)
- Tout le reste → `frontend/dist/index.html` (SPA fallback)

Si tu veux un jour split `api.renefootball.com` / `renefootball.com`, il
faudra ajouter `VITE_API_URL` + refactor `frontend/src/api/client.ts` +
setter CORS/Sanctum stateful domains — mais ce n'est pas le modèle actuel.

### 5.1 `.env.production` (frontend)

Copier `frontend/.env.example` → `frontend/.env.production` et setter :
```
VITE_PUBLIC_URL=https://renefootball.com
```

Cette variable pilote les canonical URLs et og:image des pages hydratées
(cf `frontend/src/lib/publicUrl.ts`). Aucune API URL n'est nécessaire
(chemins relatifs).

### 5.2 Build

```bash
cd frontend
npm ci
npm run build
```
Le build lit `.env.production` (Vite convention) et produit `dist/`.

### 5.3 Servir `dist/`

- Copier `dist/` dans le webroot (ex : `/var/www/renefootball/frontend`)
- Vérifier que `dist/sitemap.xml`, `dist/robots.txt` et `dist/logo-black.png` sont bien présents (copiés depuis `public/`)
- **Si tu changes le domaine cible** : les URLs dans `frontend/index.html` (canonical, og:url, JSON-LD) et `frontend/public/sitemap.xml` sont écrites en dur. Faire un find-and-replace `renefootball.com` avant le build, ou éditer directement puis committer.

### 5.4 Exemple nginx (single-domain)

```nginx
server {
    listen 443 ssl http2;
    server_name renefootball.com www.renefootball.com;

    ssl_certificate     /etc/letsencrypt/live/renefootball.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/renefootball.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers (cf § 4)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; style-src 'self' fonts.googleapis.com 'unsafe-inline'; font-src fonts.gstatic.com; img-src 'self' data: flagcdn.com; frame-src www.youtube-nocookie.com; base-uri 'self'; frame-ancestors 'self'" always;

    # Bloquer les fichiers sensibles
    location ~ /\.(env|git) { deny all; return 404; }
    location ~ /composer\.(json|lock)$ { deny all; return 404; }

    # 1) API Laravel — tout ce qui commence par /api/
    location ^~ /api/ {
        root /var/www/renefootball/backend/public;
        try_files $uri /index.php?$query_string;
    }

    # 2) Storage Laravel (uploads : photos joueurs, CV, logos partenaires)
    location ^~ /storage/ {
        root /var/www/renefootball/backend/public;
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 3) Endpoints internes Laravel (health, sitemap, robots — servis par web.php)
    location = /up { root /var/www/renefootball/backend/public; try_files $uri /index.php?$query_string; }

    # 4) PHP-FPM handler pour toutes les routes Laravel ci-dessus
    location ~ \.php$ {
        root /var/www/renefootball/backend/public;
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_hide_header X-Powered-By;
    }

    # 5) SPA React — tout le reste → index.html
    root /var/www/renefootball/frontend;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name renefootball.com www.renefootball.com;
    return 301 https://$host$request_uri;
}
```

### 5.5 Vérifs post-build

- [ ] `curl -sI https://renefootball.com/api/players | grep 200` → renvoie 200
- [ ] `curl -sI https://renefootball.com/storage/players/xxx.jpg` → renvoie 200 (après création d'un joueur avec photo)
- [ ] `curl https://renefootball.com/` → HTML du SPA
- [ ] Tester en incognito HTTPS que **toutes les langues** basculent proprement (FR/EN/DE/NL/LB).

## 6. Pages légales

- [ ] Remplacer les `À compléter` dans `frontend/src/pages/legal/MentionsLegales.tsx` :
  - Forme juridique
  - Numéro RCS Luxembourg
  - Numéro TVA intracommunautaire
  - Nom + adresse de l'hébergeur
- [ ] Vérifier que le compte admin de démo (`admin@rene-football.test` / `admin1234`) **n'existe pas** en prod.

## 7. Tests fonctionnels manuels (à faire en HTTPS)

Parcourir chaque parcours dans un navigateur incognito, avec l'onglet Network ouvert :

**Public**
- [ ] Home → change de langue via le switcher, confirme que rien ne reste en français hors legal
- [ ] `/joueurs` → filtres, ouverture d'une fiche joueur, boutons "Fiche PDF" et "Retour au roster"
- [ ] `/actualites` → catégories, ouverture d'un article, galerie lightbox
- [ ] `/a-propos` → staff, section partenaires
- [ ] `/contact` → parcours complet joueur (avec CV upload), club, media, autre
- [ ] `/contact` → vérifier réception du mail sur `CONTACT_RECIPIENT`
- [ ] `/contact` → tester le rate limit (5 envois puis 429)
- [ ] `/mentions-legales`, `/confidentialite`, `/cookies` → bannière ambre + résumé s'affichent dans les autres langues
- [ ] Bannière cookies → click "Compris", vérifie que le localStorage `rf_cookie_notice_ack` est écrit
- [ ] Une URL inexistante → NotFoundPage traduit

**Admin**
- [ ] `/admin/login` → connexion, redirection dashboard
- [ ] Créer/éditer/supprimer un joueur → toast s'affiche en bas à droite, modal confirm au delete
- [ ] Uploader une photo de joueur → visible sur la fiche publique
- [ ] Créer/publier/dépublier un article
- [ ] Créer un partenaire avec logo
- [ ] Modifier les réseaux sociaux → footer public se met à jour après rechargement
- [ ] Générer une présentation joueur → lien de partage `/p/:token` fonctionne
- [ ] Traiter une demande de contact reçue (changer statut, supprimer)

## 8. Sauvegardes & monitoring

- [ ] Sauvegarde automatique de la BDD (cron `mysqldump` + rotation 7 jours)
- [ ] Sauvegarde du répertoire `backend/storage/app/public/` (photos, CV, logos)
- [ ] Log rotation Laravel : `LOG_DAILY_MAX_FILES=14` dans `.env`
- [ ] Monitoring uptime (Uptime Kuma / BetterUptime / Pingdom) sur `https://renefootball.com/up` (endpoint Laravel healthcheck déjà configuré)
- [ ] Alerte email si `/up` répond ≠ 200 pendant > 2 min

## 9. Post-déploiement

- [ ] `curl -I https://renefootball.com` → 200 OK, HSTS présent
- [ ] `curl https://renefootball.com/sitemap.xml` → XML valide
- [ ] `curl https://renefootball.com/robots.txt` → contenu attendu
- [ ] Soumettre `sitemap.xml` à Google Search Console
- [ ] Vérifier Lighthouse (Performance / SEO / Accessibility ≥ 90)

## 10. Rollback si nécessaire

```bash
# Sur le serveur, revenir au commit précédent
git checkout <previous-sha>
composer install --no-dev --optimize-autoloader
php artisan config:cache route:cache
# Si migration nouvelle a été jouée et qu'elle bloque :
php artisan migrate:rollback --step=1
# Restaurer la BDD depuis backup si dommage :
mysql -u <user> -p <db> < backup-YYYY-MM-DD.sql
```

Retrigger le build frontend, rejouer les caches. Poster incident sur le
canal ops.
