# Déploiement Rene Football — Hostinger Shared (plan Single) + GitHub Actions

Procédure spécifique à l'hébergement actuel : plan **Hostinger Single** sans
SSH, avec déploiement automatisé via **GitHub Actions** sur chaque push `main`.
Pour la procédure VPS/générique, voir [`DEPLOYMENT.md`](DEPLOYMENT.md).

**Date du setup** : 2026-10-20
**Domaine** : https://renefootball.com

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  GitHub (repo privé main branch)                         │
│  └─ push → workflow .github/workflows/deploy.yml         │
└──────────────────────────────────────────────────────────┘
            │
            │  1. Build React + Composer install
            │  2. Assemble staging/ layout
            │  3. FTPS upload
            ▼
┌──────────────────────────────────────────────────────────┐
│  Hostinger Shared (plan Single)                          │
│  /home/u439221818/                                       │
│  ├── backend/        ← Laravel app (hors webroot)        │
│  │   ├── vendor/                                         │
│  │   ├── storage/                                        │
│  │   └── .env       (créé depuis GitHub Secrets)         │
│  └── public_html/    ← webroot Apache                    │
│      ├── index.php  (bootstrap vers ../backend/)         │
│      ├── .htaccess  (routing API vs SPA)                 │
│      ├── index.html (React SPA)                          │
│      ├── assets/    (React build)                        │
│      └── storage/   (symlink vers backend/storage/app/public) │
└──────────────────────────────────────────────────────────┘
            │
            │  4. GH Actions pingue /api/_maintenance/bootstrap
            ▼
┌──────────────────────────────────────────────────────────┐
│  Laravel : migrations + symlink + (optionnel) admin seed │
└──────────────────────────────────────────────────────────┘
```

---

## ✅ Setup initial (à faire UNE SEULE FOIS)

### 1. GitHub Secrets

Dans ton repo GitHub → **Settings → Secrets and variables → Actions →
New repository secret**. Ajoute ces 13 secrets :

| Nom | Valeur | Comment l'obtenir |
|-----|--------|-------------------|
| `FTP_HOST` | `185.224.138.191` | hPanel → Files → FTP Accounts |
| `FTP_USERNAME` | `u439221818` | idem |
| `FTP_PASSWORD` | *(celui défini via "Change FTP password")* | idem |
| `DB_HOST` | `localhost` | Standard Hostinger shared |
| `DB_DATABASE` | `u439221818_renefb` | hPanel → Databases → MySQL |
| `DB_USERNAME` | `u439221818_renefb` | idem |
| `DB_PASSWORD` | *(celui défini à la création)* | idem |
| `MAIL_HOST` | `smtp.hostinger.com` | hPanel → Emails → Set up apps |
| `MAIL_PORT` | `465` | idem (SSL) |
| `MAIL_USERNAME` | `contact@renefootball.com` | idem |
| `MAIL_PASSWORD` | *(celui défini à la création de la boîte)* | idem |
| `APP_KEY` | *(voir ci-dessous)* | Génère-le une seule fois |
| `MAINT_SECRET` | *(voir ci-dessous)* | Génère-le une seule fois |

#### Générer `APP_KEY`

Depuis ta machine locale, dans `backend/` :
```bash
php artisan key:generate --show
# → copie la sortie, qui ressemble à : base64:xxxxxxxxxxxxxxxxxxxx=
```

#### Générer `MAINT_SECRET`

Depuis n'importe quel terminal :
```bash
openssl rand -hex 32
# → copie la chaîne hex 64 chars
```

Ou en Node :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Hostinger — document root

Par défaut Hostinger pointe `renefootball.com` sur `/public_html/`. C'est ce
qu'on veut. Rien à faire ici.

### 3. Hostinger — Cron Job pour la purge RGPD

hPanel → **Advanced → Cron Jobs** → **Create**

- **Command type** : Custom
- **Command** :
  ```bash
  curl -s -X POST https://renefootball.com/api/_maintenance/cron/purge \
    -H "X-Maint-Secret: <COLLE_ICI_LA_MEME_VALEUR_QUE_MAINT_SECRET>" > /dev/null 2>&1
  ```
- **Minute** : `15`
- **Hour** : `3`
- **Day / Month / Weekday** : `*`

→ Tourne tous les jours à 03h15 UTC, supprime les demandes de contact + CVs
> 12 mois (sauf celles archivées).

### 4. Hostinger — SSL

Normalement déjà actif (vu ✓ SSL sur ton dashboard). Si pas le cas :
hPanel → Security → SSL → Install (Let's Encrypt gratuit).

---

## 🚀 Déploiement

Trois façons de déclencher un deploy :

### A. Automatique — push sur `main`

```bash
git push origin main
```

GH Actions se déclenche, build + deploy + bootstrap en ~3-5 min. Suis le
progrès dans **Actions** tab du repo.

### B. Manuel — workflow_dispatch

Dans l'onglet **Actions** du repo → `Deploy to Hostinger` → **Run workflow**
→ sélectionne `main` → **Run**.

Utile pour redéployer sans changer de code (si tu as juste modifié un
GitHub Secret par exemple).

### C. Local → tester avant de push

```bash
cd backend && composer install --no-dev --optimize-autoloader
cd ../frontend && npm ci && npm run build
# Vérifie que les builds sont verts avant de pusher.
```

---

## 🔧 Opérations post-déploiement

### Créer / mettre à jour l'admin

Depuis n'importe quel terminal (ou Postman) :

```bash
curl -X POST https://renefootball.com/api/_maintenance/bootstrap \
  -H "X-Maint-Secret: <MAINT_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "admin_email": "rene@renefootball.com",
    "admin_name": "René",
    "admin_password": "<UN_MDP_FORT_16+_CHARS>"
  }'
