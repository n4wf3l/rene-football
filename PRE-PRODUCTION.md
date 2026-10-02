# Rene Football — Checklist avant mise en production

Fichier vivant qui liste **tout ce qui reste à faire** avant de pouvoir
ouvrir le site au public. À parcourir intégralement le jour du ship.
Compagnon de [DEPLOYMENT.md](DEPLOYMENT.md) (procédure de déploiement)
— ici on gère uniquement les blocages business/légaux et les infos à
récupérer de René.

**Date de création** : 2026-09-30
**Dernière mise à jour** : 2026-09-30

---

## 🔴 BLOQUANTS — infos à récupérer de René

### 1. Identité juridique de l'agence (mentions légales)

Sans ces infos, le site enfreint la loi luxembourgeoise sur le commerce
électronique (amende jusqu'à 125 000 €). Les 4 champs sont actuellement
`À compléter avant mise en production` dans
[MentionsLegales.tsx](frontend/src/pages/legal/MentionsLegales.tsx).

- [ ] **Forme juridique** — SARL / SA / SARL-S / indépendant / autre
- [ ] **Numéro RCS Luxembourg** — format `B123456`
- [ ] **Numéro TVA intracommunautaire** — format `LU` + 8 chiffres
- [ ] **Siège social exact** — rue + numéro + code postal + commune

**Status** : René a dit qu'il ne peut pas encore envoyer ces infos (2026-09-30).

### 2. Mailbox + SMTP provider (Hostinger)

Actuellement le `.env` prod n'est pas rempli (`MAIL_HOST`, `MAIL_PORT`,
`MAIL_USERNAME`, `MAIL_PASSWORD` à setter — cf
[DEPLOYMENT.md §1](DEPLOYMENT.md)).

- [ ] **Créer la boîte `contact@renefootball.com`** chez Hostinger
  (hPanel → Emails → Comptes email)
- [ ] **Récupérer les creds SMTP** depuis « Connect apps and devices » :
  - `MAIL_HOST` = `smtp.hostinger.com`
  - `MAIL_PORT` = `465` (SSL) ou `587` (TLS)
  - `MAIL_USERNAME` = `contact@renefootball.com`
  - `MAIL_PASSWORD` = le mot de passe de la boîte
- [ ] **Vérifier la MX record** de `renefootball.com` → pointe bien chez Hostinger
- [ ] **Envoyer un email de test** vers `contact@renefootball.com` depuis
  l'extérieur pour confirmer la réception

**Status** : René a dit "ça doit encore attendre" (2026-09-30).

### 3. Autorisations parentales joueurs mineurs

Le code gère maintenant le gate parental sur le formulaire contact
(voir §6 « Déjà fait »). **Mais** il reste la question du contenu
existant du site (fiches joueurs publiées).

- [ ] **Audit des joueurs < 18 ans** actuellement affichés sur le site
- [ ] Pour chacun, **confirmer l'existence d'une autorisation parentale
  écrite** archivée chez l'agence
- [ ] Retirer de la fiche publique les joueurs mineurs sans autorisation

**Status** : René a dit que c'est "automatiquement OK via interne" (2026-09-30).
À vérifier concrètement avant ship — demander à René le lot d'autorisations
scannées, les archiver dans un dossier sécurisé côté agence (hors repo).

---

## 🟠 CONFIG DEPLOYMENT (à faire sur le serveur Hostinger)

### 4. Variables `.env` prod backend

Référence complète : [DEPLOYMENT.md §1](DEPLOYMENT.md).

Minima à setter sur le serveur avant le premier `php artisan serve` :

- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_URL=https://renefootball.com`
- [ ] `APP_KEY` — généré via `php artisan key:generate`
- [ ] `DB_*` — accès à la DB Hostinger (MariaDB probablement)
- [ ] `MAIL_*` — remplis au moment où §2 ci-dessus est résolu
- [ ] `CONTACT_RECIPIENT=contact@renefootball.com`
- [ ] `SESSION_DOMAIN=.renefootball.com`
- [ ] `SESSION_SECURE_COOKIE=true`

### 5. Compte admin de prod

Pas de seeder — création manuelle sécurisée.

