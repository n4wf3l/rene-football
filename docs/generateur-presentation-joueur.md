# Générateur de fiches joueurs : architecture premium (2026-10)

> Remplace l'état des lieux du 2026-10-28 matin. Branche `feat/fiches-premium`.

## 1. En bref

L'admin choisit un joueur et une **composition premium** :
- **Signature Editorial** : affiche d'agence ;
- **Scouting Intelligence** : rapport pour recruteurs ;
- **Career & Potential** : parcours et projet sportif.

Il personnalise ensuite thème, cadrage, langue et textes. Le backend produit un PDF
qui fait **toujours exactement une page A4 portrait**. Ce n'est pas une promesse
du gabarit : c'est vérifié sur les octets du fichier. Si c'est impossible, la
génération est refusée avec un message clair, et l'ancien PDF valide est conservé.

L'ancienne mise en page Marketing v1 reste disponible sous le nom `classic` pour
les présentations enregistrées avant la refonte (options sans clé `composition`).
Elle est vérifiée de la même façon, mais ne s'adapte pas.

## 2. Pourquoi DomPDF et pas Chromium

La production tourne sur **Hostinger mutualisé (plan Single)** : pas de SSH, pas de Node,
pas de Chromium, pas de Docker (voir `HOSTINGER-DEPLOY.md`). Ni Browsershot ni Gotenberg
n'y sont installables, sauf à changer d'hébergement (VPS) ou à dépendre d'un service externe.

Le moteur reste donc DomPDF, qui est du PHP pur, mais il est entouré d'un vrai système
de mise en page :
- positionnement absolu en millimètres et calques (z-index) ;
- polices TTF embarquées ;
- images recadrées en amont avec GD, pour ne jamais dépendre d'`object-fit` (que DomPDF ignore) ;
- mesure de la géométrie réellement rendue ;
- validation indépendante du PDF final.

Le rendu passe par une seule classe (`FicheRenderer`). Brancher Chromium plus tard
(sur un VPS) ne demanderait qu'un renderer alternatif avec la même interface de mesure.

## 3. Pipeline (backend/app/Services/Presentations)

```
Player + options ─▶ FicheDataFactory ─▶ FicheData (normalisée, traduite, images locales)
                                            │
FicheLayoutEngine ─ pour chaque cran de FicheDensity::ladder() ─────────────┐
   1. Composition::render(RenderContext) → HTML (mm, data-* d'annotation)    │
   2. FicheRenderer::render(html, draft) → mesure DomPDF (boîtes réelles)   │
   3. échec « taille » → re-composition avec la géométrie mesurée            │
   4. échec → cran suivant (espacements → typo → synthèses éditoriales)  ◀──┘
   5. succès → passe de remplissage (l'espace libre mesuré agrandit
      photo / rythme), puis passe finale avec les vraies images, re-mesurée
   6. PdfInspector (smalot/pdfparser) : 1 page, MediaBox A4 ± 1 pt
   7. sinon FicheLayoutException (message pour l'admin + détails)
```

