# Générateur de présentation joueur — état des lieux technique

> Document de travail, rédigé le 2026-10-28 à partir de la lecture du code (branche `main`).
> But : comprendre précisément ce qui existe, ce qui s'affiche réellement sur le PDF, et
> où sont les écarts, pour décider de la suite.

---

## 1. En une phrase

L'admin compose une **fiche A4 d'une page** pour un joueur du roster dans
`/admin/presentations`. Le backend Laravel produit le HTML de la fiche (template PHP
`MarketingTemplate`), le convertit en PDF avec **DomPDF**, stocke le fichier sur le disque
`public`, et peut l'exposer via un **lien public non devinable** (`/p/{token}`) à envoyer à
un club. Autre possibilité : l'admin **upload une fiche toute faite** (PNG/JPG/PDF venue de
Canva ou Photoshop), qui remplace alors le rendu du template.

---

## 2. Carte des fichiers

### Backend (Laravel)

| Rôle | Fichier |
|---|---|
| Modèle Eloquent (`player_presentations`) | [backend/app/Models/Presentation.php](../backend/app/Models/Presentation.php) |
| Migration table | [2026_06_08_120000_create_player_presentations_table.php](../backend/database/migrations/2026_06_08_120000_create_player_presentations_table.php) |
| Migration « fiche externe » | [2026_08_20_120000_add_external_asset_to_player_presentations.php](../backend/database/migrations/2026_08_20_120000_add_external_asset_to_player_presentations.php) |
| Champs joueur ajoutés pour les fiches | [2026_09_20_120000_add_fiche_data_to_players.php](../backend/database/migrations/2026_09_20_120000_add_fiche_data_to_players.php), [2026_09_20_140000_add_marketing_fiche_fields_to_players.php](../backend/database/migrations/2026_09_20_140000_add_marketing_fiche_fields_to_players.php) |
| Contrôleur admin (CRUD, rendu, uploads) | [AdminPresentationController.php](../backend/app/Http/Controllers/Api/Admin/AdminPresentationController.php) |
| Contrôleur public (PDF + meta par token) | [PresentationController.php](../backend/app/Http/Controllers/Api/PresentationController.php) |
| Classe abstraite des templates + helpers | [PresentationTemplate.php](../backend/app/Services/Presentations/PresentationTemplate.php) |
| Registre des templates | [PresentationTemplateRegistry.php](../backend/app/Services/Presentations/PresentationTemplateRegistry.php) |
| **Le seul template livré** | [Templates/MarketingTemplate.php](../backend/app/Services/Presentations/Templates/MarketingTemplate.php) |
| Heuristiques de mise en page | [AdaptiveLayout.php](../backend/app/Services/Presentations/AdaptiveLayout.php) (**non utilisé** par Marketing, voir §8) |
| Seeder des 5 fiches de référence | [MarketingReferencePresentationSeeder.php](../backend/database/seeders/MarketingReferencePresentationSeeder.php) |
| Config DomPDF | [backend/config/dompdf.php](../backend/config/dompdf.php) (`enable_remote = true`, `dpi = 96`, `chroot = base_path()`) |
| Logos embarqués | `backend/public/branding/logo-white.png`, `logo-black.png` |
| Spec design d'origine | [docs/fiche-marketing-design-spec.md](fiche-marketing-design-spec.md) |

### Frontend (React / Vite)

| Rôle | Fichier |
|---|---|
| Liste admin | [pages/admin/AdminPresentations.tsx](../frontend/src/pages/admin/AdminPresentations.tsx) |
| Éditeur (création + édition) | [pages/admin/AdminPresentationEdit.tsx](../frontend/src/pages/admin/AdminPresentationEdit.tsx) (~1 650 lignes) |
| Aperçu live (iframe) | [components/PresentationPreview.tsx](../frontend/src/components/PresentationPreview.tsx) |
| Overlay « génération PDF » | `components/PdfGenerationOverlay.tsx` |
| Types partagés | [types/presentation.ts](../frontend/src/types/presentation.ts) |
| Landing publique `/p/:token` | [pages/PublicPresentationPage.tsx](../frontend/src/pages/PublicPresentationPage.tsx) |
| Boutons sur le profil public | [pages/PlayerProfilePage.tsx](../frontend/src/pages/PlayerProfilePage.tsx) (≈ l. 534) |
| Routes | [App.tsx](../frontend/src/App.tsx) : `/p/:token`, `/admin/presentations`, `/admin/presentations/nouvelle`, `/admin/presentations/:id/edit` |

