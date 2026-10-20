# Rene Football — Déploiement production

Le site est en prod sur **https://renefootball.com** via **Hostinger Shared
(plan Single)** + **GitHub Actions**. Ce document explique :

1. L'architecture choisie et pourquoi
2. Le pipeline CI/CD actuel
3. Les 7 bugs rencontrés pendant le setup initial et comment on les a réglés
4. La checklist opérationnelle pour les futures mises en prod

Pour la **procédure détaillée** (secrets GitHub, cron Hostinger, commandes
post-deploy), voir [`HOSTINGER-DEPLOY.md`](HOSTINGER-DEPLOY.md).

---

## 1. Architecture retenue

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub (repo privé)                                        │
│  └─ push origin main → .github/workflows/deploy.yml         │
└─────────────────────────────────────────────────────────────┘
            │
            │  Build + composer install + zip
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│  Ubuntu runner (GH Actions)                                 │
│  ├─ Setup PHP 8.2 + Composer                                │
│  ├─ Setup Node 20                                           │
│  ├─ Build frontend (vite build → frontend/dist/)            │
│  ├─ Composer install --no-dev --optimize-autoloader         │
│  ├─ Zip backend/ en backend.zip (~14 MB)                    │
│  ├─ Génère _extract.php avec MAINT_SECRET injecté           │
│  └─ Upload FTPS vers Hostinger                              │
└─────────────────────────────────────────────────────────────┘
            │
            │  FTPS upload (~2 min)
            │  backend.zip + public_html/ → /domains/renefootball.com/
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│  Hostinger Shared (plan Single, pas de SSH)                 │
│  /home/u439221818/domains/renefootball.com/                 │
│  ├── backend/              ← dézippé par _extract.php       │
│  │   ├── vendor/                                            │
│  │   ├── storage/                                           │
│  │   └── .env             (secrets injectés au build)       │
│  └── public_html/          ← webroot Apache                 │
│      ├── index.php         (boot Laravel depuis ../backend) │
│      ├── .htaccess         (routing API ↔ SPA)              │
│      ├── _extract.php      (one-shot, auto-supprime zip)    │
│      ├── index.html        (React SPA)                      │
│      └── assets/           (React build)                    │
└─────────────────────────────────────────────────────────────┘
            │
            │  Auto-call /_extract.php → /api/_maintenance/bootstrap
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│  Laravel bootstrap                                          │
│  ├─ php artisan migrate --force (idempotent)                │
│  ├─ storage symlink (idempotent)                            │
│  └─ Create admin si credentials fournis (idempotent)        │
└─────────────────────────────────────────────────────────────┘
```

### Pourquoi Hostinger Shared + GitHub Actions (et pas un VPS classique)

L'agence est sur le plan **Single** (shared hosting, ~3€/mois). Pas de VPS,
pas de SSH, pas de systemd. Mais le plan a :

- ✓ PHP 8.3 configurable
- ✓ MySQL
- ✓ Mail SMTP natif
- ✓ Cron Jobs natifs via hPanel
- ✓ SSL Let's Encrypt auto-renouvelé
- ✗ Pas de SSH
- ✗ Pas de Composer sur serveur
- ✗ Pas de Node.js sur serveur

**Conséquence** : impossible de `git pull && composer install && php artisan
migrate` à la mode VPS. Il faut faire le build en amont (GitHub Actions) et
pousser le résultat déjà prêt.

L'alternative aurait été d'upgrader à un plan Premium ou Business (~5€/mois)
pour avoir SSH. L'agence n'a pas voulu payer plus → on s'adapte.

---

## 2. Le pipeline en 7 étapes

Déclencheur : `git push origin main` (ou `workflow_dispatch` manuel).

### 2.1 Build
```yaml
- Setup PHP 8.2 + Node 20
- cd backend && composer install --no-dev --optimize-autoloader
- cd frontend && npm ci && npm run build
```

### 2.2 Assemble le staging
- Copie `backend/` dans `staging/backend/` (hors tests, hors .env)
- Copie `frontend/dist/*` dans `staging/public_html/`
- Copie `.github/hostinger/index.php` et `.htaccess` dans `staging/public_html/`
- Écrit `.env` prod dans `staging/backend/.env` depuis les GitHub Secrets

### 2.3 Zippe le backend
```bash
cd staging && zip -rq backend.zip backend/ && rm -rf backend/
```
→ Un seul fichier `backend.zip` (~14 MB au lieu de 5000+ fichiers individuels).

### 2.4 Génère `_extract.php` avec MAINT_SECRET injecté
```bash
sed "s/__MAINT_SECRET__/${MAINT_SECRET}/g" \
  .github/hostinger/_extract.php.template > staging/public_html/_extract.php
```
Garde-fou : si `__MAINT_SECRET__` reste dans le fichier après sed, la
pipeline fail (`grep -q '__MAINT_SECRET__' && exit 1`).

### 2.5 Upload FTPS
```yaml
- uses: SamKirkland/FTP-Deploy-Action@v4.3.5
  with:
    local-dir: ./staging/
    server-dir: /domains/renefootball.com/
    protocol: ftps
    port: 21
```
~2 min pour le backend.zip + une cinquantaine de fichiers public_html.

### 2.6 Extraction côté serveur
`curl POST https://renefootball.com/_extract.php` avec header `X-Maint-Secret`.
Le script PHP standalone (pas besoin de Laravel booté) :
- Vérifie le secret
- Ouvre `../backend.zip` via ZipArchive
- Dézippe dans `../backend/`
- Supprime `backend.zip`

### 2.7 Bootstrap Laravel
`curl POST https://renefootball.com/api/_maintenance/bootstrap` →
- `php artisan migrate --force`
- `symlink(storage/app/public, public/storage)`
- Création admin si credentials fournis (idempotent — skip si existe)
- `config:clear` + `route:clear` + `view:clear`

**Durée totale** : ~5 min pour un deploy incrémental, ~7 min pour le 1er
(incluant l'upload complet du vendor).

---

## 3. Les 7 bugs rencontrés (et comment on les a réglés)

Pour quiconque reprend le projet et doit déboguer un deploy similaire, voici
les écueils réels qu'on a rencontrés dans l'ordre chronologique.

### Bug #1 — Timeout lftp (30 min)
**Symptôme** : la pipeline tourne 30 min et timeout pendant l'upload des
fichiers Laravel vendor/ via `lftp` en FTPS.

**Cause** : lftp négocie TLS pour chaque fichier individuellement. Avec
5000+ fichiers dans vendor/ et ~0.1-0.3 s de handshake TLS chacun, on dépasse
largement le timeout de 15 min du runner.

**Fix** : switch vers `SamKirkland/FTP-Deploy-Action@v4.3.5` qui utilise
basic-ftp (Node) et réutilise la connexion TLS entre fichiers.

### Bug #2 — Timeout FTP-Deploy aussi (29 min)
**Symptôme** : même action, timeout sur `vendor/phpoffice/phpspreadsheet/`
après avoir "creating folder" pendant 29 minutes.

**Cause** : PhpSpreadsheet seul a ~800 dossiers imbriqués. Chaque création
de dossier = 1 commande FTP sérialisée. ~800 × 1s = 13 min pour PhpSpreadsheet
seul, et il reste tout le reste de vendor/ derrière.

**Fix** : pivot complet vers une stratégie **zip + extract** :
- Zippe `backend/` en local (via `zip -rq`), upload le zip, dézippe sur le
  serveur avec un script PHP standalone (`_extract.php`)
- Résultat : 1 upload de 14 MB en 2 min au lieu de 5000+ uploads en 30+ min

### Bug #3 — Mauvais chemin FTP (upload dans le mauvais `public_html`)
**Symptôme** : workflow passe au vert, mais `https://renefootball.com` affiche
toujours la page par défaut "Vous êtes prêt à partir!" Hostinger.

**Cause** : Hostinger a DEUX dossiers `public_html` :
- `/home/u439221818/public_html/` (legacy, non servi par le web)
- `/home/u439221818/domains/renefootball.com/public_html/` (le VRAI webroot)

Notre upload FTPS avec `server-dir: /` landait dans le legacy, pas dans le
webroot réel.

**Fix** : changer `server-dir: /` en `server-dir: /domains/renefootball.com/`
dans la step `SamKirkland/FTP-Deploy-Action`.

### Bug #4 — Sed trailing newline cassait le MAINT_SECRET
**Symptôme** : `_extract.php` retournait systématiquement "Forbidden" même
avec le bon token.

**Cause** : la step de génération faisait
```bash
ESCAPED=$(printf '%s\n' "${MAINT_SECRET}" | sed -e 's/[\/&]/\\&/g')
```
Le `printf '%s\n'` **ajoutait un retour à la ligne final** au secret. Donc le
fichier généré contenait littéralement :
```php
$expected = '1856536f...638f2998
';
```
Et `hash_equals('secret\n', 'secret')` → false → Forbidden.

**Fix** : supprimer le `printf`, substituer directement :
```bash
sed "s/__MAINT_SECRET__/${MAINT_SECRET}/g" template > output
```
MAINT_SECRET est pur hex (généré via `openssl rand -hex 32`), aucun caractère
spécial à escaper pour sed.

### Bug #5 — Le sed substitue le placeholder dans la condition de check aussi
**Symptôme** : même après avoir fixé le trailing newline (#4), toujours
"Forbidden" systématique.

**Cause** : mon template avait un garde-fou :
```php
$expected = trim('__MAINT_SECRET__');
if ($expected === '' || $expected === '__MAINT_SECRET__' || !hash_equals(...)) {
    // Forbidden
}
```
L'intention : refuser si le placeholder n'a jamais été substitué (deploy
accidentel du template brut). Mais `sed` remplace **toutes** les occurrences
du placeholder, y compris celle dans la condition de check. Après génération :
```php
$expected = trim('REAL_SECRET');
if ($expected === '' || $expected === 'REAL_SECRET' || !hash_equals(...)) {
    // Forbidden car $expected === 'REAL_SECRET' est toujours TRUE
}
```

**Fix** : retirer cette check. Le safety-net contre le placeholder non
substitué est déjà côté workflow (`grep -q '__MAINT_SECRET__' && exit 1`).

### Bug #6 — DirectoryIndex absent → 404 sur la racine
**Symptôme** : `/api/_maintenance/health` fonctionne (Laravel boote), mais
`https://renefootball.com/` retourne 404.

**Cause** : sans directive `DirectoryIndex` explicite dans `.htaccess`, Apache
sur Hostinger tombait sur `index.php` au lieu de `index.html`. Du coup
Laravel était appelé avec le path `/`. Et notre `backend/routes/web.php` fait
un `abort(404)` explicite sur `/` en prod (pour éviter de leak les URL d'API
aux crawlers qui tomberaient sur le backend).

**Fix** : ajouter `DirectoryIndex index.html index.php` en haut du
`.htaccess`. Apache sert maintenant la SPA React en priorité, Laravel ne
reçoit QUE les routes `/api/*`, `/storage/*`, `/up`, `/sitemap.xml`,
`/robots.txt` comme prévu.

### Bug #7 — `symlink()` dans le mauvais namespace PHP
**Symptôme** : bootstrap réussit la migration, crée l'admin, mais échoue sur
la création du symlink :
```
"storage_link": {
  "ok": false,
  "error": "Call to undefined function App\\Http\\Controllers\\Api\\symlink()"
}
```

**Cause** : PHP cherche une fonction non-qualifiée **d'abord dans le
namespace courant**, puis fallback sur le global. Dans un contrôleur
namespacé `App\Http\Controllers\Api\`, un appel `symlink()` est cherché à
`App\Http\Controllers\Api\symlink()` et crashe parce qu'il n'existe pas là.

**Fix** : préfixer par `\` pour forcer le namespace global :
```php
@\symlink($target, $link);
```

### Bugs non-anticipés qui NE sont pas arrivés mais à savoir

- Hostinger n'a pas throttle le FTPS pour nous (contrairement à certains
  témoignages Reddit). Si ça arrivait, option de fallback : réduire le
  parallélisme ou splitter en plusieurs sessions.
- La taille du zip (14 MB) est largement sous les limites PHP d'upload /
  memory. Si vendor/ gonfle (gros packages), monitorer `upload_max_filesize`
  dans hPanel.
- Le PHP de Hostinger a bien `ZipArchive` activé. Sur certaines configs
  minimalistes, il faudrait fallback sur `PharData` (tarball).

---

## 4. Checklist opérationnelle pour les prochaines mises en prod

### Pre-flight (à faire sur ta machine)

- [ ] `cd backend && php artisan test` → tout vert
- [ ] `cd frontend && npx tsc --noEmit` → zero error
- [ ] `git status` clean sur `main`
- [ ] Pas de `console.log` / `dd()` / `dump()` oublié :
  ```powershell
  Select-String -Pattern "console\.log|dd\(|dump\(" -Path backend/app/**/*.php,frontend/src/**/*.tsx -SimpleMatch
  ```

### Deploy

```bash
git push origin main
```

C'est tout. Le workflow fait le reste en ~5 min.

### Vérifs post-deploy

```bash
# 1. Le site charge
curl -I https://renefootball.com
# → HTTP/2 200