| Fichier | Rôle |
|---|---|
| `Fiche/FicheDataFactory.php` | Règles métier : défauts, stats « réelles » uniquement, priorité QR, chronologie du parcours, drapeaux |
| `Fiche/FicheCompositions.php` | Registre, **source unique des défauts** et des options supportées par composition (servis à l'éditeur) |
| `Fiche/FicheTheme.php` | Palettes (4 thèmes et personnalisé, tons dérivés) |
| `Fiche/FicheI18n.php` | Libellés FR/EN/DE/NL, dates, nombres |
| `Fiche/FicheAssets.php` | Images locales et distantes (SSRF : IP publiques, DNS épinglé, pas de redirection, 8 Mo / 5 s), recadrage GD, fondus, QR local, drapeaux |
| `Fiche/FontMeasure.php` | Largeur exacte des glyphes (php-font-lib) pour dimensionner les noms |
| `Fiche/FicheDensity.php` | Échelle de densité : 3 crans de mise en page et 4 de synthèse, avec plafonds par liste |
| `Fiche/RenderContext.php` | `take()` / `prose()` : chaque coupe est **notée** pour le rapport admin |
| `Fiche/FicheRenderer.php` | DomPDF + mesure (callback `end_frame`) : 2ᵉ page, bloc sous le pied de page, cadre trop petit, débordement horizontal, collisions |
| `Fiche/PdfInspector.php` | Vérification indépendante du PDF (et des PDF importés) |
| `Fiche/Compositions/*` | Signature, Scouting, Career, Classic et blocs partagés |
| `PresentationPdfService.php` | Point d'entrée : fiche externe (image enveloppée, PDF validé) ou moteur |
| `HeatmapRenderer.php` | Heatmap 4×6 (sortie de `PresentationTemplate`) |

Annotations HTML lues par le renderer : `data-block`, `data-limit` (doit finir au-dessus
du pied de page), `data-fit` (cadre fixe sans débordement), `data-avoid` (pas de collision),
`data-bleed` (décor autorisé à sortir de la page). Aucun `overflow:hidden` ne sert à masquer un débordement.

### Performance

Les passes de mesure remplacent les images par un GIF transparent de 1 px **aux mêmes
dimensions explicites** : la géométrie est identique, mais DomPDF évite son traitement
pixel par pixel des PNG transparents. Une passe de mesure prend environ 0,2 s ; la passe
finale avec images de 1,5 à 3 s. Une fiche complète prend 2 à 5 s, jusqu'à environ 10 s
pour les cas extrêmes.

## 4. Données : ce qui s'affiche, et quand

- **Jamais inventé** : les stats ne sont imprimées que si `stats_source` est renseigné ou si
  `matches_played > 0`, et seulement les valeurs non nulles. Heatmap, données physiques,
  potentiel et comparaisons n'apparaissent que s'ils existent.
- **Toujours visible** : identité, poste, photo (si elle existe), faits principaux, contacts.
- **Synthèse explicite** : listes et textes secondaires plafonnés selon la densité
  (« +N autres » sur la page, détail `render_meta.synthesized` dans l'éditeur). Rien n'est
  supprimé en base.
- **Photos** : recadrées selon le zoom et le point focal de l'éditeur, au bon ratio. Les PNG
  détourés (fond transparent) passent devant le nom.
- **QR** : généré localement, uniquement si une URL existe (URL perso, puis YouTube, puis article publié).

## 5. API

Les routes existantes sont inchangées (tokens et URL publiques compris). Ajouts et changements :

| Route | Changement |
|---|---|
| `POST /api/admin/presentations/preview-pdf` | **Nouveau.** Rend l'état non enregistré (`options`, `overrides.bio`) et renvoie `{pdf: base64, layout}`. N'écrit rien en base. |
| `POST/PATCH /api/admin/presentations` | Rendu et vérification **avant** l'enregistrement ; 422 `errors.layout` si impossible (options et PDF précédents conservés). Enregistre `render_meta`. |
| `POST …/{id}/upload-asset` | Un PDF importé doit faire 1 page A4 portrait, sinon 422 avec message ; une image est placée sur une page A4. |
| `GET …/catalogue` | + `compositions` (supports, defaults, vignette), `themes`, `languages`. |
| `GET /api/presentations/{token}/meta` | + `composition` (libellé traduit sur la page publique). |

## 6. Éditeur (frontend)

- Les cartes de composition, les thèmes et les contrôles sont **générés depuis le catalogue** :
  une option non rendue par la composition n'est pas affichée.
- **Aperçu = le vrai PDF**, rendu par pdf.js (`pdfjs-dist@6.3.289`). Il se met à jour 700 ms
  après la dernière modification, les requêtes dépassées sont annulées, et il ne fait aucune
  écriture (la bio en cours est envoyée en `overrides`).
- Rapport sous l'aperçu : « 1 page · 210 × 297 mm vérifié », densité, éléments synthétisés.
- Options auparavant cachées désormais exposées : `middle_variant`, `projet_intro`,
  `header_motto`, `show_watermark`, contacts, descriptions des partenaires, codes pays des académies.

## 7. Déploiement

- **Composer** : `chillerlan/php-qrcode` ^5, `smalot/pdfparser` ^2.11, installés par le
  `composer install` de la GitHub Action. Pur PHP, aucune extension nouvelle (GD et mbstring
  étaient déjà requis).
- **npm** : `pdfjs-dist@6.3.289` (bundle Vite, aucun service externe).
- **Fichiers versionnés** : `backend/resources/fonts/fiche` (OFL, licences incluses) et
  `backend/resources/flags` (256 PNG, environ 670 Ko).
- **Dossiers inscriptibles** : `storage/fonts` (cache de métriques DomPDF, créé
  automatiquement) et `storage/app/fiche-cache` (recadrages, QR, fondus, images distantes).
- **Migration** : `2026_10_28_120000_add_render_meta_to_player_presentations` (colonne JSON
  nullable), appliquée par l'endpoint `/_maintenance/bootstrap`.
- **Seeder** : `MarketingReferencePresentationSeeder` attribue une composition premium aux 5 fiches de référence.
- **Rollback** : revenir au commit précédent puis `migrate:rollback --step=1` (supprime
  `render_meta`). L'ancien code ignore la clé `options.composition` et rend Marketing v1 ;
  aucune donnée n'est perdue.

## 8. Tests et contrôle visuel

- `php artisan test --filter=PresentationFicheTest` : 38 tests.
  - 27 scénarios moteur : 3 compositions × {minimal, référence, extrême FR/EN/DE/NL,
    photo recadrée zoom 250 % au coin, photo entière, thème clair personnalisé}.
    Chacun vérifie 1 page et la MediaBox A4 avec smalot.
  - Plus : synthèse explicite, absence de stats inventées, traductions, QR local, rendu
    historique, API (création, aperçu sans écriture, échec sans écrasement, PDF importé de
    2 pages refusé, image enveloppée, catalogue).
- `FICHE_TEST_DUMP=<dossier>` conserve les PDF générés par les tests.
- `php artisan presentations:samples <dossier> [--composition=] [--player=] [--photo=slug=/storage/…]`
  rend les fiches de référence sans écrire en base, avec le rapport JSON.

## 9. Limites connues

- Moteur DomPDF : ni dégradés CSS (remplacés par des PNG de fondu), ni masques
  « coup de pinceau » des maquettes d'origine. Les rendus restent de qualité print (texte
  vectoriel, polices embarquées en sous-ensemble).
- Temps de génération de 2 à 10 s par fiche (synchrone, dans la requête).
- Les PDF stockés ne sont pas régénérés quand le joueur change. Il faut réenregistrer la
  présentation (comportement inchangé).
- Le drapeau d'une nationalité est déduit d'un dictionnaire FR/EN/NL/DE d'environ 45 pays ;
  une valeur inconnue s'affiche sans drapeau.
- L'éditeur admin reste en français codé en dur, comme le reste de l'admin. Les libellés du
  PDF (FR/EN/DE/NL) et la page publique (5 langues) sont traduits.