- [ ] Sur le serveur après migrations :
  ```bash
  php artisan tinker
  >>> App\Models\User::create([
  ...   'name' => 'René',
  ...   'email' => '<EMAIL_ADMIN_DE_RENÉ>',
  ...   'password' => Hash::make('<MOT_DE_PASSE_FORT_16+_CHARS>'),
  ...   'is_admin' => true,
  ...   'email_verified_at' => now(),
  ... ]);
  ```
- [ ] Transmettre le mot de passe à René via canal sécurisé
  (jamais par email) — Bitwarden Send / Signal / 1Password share
- [ ] René change le mot de passe à sa première connexion

### 6. Cron de purge RGPD

La commande `submissions:purge` doit tourner tous les jours à 03:15
(gère la rétention 12 mois des demandes de contact).

- [ ] Ajouter au crontab Hostinger (hPanel → Advanced → Cron Jobs) :
  ```
  * * * * * cd /home/u<USER>/domains/renefootball.com/backend && php artisan schedule:run >> /dev/null 2>&1
  ```
- [ ] Vérifier au bout de 24h que `storage/logs/laravel.log` montre
  bien le `submissions:purge` qui tourne

### 7. Build frontend + nginx

Référence : [DEPLOYMENT.md §5](DEPLOYMENT.md).

- [ ] `cd frontend && npm ci && npm run build`
- [ ] Copier `frontend/dist/` dans le webroot Hostinger
- [ ] Configurer la routing nginx (API, storage, SPA fallback — cf §5.4)
- [ ] HTTPS forcé via Let's Encrypt (Hostinger propose auto-SSL)
- [ ] Headers de sécurité (CSP, HSTS, X-Frame-Options) — cf §4

---

## ✅ DÉJÀ FAIT (ne pas refaire)

Pour mémoire, les gros chantiers déjà bouclés et mergés sur `main` :

### Conformité RGPD / CNPD

- ✅ CV uploads → disque privé + URL signée 15 min (plus de `/storage/cvs/…`)
- ✅ Purge auto des demandes de contact + CV à 12 mois
  (command `submissions:purge` + schedule daily 03:15)
- ✅ Mail notif agency : plus de chemin `/storage/` exposé
- ✅ Pages légales : Hostinger déclaré comme sous-traitant art. 28 RGPD
- ✅ N° téléphone CNPD corrigé : `+352 26 10 60 -1`
- ✅ `DemoAccountsSeeder` durci : allow-list stricte `['local', 'testing']`

### UX / UI mobile 2026

- ✅ iOS auto-zoom killer sur inputs (`text-base sm:text-sm`)
- ✅ Touch targets WCAG 44×44 sur mobile (burger, ThemeToggle, pills, close cookie)
- ✅ Safe-area iOS sur bandeau cookies + bouton scroll-to-top
- ✅ Focus-visible global dans `index.css`
- ✅ Picker de langue plein écran (fullscreen modal mobile, 5 cartes)
- ✅ Fix SPA page blanche intermittente (suppression de `AnimatePresence mode="wait"`)
- ✅ Hero home mobile : `pt-24` pour clear la navbar fixe

### Contenu / identité

- ✅ Retrait total de « René Ajari » (nom faux) — 5 fichiers
- ✅ Directeur de publication : « René Jacob Yougbaré, fondateur de Rene Football »
- ✅ Téléphone unique : `+352 691 712 574` propagé partout (10 occurrences)

### Form contact — gate parental RGPD/mineurs

- ✅ Étape 2 parcours joueur : nouveau bloc « Qui remplit ce formulaire ? »
  (self / guardian)
- ✅ Si guardian : champs conditionnels (lien de parenté, nom du mineur,
  précision si « autre »)
- ✅ Étape 3 : second consent explicite pour parent/tuteur légal
- ✅ Validation front + back + i18n 5 langues (FR/EN/DE/NL/LB)

---

## 📞 Récap à envoyer à René

Modèle de message prêt à copier-coller : voir dernier message dans le
chat Claude du 2026-09-30 (section « Questions Rene Football — validation
avant mise en prod »).

Les 3 blocs d'info à récupérer :
1. **Identité juridique** (forme / RCS / TVA / adresse)
2. **Mailbox Hostinger** (creds SMTP)
3. **Email admin de René** (pour créer le compte via tinker)

Une fois ces 3 blocs reçus : **2h max** entre la saisie des valeurs
et le push en prod.