# 2. L'API Laravel boote
curl https://renefootball.com/api/_maintenance/health
# → {"ok":true,"info":{"app_env":"production","db":"ok"}}

# 3. Le sitemap est servi (généré dynamiquement par Laravel)
curl -I https://renefootball.com/sitemap.xml
# → HTTP/2 200, Content-Type: application/xml

# 4. L'admin login est accessible
curl -I https://renefootball.com/admin/login
# → HTTP/2 200 (sert index.html via SPA fallback)
```

### Opérations manuelles ponctuelles

Reset mot de passe admin (si perdu) :
```powershell
$body = @{
  admin_email = "ton@email.com"
  admin_name = "Rene"
  admin_password = "NouveauMotDePasseFort16+"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "https://renefootball.com/api/_maintenance/bootstrap" `
  -Headers @{"X-Maint-Secret"="<MAINT_SECRET>"} `
  -ContentType "application/json" `
  -Body $body
```
Note : `action: "exists"` dans la réponse → l'admin existe déjà, le password
n'a pas été changé. Pour vraiment le changer, soit via l'UI admin, soit via
phpMyAdmin (`UPDATE users SET password = ... WHERE id = 1`).

Lancer la purge RGPD à la main :
```bash
curl -X POST https://renefootball.com/api/_maintenance/cron/purge \
  -H "X-Maint-Secret: <MAINT_SECRET>"
```

Voir les logs Laravel : via File Manager Hostinger →
`/domains/renefootball.com/backend/storage/logs/laravel.log`

### Rollback

Pas de rollback automatique pour l'instant. Pour revenir à une version
précédente :

```bash
git log --oneline -20            # trouver le SHA cible
git revert <SHA_du_commit_fautif>
git push origin main             # auto-deploy du revert en 5 min
```

Si une migration a cassé la DB : phpMyAdmin pour corriger manuellement, puis
`php artisan migrate:rollback --step=1` via une route maintenance ad-hoc à
ajouter (pas encore implémentée).

---

## 5. Variables d'env production (pour mémoire)

Toutes injectées depuis les GitHub Secrets dans le `.env` au moment du build.
Jamais commitées dans le repo.

| Clé | Valeur |
|-----|--------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` (hard-fail si `true` via `AppServiceProvider::assertSafeProductionConfig`) |
| `APP_URL` | `https://renefootball.com` |
| `APP_KEY` | généré via `php artisan key:generate --show` une seule fois |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` | `localhost` (Hostinger shared, pas de remote MySQL exposé) |
| `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | créés via hPanel Databases |
| `MAIL_MAILER` | `smtp` |
| `MAIL_HOST` | `smtp.hostinger.com` |
| `MAIL_PORT` | `465` (SSL) |
| `MAIL_USERNAME` | `contact@renefootball.com` |
| `MAIL_PASSWORD` | créé via hPanel Emails |
| `MAIL_ENCRYPTION` | `ssl` |
| `MAINT_SECRET` | généré via `openssl rand -hex 32`, utilisé pour `/_maintenance/*` et `/_extract.php` |
| `SESSION_SECURE_COOKIE` | `true` |
| `SESSION_DOMAIN` | `.renefootball.com` |
| `FILESYSTEM_DISK` | `local` (CVs privés, servis via URL signée) |
| `SENTRY_LARAVEL_DSN` | DSN Sentry côté backend. Vide = Sentry inactif. |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` (10 % des requêtes tracées). Monter en cas de debug. |
| `SENTRY_SEND_DEFAULT_PII` | `false` (RGPD : jamais d'IP/UA/cookies auto). |
| `SENTRY_RELEASE` | auto-rempli au build (= `github.sha`). |

Côté frontend, 2 secrets supplémentaires à ajouter dans GitHub (Settings →
Secrets and variables → Actions) :
- `VITE_SENTRY_DSN` : DSN Sentry du projet React. Visible dans le JS public,
  pas un secret dur, mais tenu dans GH Secrets pour pouvoir le changer sans
  redéployer manuellement.
- (pas de secret pour la version — le workflow injecte `github.sha` dans
  `VITE_APP_VERSION`.)

---

## 6. Activer Sentry (observabilité)

Sentry est **câblé mais inactif** par défaut. Pour l'allumer :

1. Créer un compte sur https://sentry.io (free tier suffit : 5k events/mois).
2. Créer **deux projets** dans la même organisation :
   - Un projet **Laravel** → récupérer son DSN
   - Un projet **React** → récupérer son DSN
3. Dans GitHub → Settings → Secrets → Actions, ajouter :
   - `SENTRY_LARAVEL_DSN` = DSN du projet Laravel
   - `VITE_SENTRY_DSN` = DSN du projet React
4. `git push origin main` sur n'importe quelle branche mergée → le prochain
   deploy injecte les deux DSN. Sentry commence à collecter immédiatement.
5. Côté backend, le DSN se retrouve dans le `.env` prod via la step
   "Assemble staging dir" du workflow. Côté frontend, il est baked dans le
   bundle JS au moment du `vite build`.
6. Pour tester : déclencher une exception manuelle depuis le code (`throw
   new RuntimeException('test')` dans un controller admin, ou
   `Sentry.captureMessage('test')` côté React). Elle doit apparaître dans le
   dashboard Sentry sous ~30 s.

Si Sentry est désactivé localement : rien à faire, `VITE_SENTRY_DSN` vide
est détecté par `frontend/src/sentry.ts` qui bypasse l'init.

### RGPD / privacy

- `SENTRY_SEND_DEFAULT_PII=false` → aucune IP / user-agent / cookie n'est
  envoyé automatiquement à Sentry.
- Côté React, `Sentry.replayIntegration({ maskAllText: true, blockAllMedia:
  true })` masque tout le texte visible et bloque les médias dans les session
  replays, pour éviter de leaker des données utilisateur (noms de joueurs,
  emails, etc.).
- Session replay désactivé sauf en cas d'erreur
  (`replaysOnErrorSampleRate: 1.0`) — pas d'enregistrement systématique.

---

## 7. Références

- Setup détaillé une-fois : [`HOSTINGER-DEPLOY.md`](HOSTINGER-DEPLOY.md)
- Checklist pré-prod business : [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md)
- Workflow GH Actions : [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
- Apache config : [`.github/hostinger/.htaccess`](.github/hostinger/.htaccess)
- Laravel bootstrap : [`.github/hostinger/index.php`](.github/hostinger/index.php)
- Script d'extraction : [`.github/hostinger/_extract.php.template`](.github/hostinger/_extract.php.template)
- Routes maintenance : [`backend/app/Http/Controllers/Api/MaintenanceController.php`](backend/app/Http/Controllers/Api/MaintenanceController.php)
</content>