```

Idempotent : si l'admin existe déjà, l'appel renvoie `"action": "exists"`
sans écraser le mot de passe.

Pour changer le mot de passe : connexion admin + modif dans l'UI
(fonctionnalité à ajouter si demandée). En urgence, re-run bootstrap avec
un nouveau password + ouvrir phpMyAdmin et UPDATE la ligne `users`.

### Lancer la purge RGPD à la main

```bash
curl -X POST https://renefootball.com/api/_maintenance/cron/purge \
  -H "X-Maint-Secret: <MAINT_SECRET>"
```

### Health check

```bash
curl https://renefootball.com/api/_maintenance/health
# → { "ok": true, "info": { "app_env": "production", "debug": false, "db": "ok" } }
```

Pas de secret requis sur `/health` → à mettre dans un uptime monitor
(UptimeRobot / BetterUptime, free tier).

### Voir les logs Laravel

Par FTP ou File Manager Hostinger :
`/home/u439221818/backend/storage/logs/laravel.log`

### Phpmyadmin (base de données)

hPanel → **Databases → phpMyAdmin → Enter**. Utile pour :
- Vérifier qu'une migration a bien tourné
- Explorer les demandes de contact brutes
- Faire un backup manuel (Export → SQL)

---

## 🧯 Rollback

Pas de rollback automatique via GitHub Actions pour l'instant (option à
ajouter si besoin). Pour revenir à une version précédente :

1. `git log` pour trouver le SHA cible
2. `git revert <SHA>` ou `git reset --hard <SHA>` + `git push --force` *(⚠️
   écrase l'historique, à discuter avant)*
3. Le push déclenche un nouveau deploy automatique

Pour une BDD cassée après une migration foireuse :
- `php artisan migrate:rollback --step=1` → **mais** on n'a pas SSH, donc
  il faut ajouter une route maintenance ad-hoc OU faire l'opération via
  phpMyAdmin manuellement (export → modif → re-import)

---

## 📊 Monitoring (post-ship, non bloquant)

- [ ] Uptime monitor sur `/api/_maintenance/health` (UptimeRobot 5 min free)
- [ ] GH Action hebdo qui dumpe la DB et l'uploade en artifact (rétention 90j)
      → à ajouter dans `.github/workflows/weekly-backup.yml` plus tard

---

## 🧠 Limites connues du plan Single

| Limite | Workaround appliqué |
|--------|---------------------|
| Pas de SSH | Routes HTTP `/_maintenance/*` protégées par shared secret |
| Pas de `schedule:run` natif | Hostinger Cron Jobs → POST sur `/cron/purge` |
| 1 seule base MySQL | OK pour nous — tout tient dans `u439221818_renefb` |
| 10 GB SSD | Largement OK — ~500 MB utilisés par l'app + médias (estimation) |
| 100 GB bande passante / mois | OK pour une agence single-tenant |
| Pas de backups quotidiens | Weekly inclus + GH Action backup à ajouter |

Si un de ces points devient bloquant → upgrade **Business** (~5 €/mois)
ou passage en **VPS KVM 2** (~7-8 €/mois) pour un vrai contrôle serveur.

---

## 🔗 Fichiers liés

- Workflow déploiement : [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
- Bootstrap `index.php` : [`.github/hostinger/index.php`](.github/hostinger/index.php)
- Apache `.htaccess` : [`.github/hostinger/.htaccess`](.github/hostinger/.htaccess)
- Backend controller : [`backend/app/Http/Controllers/Api/MaintenanceController.php`](backend/app/Http/Controllers/Api/MaintenanceController.php)
- Config du secret : [`backend/config/maintenance.php`](backend/config/maintenance.php)
- Infra générique : [`DEPLOYMENT.md`](DEPLOYMENT.md)
- Checklist pré-ship : [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md)