---

## 3. Modèle de données

### 3.1 Table `player_presentations`

| Colonne | Type | Rôle |
|---|---|---|
| `id` | bigint | |
| `player_id` | FK `players` (cascade) | Joueur présenté |
| `template_key` | string(40) | Toujours `marketing` aujourd'hui (les anciennes clés sont migrées à l'enregistrement) |
| `title` | string(200) | Titre interne + titre de la landing publique (pas imprimé sur le PDF) |
| `options` | JSON | **Toute la personnalisation** (thème, photo, partenaires…), voir §4 |
| `file_path` | string(500) | URL `/storage/presentations/{slug}-{id}-{rand}.pdf` du dernier PDF généré |
| `external_asset_path` / `_type` / `_original_name` | | Fiche uploadée (`image` ou `pdf`) qui court-circuite le template |
| `is_published` | bool | Visible publiquement ou non |
| `public_token` | string(64), unique | 40 caractères aléatoires, créé à la 1ʳᵉ publication, **conservé** après dépublication (le lien redevient valide si on republie) |
| `generated_at` | timestamp | Date du dernier rendu |
| `created_by` | FK `users` | Auteur, affiché « Envoyé par » sur la landing |

### 3.2 Données lues sur le joueur (`players`)

Le template lit directement le modèle `Player`. Ces données ne sont **pas** copiées
dans la présentation : modifier le joueur modifie toutes ses fiches au prochain rendu.

