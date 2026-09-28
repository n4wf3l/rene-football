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

## 5. Frontend React

- [ ] Variables `.env.production` du frontend (Vite) :
  ```
  VITE_API_URL=https://api.renefootball.com
  ```
  (ou même domaine si le back sert `/api` derrière un reverse proxy)
- [ ] Build de prod :
  ```bash
  cd frontend
  npm ci
  npm run build
  ```
- [ ] Servir `frontend/dist/` — soit statiquement (nginx), soit via CDN.
- [ ] Vérifier que `frontend/public/sitemap.xml` et `frontend/public/robots.txt` sont bien copiés dans `dist/` et servis à la racine.
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