| Champ joueur | Où il apparaît sur la fiche | Édité où ? |
|---|---|---|
| `name` | Nom géant (1ᵉʳ mot en blanc, le reste en couleur d'accent) | Fiche joueur |
| `best_position` → sinon `position` | Sous-titre sous le nom | Fiche joueur |
| `date_of_birth` → sinon `age` | Ligne « Date de naissance » / « Âge » | Fiche joueur |
| `nationality` + `secondary_nationality` | Ligne « Nationalité » (`A / B`) | Fiche joueur |
| `position` | Ligne « Position » (seulement si différente du sous-titre) | Fiche joueur |
| `club` + `club_logo_url` | Ligne « Club actuel » avec écusson | Fiche joueur |
| `preferred_foot` | Ligne « Pied fort » + tableau Caractéristiques | Fiche joueur |
| `languages_spoken` (JSON) | Ligne « Langues parlées » (`A // B`) | Fiche joueur (saisie séparée par virgules) |
| `photo_url` | Photo principale (si `photo_source = player`) | Fiche joueur, ou upload depuis l'éditeur si absente |
| `previous_club` + `previous_club_logo` | Pastille « Vient de » sur la photo | Fiche joueur |
| `bio` (tronquée à 380 car.) | Bloc « Profil du joueur » | **Éditeur de présentation** (champ « Bio scout », resynchronisé sur le joueur) |
| `strengths` (JSON `[{label}]`, 6 max) | Bloc « Points forts » / « Qualités » | Fiche joueur |
| `playing_style`, `mental_strengths`, `objective` | Tableau « Caractéristiques » | Fiche joueur |
| `career_history` (JSON `[{years, club, logo_url}]`, 4 max) | Bloc « Parcours » | Fiche joueur (textarea `années \| club \| logo` par ligne) |
| `gallery_photos` (JSON d'URLs, 3 max affichées) | Bandeau de 3 vignettes | Fiche joueur (une URL par ligne) |

Champs joueur **pas** utilisés par Marketing alors que l'éditeur les propose : stats
(`goals`, `xg`…), `heatmap_grid`, données physiques (`distance_avg_km`…), `comparisons`,
`potential_rating`. Voir §8.

---

## 4. Les options (`options` JSON)

Validées dans `AdminPresentationController::validateData()`, nettoyées dans
`normaliseOptions()` (couleurs hors `#rgb`/`#rrggbb` supprimées, chaînes vides passées à `null`,
lignes vides retirées des listes).

> ⚠️ Laravel garde dans `options` les clés **non déclarées** dans les règles (la règle
> `options => array` renvoie tout le tableau). C'est ce qui permet aux options « cachées »
> ci-dessous de fonctionner alors qu'elles ne sont pas validées.

### 4.1 Options exposées dans l'éditeur ET utilisées par le template

| Option | Valeurs | Effet sur le PDF |
|---|---|---|
| `theme` | `violet` · `navy` · `black-gold` · `black-yellow` · `custom` | Palette complète (fond, accent, secondaire, cartes, barre du bas). Défaut backend : `black-gold` |
| `accent_color`, `secondary_color`, `text_color`, `background_color` | hex | **Seulement si `theme = custom`**, sinon ignorées |
| `photo_side` | `left` · `right` | Côté de la photo dans le bandeau du haut. Défaut backend : `left` |
| `photo_source` + `custom_photo_url` | `player` · `custom` | Photo du joueur ou photo propre à cette fiche (upload `upload-photo`, 6 Mo) |
| `tagline` | texte ≤ 200 | Petite ligne sous le logo (défaut `AGENCE DE JOUEURS`) |
| `motto` | texte ≤ 120 | Ligne centrée en majuscules dans la barre de couleur du bas |
| `slogan_cursive` | texte ≤ 160 | Slogan italique serif, aligné à droite, juste au-dessus de la barre du bas |
| `supervised_by` `{name, logo_url, country, country_code}` | | Carte « Supervisé par » (colonne droite de « Projet sportif ») + drapeau flagcdn |
| `partner_agency` `{name, logo_url, …}` | | Carte « En collaboration avec ». Le template lit aussi `description` (non éditable dans l'UI). `country`/`country_code` saisis dans l'UI **ne sont pas affichés** |
| `partner_academies` `[{country, clubs:[{name, logo_url}]}]` | ≤ 8 pays, ≤ 20 clubs | Grille « Objectifs : » (5 clubs max par pays, 1 ou 2 colonnes). Le drapeau dépend de `country_code`, **non éditable dans l'UI** |
| `player_profile_bars` `[{label, pct}]` | ≤ 8 | Barres de progression « Player Profile » |
| `font_family` | `editorial` · `sans` · `grotesque` | Police du `<body>`. En pratique Times ou Helvetica (aucune police custom embarquée). `sans` et `grotesque` donnent exactement le même rendu dans Marketing |
| `language` | `fr` · `en` · `de` · `nl` | Seulement l'attribut `lang` et la traduction de la valeur « Pied fort ». **Tous les titres restent en français** (voir §8) |

### 4.2 Options utilisées par le template mais ABSENTES de l'éditeur

Uniquement alimentées par le seeder (ou par une édition manuelle en base). Un admin ne
peut ni les voir ni les changer, mais **l'éditeur les conserve** quand il réenregistre
(il fusionne `options` existantes avec ses valeurs par défaut).

| Option | Effet |
|---|---|
| `middle_variant` | Composition du bandeau du milieu (voir §5.3). Défaut `profile-strengths` |
| `projet_intro` | Paragraphe d'intro de la section « Projet Sportif » (400 car.). Facultatif : la section s'affiche quand même s'il y a des académies ou des partenaires |
| `header_motto` | Ligne en couleur d'accent sous la tagline du logo |
| `show_watermark` | Grand « RF » fantôme derrière le nom (défaut : affiché) |
| `academies_columns` | Forcer 1 ou 2 colonnes pour la grille d'académies (auto : 2 si ≥ 4 pays) |
| `hide_agency_row` | Masquer la ligne « Agence : RENEFOOTBALL » |
| `contact.{instagram, email, phone}` | Coordonnées de la barre du bas. Défauts codés en dur : `@renefootball`, `renefootball.agency@gmail.com`, `+352 621 640 640` |
| `partner_agency.description` | Texte sous le logo de l'agence partenaire |
| `partner_academies[].country_code` | Drapeau devant le nom du pays |

### 4.3 Options exposées dans l'éditeur mais IGNORÉES par le template

Ce sont des restes des anciens templates (Classic, Magazine, Minimal, Signature, Stadium,
supprimés). L'admin peut les régler, **rien ne change sur le PDF**.

| Section de l'éditeur | Option | Pourquoi ça ne marche pas |
|---|---|---|
| Cadrage | `photo_fit`, `photo_zoom`, `photo_position_x/y` | Marketing écrit `<img style="object-fit:cover;object-position:center">`, que DomPDF ignore. Les helpers `photoFrame()`/`photoCss()` qui gèrent le cadrage existent dans la classe parente mais ne sont pas appelés |
| Statistiques mises en avant | `selected_stats` | `statRows()` jamais appelé |
| Heatmap de possession | `show_heatmap` | `heatmapHtml()` jamais appelé |
| Liens externes | `article_slug`, `youtube_url`, `qr_custom_url` | `qrTargets()` jamais appelé, aucun QR code sur la fiche |
| Typographie | `font_scale` | `pt()` / `fontScale()` jamais appelés, tailles codées en dur |
| Palette | les 4 couleurs | Ignorées sauf thème `custom` |
| Template | grille de cartes | Une seule carte (Marketing v1) |

---

## 5. Ce que la fiche affiche (template Marketing v1)

A4 portrait, **marges 0** (bord à bord), fond sombre plein. Les blocs sont empilés de haut
en bas. **Chaque bloc disparaît s'il n'a pas de données** : pas de bloc vide ni de texte
indicatif dans le PDF.

```
┌──────────────────────────────────────────────────────────────┐
│ ① BANDEAU HÉROS (115 mm)                                     │
│ ┌──────────────────────┬───────────────────────────────────┐ │
│ │                      │ Logo RF blanc (15 mm)             │ │
│ │                      │ TAGLINE · header_motto            │ │
│ │   PHOTO 48 %         │ PRÉNOM          (« RF » fantôme)  │ │
│ │   (cover, centrée)   │ NOM EN ACCENT                     │ │
│ │  [Vient de : CLUB]   │ MEILLEUR POSTE ───────────────    │ │
│ │                      │ [▢] Date de naissance             │ │
│ │                      │ [▢] Nationalité                   │ │
│ │                      │ [▢] Position / Club actuel / Pied │ │
│ │                      │ [▢] Langues / Agence              │ │
│ └──────────────────────┴───────────────────────────────────┘ │
│   (photo à gauche ou à droite selon photo_side ;             │
│    sans photo : colonne info pleine largeur centrée)         │
├──────────────────────────────┬───────────────────────────────┤
│ ② BANDEAU MILIEU : bloc A    │ bloc B   (selon middle_variant)│
├──────────────────────────────┴───────────────────────────────┤
│ ③ GALERIE : 3 vignettes 34 mm (gallery_photos)               │
├──────────────────────────────────────────┬───────────────────┤
│ ④ PROJET SPORTIF                         │ Supervisé par     │
│   projet_intro                           │ En collaboration  │
│   Objectifs : ✓ 🇬🇧 Pays  logos  noms     │ avec              │
├──────────────────────────────────────────┴───────────────────┤
│ ⑤ PLAYER PROFILE : barres % (si pas déjà dans ②)             │
├──────────────────────────────────────────────────────────────┤
│                                    slogan cursif (italique)  │
│ ⑥ BARRE DE COULEUR : MOTTO                                   │
│   ◻ @instagram        ✉ email              ☎ téléphone       │
└──────────────────────────────────────────────────────────────┘
```

### 5.1 ① Bandeau héros

- **Hauteur fixe 115 mm**, tableau 48 % photo / 52 % infos.
- **Logo** : `public/branding/logo-white.png` encodé en base64 (cache statique). Si le
  fichier manque, un logo texte « RF RENEFOOTBALL » le remplace.
- **Nom** : découpé au premier espace (`Zoran-Mawel Batomi` → `ZORAN-MAWEL` / `BATOMI`).
  52 pt / 44 pt, ou 40 pt / 34 pt si le nom fait plus de 18 caractères.
- **Lignes d'info** : un carré de 10 mm bordé d'accent avec une icône SVG (calendrier,
  globe, terrain, bouclier, pied, bulles, mallette), le libellé en petites capitales
  dans la couleur secondaire, la valeur en gras. Ordre : date de naissance/âge →
  nationalité → position → club actuel → pied fort → langues → agence.
- **« Vient de »** : pastille semi-transparente en haut à gauche de la photo, avec le
  logo du club précédent.
- **Sans photo** : la colonne photo est supprimée, les infos prennent toute la largeur.

### 5.2 Palettes des thèmes

| Thème | Fond | Accent | Secondaire | Fiche de référence |
|---|---|---|---|---|
| `violet` | `#1a0f2e` | `#8b5cf6` | `#c4b5fd` | Zoran-Mawel Batomi |
| `navy` | `#0a1f3d` | `#3b82f6` | `#93c5fd` | Camara Philan |
| `black-gold` | `#0a0a0a` | `#d4a017` | `#a89570` | Saeed Adams, Destiny Megogo |
| `black-yellow` | `#0d0d0d` | `#facc15` | `#e5e5e5` | Hanibal Tesfegabir Solomon |
| `custom` | `background_color` | `accent_color` | `secondary_color` | — |

Le texte est toujours blanc (sauf `custom`). La barre du bas prend la couleur d'accent,
avec le texte dans la couleur de fond.

### 5.3 ② Bandeau du milieu : `middle_variant`

| Variante | Bloc gauche | Bloc droit | Fiche de référence |
|---|---|---|---|
| `profile-strengths` (défaut) | **Profil du joueur** (bio) | **Points forts** (✓ + libellé, 6 max) | Camara, Destiny |
| `profile-caracteristiques` | **Points forts** | **Caractéristiques** (Pied fort / Style de jeu / Meilleur poste / Points forts mentaux / Objectif) | Zoran |
| `parcours-strengths` | **Parcours** (années · logo · club, 4 max) | **Qualités** (= points forts) | Hanibal |
| `profile-bars` | **Profil du joueur** | **Player Profile** (barres %) | Saeed |

Avec `profile-caracteristiques`, la bio n'est **pas affichée du tout**.

### 5.4 ③ à ⑥

- **③ Galerie** : 3 premières `gallery_photos`, 34 mm de haut, `object-fit: cover` (donc
  déformées par DomPDF si le ratio ne correspond pas).
- **④ Projet sportif** : affiché dès qu'il y a une intro, des académies, un « Supervisé
  par » ou une agence partenaire. Colonne principale 66 % (intro + grille « Objectifs : »),
  colonne latérale 34 % (cartes partenaires) si l'une des deux cartes existe.
- **⑤ Barres** : jusqu'à 8 barres libellé + jauge + pourcentage.
- **⑥ Pied de page** : slogan cursif éventuel, puis barre de couleur avec motto et les
  3 contacts (Instagram, email, téléphone).

### 5.5 Contraintes de rendu DomPDF à connaître

- Mise en page **uniquement en `<table>`** et `display:table`. Flex et grid ne sont pas
  supportés.
- `object-fit` / `object-position` sur `<img>` sont **ignorés**. Seuls `background-size`
  et `background-position` marchent, d'où les helpers `photoFrame()` de la classe parente.
- Les icônes SVG sont passées en `<img src="data:image/svg+xml;base64,…">`, car le SVG
  inline perd ses traits dans DomPDF.
- Les images `/storage/...` sont converties en chemins disque (`absolutePath()`) pour
  DomPDF. L'aperçu HTML refait la conversion inverse.
- Ressources distantes au moment du rendu : drapeaux `flagcdn.com` (et
  `api.qrserver.com` pour les QR, code mort aujourd'hui). Si le CDN est lent ou
  injoignable, le rendu ralentit ou perd les drapeaux.
- **Aucune garantie d'une seule page** : rien ne mesure la hauteur. Une bio longue, 6 points
  forts, la galerie, 5 pays d'académies et des barres peuvent pousser la barre de contact
  sur une page 2. `AdaptiveLayout` a été écrit pour ça mais n'est pas utilisé.
- Polices : seulement les familles de base de DomPDF (Times / Helvetica / DejaVu). La spec
  recommandait Bebas Neue + Inter (§3 de la spec), **pas fait**.

---

## 6. Flux techniques

### 6.1 API

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/admin/presentations` | Liste (avec joueur + auteur) |
| GET | `/api/admin/presentations/catalogue?category=&language=` | Templates (clé, label, description, défauts, vignette SVG), stats par catégorie, 50 derniers articles |
| POST | `/api/admin/presentations` | Crée la ligne **puis génère et stocke le PDF** |
| GET | `/api/admin/presentations/{id}` | Détail |
| PATCH | `/api/admin/presentations/{id}` | Met à jour **puis régénère le PDF** (supprime l'ancien fichier) |
| DELETE | `/api/admin/presentations/{id}` | Supprime la ligne, le PDF et la fiche externe |
| GET | `/api/admin/presentations/{id}/preview` | Renvoie un PDF fraîchement rendu (inline) |
| POST | `/api/admin/presentations/preview-html` | Rend le HTML de l'état **non enregistré** pour l'iframe |
| POST | `/api/admin/presentations/upload-photo` | Photo personnalisée (jpeg/png/webp, 6 Mo) → `{url}` |
| POST | `/api/admin/presentations/{id}/upload-asset` | Fiche externe (jpeg/png/webp/pdf, 12 Mo) |
| DELETE | `/api/admin/presentations/{id}/asset` | Retire la fiche externe, revient au template |
| GET | `/api/players/{slug}/presentations` | Public : fiches publiées d'un joueur publié |
| GET | `/api/presentations/{token}` | Public : le PDF (inline) |
| GET | `/api/presentations/{token}/meta` | Public : titre, joueur, agent, date, URL du PDF |

### 6.2 Génération du PDF (`renderPdfBytes`)

```
fiche externe présente sur le disque ?
 ├─ oui, PDF   → on sert les octets uploadés tels quels
 ├─ oui, image → page HTML A4 sans marge, image centrée (ratio conservé) → DomPDF
 └─ non        → Registry::resolve(template_key)->render(player, options, title) → DomPDF A4 portrait
```

Le PDF est **régénéré et réécrit à chaque enregistrement** (store/update/upload/clear),
avec un nom aléatoire (`{slug}-{id}-{6 hex}.pdf`), ce qui casse le cache navigateur. Le
rendu est **synchrone** dans la requête HTTP : pas de file d'attente.

> Conséquence : modifier un joueur (bio, photo, club…) **ne régénère pas** les PDF déjà
> stockés. Le lien public sert l'ancien fichier jusqu'au prochain enregistrement de la
> présentation. Seul `/preview` rend à la volée.

### 6.3 Aperçu dans l'éditeur

1. **Aperçu live** (colonne de droite) : à chaque changement (debounce 350 ms), POST
   `preview-html` avec l'état courant. Le HTML renvoyé est affiché dans une `<iframe srcDoc>`
   de 794×1123 px (A4 à 96 dpi), réduite par `transform: scale()` à la largeur de la colonne.
   C'est le **même HTML** que celui donné à DomPDF. Les différences restantes viennent du
   moteur : le navigateur respecte `object-fit`, flex, les polices système… donc l'aperçu
   peut être *plus beau* que le PDF (photo bien cadrée dans l'iframe, mais pas dans le PDF).
2. **Bouton « Aperçu PDF »** : enregistre (crée le brouillon si besoin), récupère
   `/preview` en blob avec le Bearer token, ouvre le blob dans un nouvel onglet.
3. Si une fiche externe est attachée : l'aperçu montre l'image (`<img>`) ou le PDF
   (`<object>`) uploadé.

### 6.4 Bio scout

Le champ « Bio scout » de l'éditeur (350 car. max, jauge vert/ambre/rouge à 180/260)
modifie **`players.bio`**. À chaque enregistrement ou aperçu PDF, l'éditeur fait d'abord un
`PATCH /admin/players/{slug}` avec la bio, puis enregistre la présentation. Donc modifier
la bio ici modifie aussi le profil public du joueur et toutes ses autres fiches.

### 6.5 Diffusion

- Case « Publier » → `is_published = true` + génération du `public_token` la première fois.
- L'éditeur affiche alors le lien `https://…/p/{token}` (copier / ouvrir).
- **Landing `/p/:token`** (hors layout du site) : en-tête avec photo ronde, nom, poste · club,
  bouton « Télécharger », mentions « Envoyé par {agent} · Généré le {date} · Template {nom} »,
  PDF dans une iframe, pied « confidentiel ». Textes traduits (`presentation.*` dans les 5 locales).
- **Profil public du joueur** : jusqu'à 3 boutons « Présentation » qui pointent directement
  sur le PDF `/api/presentations/{token}` (pas sur la landing).

---

## 7. Les 5 fiches de référence (seeder)

`MarketingReferencePresentationSeeder` crée (`updateOrCreate`) une présentation par joueur
de référence, avec les options qui reproduisent les PNG fournis le 2026-09-20 :

| Joueur (slug) | Thème | Photo | `middle_variant` | Particularités |
|---|---|---|---|---|
| `zoran-mawel-batomi` | violet | droite | profile-caracteristiques | Pas de filigrane, slogan + motto, contacts spécifiques |
| `camara-philan` | navy | droite | profile-strengths | `projet_intro` + 4 pays d'académies |
| `saeed-adams` | black-gold | droite | profile-bars | Textes en anglais, barres de profil |
| `destiny-megogo` | black-gold | **gauche** | profile-strengths | Supervisé par WNRS + agence partenaire |
| `hanibal-tesfegabir-solomon` | black-yellow | droite | parcours-strengths | `header_motto`, académies renommées en « objectifs » |

---

## 8. Écarts, bugs et dette repérés

Classés par impact pour l'utilisateur.

### 8.1 Ce que l'admin voit ne correspond pas à ce qu'il obtient

1. **Thème et côté photo par défaut incohérents.** L'éditeur affiche « Navy » et « Droite »
   comme sélectionnés quand rien n'est choisi (`?? 'navy'`, `?? 'right'`), mais le backend
   rend `black-gold` et `left` par défaut. Une nouvelle fiche créée sans toucher à ces
   boutons sort donc en noir & or, photo à gauche.
2. **Police par défaut incohérente.** L'éditeur affiche « Éditoriale » (serif) par défaut ;
   `MarketingTemplate::defaultOptions()` dit `sans`, mais ces défauts ne sont jamais
   fusionnés (`pickTemplate()` ne copie que les 4 couleurs, et seulement au clic sur la
   carte). Résultat : PDF en Times.
3. **Sections sans effet** : Cadrage, Statistiques, Heatmap, Liens externes / QR,
   Taille de base, Palette (hors `custom`), Langue (presque). Voir §4.3.
4. **La langue ne traduit pas la fiche.** Tous les libellés de Marketing sont du français en
   dur (« Date de naissance », « Points forts », « Projet Sportif », « Vient de »…) ; la
   table `T` de la classe parente n'est pas utilisée. Saeed est en anglais seulement parce
   que ses textes libres sont écrits en anglais ; ses titres restent français.
5. **Le cadrage photo marche dans l'aperçu mais pas dans le PDF**, voir §6.3. Même chose
   pour la galerie et les logos (`object-fit: contain`).
6. **Options utiles inaccessibles** : `middle_variant`, `projet_intro`, `header_motto`,
   `show_watermark`, `contact`, `description` de l'agence partenaire, `country_code` des
   académies. Seule façon de les régler aujourd'hui : le seeder.
7. **Pays de l'agence partenaire** : saisi dans l'UI, jamais affiché par Marketing (le
   helper `partnerAgencyHtml()` qui l'affichait n'est plus appelé).

### 8.2 Fiabilité du document

8. **Pas de garde « 1 page »** : aucun calcul de hauteur, débordement possible sur page 2.
9. **PDF figé** après une modification du joueur (§6.2) : le lien public peut être obsolète.
10. **Dépendances réseau au rendu** (flagcdn) : rendu plus lent, et drapeaux absents hors ligne.
11. **Logos et photos par URL libre** : une URL externe lente ou cassée ralentit ou
    appauvrit le rendu. Pas d'upload pour les logos partenaires, académies, clubs.
12. **Rendu synchrone** : chaque frappe dans l'éditeur déclenche un rendu HTML côté serveur
    (350 ms de debounce), et chaque enregistrement un rendu DomPDF complet dans la requête.

### 8.3 Dette de code

13. **Code mort côté PHP** dans `PresentationTemplate` : `statRows`, `heatmapHtml` +
    `buildHeatmapPng`, `photoFrame`/`photoCss`, `extrasBlockHtml`, `columnExtrasHtml`,
    `qrTargets`, `partnerAgencyHtml`, `partnerAcademiesHtml`, `strengthsBlockHtml`,
    `physiqueBlockHtml`, `comparisonsBlockHtml`, `layoutHints`, `fontScale`/`pt`, la table `T`
    presque entière, et toute la classe `AdaptiveLayout`.
14. **Code mort côté React** dans `PresentationPreview.tsx` : `MarketingPreview`
    (ancien aperçu simplifié), `ExtrasBand`, `HeatmapGrid`, `PhotoOrPlaceholder`,
    `computeStats`, la table `T`… Seul `MarketingIframePreview` sert.
15. **Commentaires périmés** dans l'éditeur (« Stadium uniquement », « vérifiez Minimal /
    Stadium »…) et `DEFAULT_OPTIONS` hérités des anciens templates (palette bleue claire).
16. **Landing publique** : `TEMPLATE_LABEL` ne connaît pas `marketing` et affiche la clé brute
    « marketing » dans « Template : … ».
17. **Éditeur admin non traduit** (tout en français en dur). Hors du périmètre strict de
    CLAUDE.md §3, qui vise les pages publiques, mais à garder en tête.
18. **Duplication** du découpage prénom/nom, des palettes et des défauts entre PHP et TS.

---

## 9. Pistes pour la suite (à discuter)

Par ordre de rapport effet / effort :

1. **Aligner l'éditeur sur le template** (petit chantier, gros gain de confiance) :
   - corriger les défauts thème / côté / police (§8.1-1 et 2) ;
   - **masquer** les sections sans effet (Cadrage, Stats, Heatmap, QR, Taille, Palette hors
     `custom`) ou les **brancher** (voir 2) ;
   - **exposer** `middle_variant` (sélecteur visuel des 4 compositions), `projet_intro`,
     `header_motto`, `show_watermark`, `contact.*`, `partner_agency.description`, et le code
     pays des académies.
2. **Brancher les fonctions utiles déjà écrites** :
   - le cadrage photo via `photoFrame()` (background-image, compatible DomPDF) ;
   - des QR codes (`qrTargets()`) dans la barre du bas ou la colonne partenaires ;
   - les traductions (`t()`) pour les libellés fixes de Marketing.
3. **Garantir une page** : réutiliser `AdaptiveLayout` (score de remplissage) pour réduire
   les tailles ou plafonner les listes, ou rendre deux fois avec DomPDF et compter les pages.
4. **Régénérer les PDF** quand un joueur change (event `Player::updated` → job en file), ou
   rendre le PDF à la volée sur le lien public (avec cache).
5. **Polices embarquées** (Bebas Neue pour le nom, Inter pour le corps) via `storage/fonts`,
   comme le recommandait la spec.
6. **Uploads de logos** (partenaires, académies, clubs) au lieu d'URL libres, et drapeaux
   embarqués en local.
7. **Nettoyage** du code mort PHP + TS une fois les choix faits (ne pas supprimer ce qu'on
   décide de rebrancher au point 2).

---

## 10. Questions ouvertes

- Garde-t-on **un seul template** paramétrable, ou veut-on des variantes nommées
  (« Fiche Zoran », « Fiche Hanibal »…) que l'admin choisit comme point de départ ?
  Le seeder est déjà, en pratique, un jeu de presets.
- Stats, heatmap et données physiques ont-elles leur place sur une fiche marketing, ou
  faut-il les retirer de l'éditeur ?
- Le lien public doit-il toujours servir la **dernière version** des données du joueur,
  ou un document **figé** au moment de l'envoi (traçabilité de ce que le club a reçu) ?
- Faut-il traduire la fiche (titres) en EN / DE / NL, voire LB ?
