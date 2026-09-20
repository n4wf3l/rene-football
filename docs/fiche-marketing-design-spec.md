# Spec design — Fiches marketing Rene Football

Basé sur les 5 fiches de référence partagées le 2026-09-20. Ce doc décrit ce qu'il faudrait implémenter pour reproduire ces fiches **à l'identique** via le générateur admin (au lieu de passer par l'upload PNG).

Cible PDF : **A4 portrait, 210×297 mm, marges 0 (bord à bord), DomPDF**.

---

## 1. Anatomie commune aux 5 fiches

Toutes les fiches partagent la même structure macro :

```
┌───────────────────────────────────────────────┐
│ HEADER : logo RF + tagline                    │ 15-25 mm
├─────────────────────┬─────────────────────────┤
│                     │                         │
│  NAME + INFO        │      PHOTO ACTION       │ 90-130 mm
│  (colonne gauche)   │      (pleine hauteur)   │
│                     │                         │
├─────────────────────┴─────────────────────────┤
│  POINTS FORTS / CARACTÉRISTIQUES / PHOTOS     │ 70-100 mm
├───────────────────────────────────────────────┤
│  PROJET SPORTIF / ACADÉMIES / PARTENAIRES     │ variable
├───────────────────────────────────────────────┤
│  FOOTER : contact + socials                   │ 12-18 mm
└───────────────────────────────────────────────┘
```

Photo action peut être **à droite** (fiches 1, 2, 3, 5) ou **à gauche** (fiche 4). C'est un flag d'option.

---

## 2. Palette par fiche

| Fiche | Fond | Accent | Texte principal | Texte secondaire |
|---|---|---|---|---|
| 1 Zoran-Mawel | `#1a0f2e` violet foncé + gradient | `#8b5cf6` violet vif | `#ffffff` | `#c4b5fd` |
| 2 Camara Philan | `#0a1f3d` bleu marine | `#3b82f6` bleu vif | `#ffffff` | `#93c5fd` |
| 3 Saeed Adams | `#0a0a0a` noir | `#d4a017` gold | `#ffffff` | `#e5c04a` |
| 4 Destiny Megogo | `#0a0a0a` noir | `#d4a017` gold | `#ffffff` | `#a89570` |
| 5 Hanibal | `#0d0d0d` noir | `#facc15` jaune vif | `#ffffff` | `#e5e5e5` |

**Uniforme** : le fond est toujours sombre (noir/marine/violet), l'accent est une couleur vive utilisée pour le nom, les titres de section, les icônes.

---

## 3. Typographie

Aucune police custom actuellement chargée dans DomPDF — on doit soit :
- (a) rester sur les 3 stacks déjà supportées (`editorial`/`sans`/`grotesque`) et faire au plus proche
- (b) embarquer 2 polices supplémentaires via `@font-face` local (Bebas Neue pour les gros titres, Inter/Poppins pour le corps)

**Reco : option (b)** — sans ces polices le rendu sera notablement plus fade que les fiches originales.

### Titres joueur (nom)

Toutes les fiches utilisent une police display bold ou serif italic :
- Fiche 1 (Zoran-Mawel) : sans-serif bold, très serré, prénom en blanc / nom en violet, tailles **~62-72pt**, line-height 0.9
- Fiche 2 (Camara) : sans-serif bold, prénom blanc / nom bleu, **~68pt**
- Fiche 3 (Saeed) : sans-serif condensed bold uppercase, prénom blanc / nom gold, **~72pt**
- Fiche 4 (Destiny) : sans-serif bold blanc + prénom gold, **~50pt**
- Fiche 5 (Hanibal) : sans-serif bold blanc + prénom gold, **~46pt**

**Suggéré** : `Bebas Neue` ou `Oswald` pour le nom, `#accent` sur une des deux lignes.

### Corps de texte

`Inter` ou `Poppins` en 8-10pt, blanc sur fond sombre.

### Labels de sections

Sans-serif uppercase, letter-spacing +2px, 7-8pt, couleur accent ou secondary.

---

## 4. Zones précises (mm depuis coin haut-gauche)

### Fiche 1 & 2 (photo droite, layout portrait dominant)

| Élément | Position (x,y) | Taille (w×h) | Style |
|---|---|---|---|
| Logo RF + tagline | (12, 12) | 60×15 | 12pt bold + 6pt uppercase |
| Crest club (top-right) | (185, 12) | 20×20 | image contain |
| Nom (2 lignes) | (12, 40) | 100×60 | 62pt bold, line-height 0.9, split couleur |
| Tagline sous nom | (12, 100) | 100×5 | 8pt uppercase letter-spacing 2 |
| Info block (5 lignes icône+label+valeur) | (12, 115) | 100×70 | icônes 8mm, label 6pt uppercase, valeur 10pt bold |
| Photo action | (110, 0) | 100×220 | cover, bleed top |
| Card "Points forts" | (12, 200) | 96×80 | fond `rgba(255,255,255,0.05)`, radius 3mm |
| Card "Caractéristiques" | (114, 200) | 84×80 | 5 lignes table (label \| valeur) |
| Section "Profil du joueur" | (12, 288) | 96×40 | h6 accent + paragraphe 8pt |
| Grid 3 photos secondaires | (114, 288) | 84×30 | 3 vignettes 27×30 côte à côte |
| Footer bar | (0, 340) | 210×15 | fond noir, contact + socials |

### Fiche 3 (Saeed — layout compact avec bars de stats)

| Élément | Position | Notes |
|---|---|---|
| 2 drapeaux top-right | (180, 5) / (180, 30) | 20×15 chacun avec label sous chacun |
| Info card fond noir bordure gold | (12, 65) | 90×135, 6 lignes icône+label+valeur |
| Photo action full-height | (100, 0) | 110×220 |
| 3 vignettes photos | (12, 210) | 100×30 |
| Bio + Sports project (2 col) | (12, 245) | 200×50 |
| Player profile bars (6 stats) | (110, 245) | 100×50, chaque bar : label + rectangle gold + % |
| Academy grid 4 pays | (12, 305) | 130×40 |
| Card contact/motto gold | (145, 305) | 55×60 |

### Fiche 4 (Destiny — photo à GAUCHE)

Mirror horizontal de fiches 1/2. Ajouts :
- Banner "Vient de : KRC GENK Belgique" en haut-gauche sur la photo, logo du club rond
- Section "Supervisé par WNRS Sport" + "En collaboration avec RENEFOOTBALL" en carte droite bas
- Slogan cursive italique en bas-droite

### Fiche 5 (Hanibal — layout dense)

- Photo top-right en brush stroke pinceau (masque décoratif — pas faisable en DomPDF pure, fallback rectangle)
- Section "Parcours" avec table année → club + logo
- Section "Objectifs" avec 4 groupes de logos par catégorie
- Footer jaune avec 4 blocs contact

---

## 5. Champs data manquants dans la DB pour couvrir ces 5 fiches

Déjà ajoutés (feature précédente) :
- ✅ `date_of_birth`
- ✅ `club_logo_url`
- ✅ `secondary_photo_url`
- ✅ `partner_agency` (options)
- ✅ `partner_academies` (options)
- ✅ `qr_custom_url` (options)

**Restant à ajouter** :

| Champ | Sur | Utilisé par | Type |
|---|---|---|---|
| `playing_style` | Player | Fiche 1 (Percutant – Dribbleur) | string |
| `best_position` | Player | Fiche 1 (Attaquant de pointe) | string |
| `mental_strengths` | Player | Fiche 1 (Confiant / Persévérant / Compétiteur) | JSON array of strings |
| `objective` | Player | Fiche 1 (Devenir pro…) | text |
| `secondary_nationality` | Player | Fiche 3 (dual Ghanaian/Dutch) | string |
| `languages_spoken` | Player | Fiche 3 (English // Dutch) | JSON array |
| `gallery_photos` | Player | Fiches 1, 3, 4 (3-4 vignettes) | JSON array of URLs |
| `career_history` | Player | Fiche 5 (Parcours) | JSON array `[{years, club, logo_url}]` |
| `previous_club` | Player | Fiche 4 (Vient de KRC GENK) | string |
| `previous_club_logo` | Player | Fiche 4 | string |
| `player_profile_bars` | Player OR options | Fiche 3 (Speed 90%, etc.) | JSON `[{label, pct}]` |
| `motto` | Options | Fiche 3 (DISCIPLINE • WORK…) | string |
| `slogan_cursive` | Options | Fiche 4 (Notre vision…) | string |
| `supervised_by` | Options | Fiche 4 (Supervisé par WNRS) | object like partner_agency |

---

## 6. Ce qu'il faudrait construire

### 6a. Backend

1. **Migration** ajoutant les ~12 nouveaux champs Player + validation controller
2. **Nouveau template** `MarketingTemplate.php` (ou plusieurs variants) qui :
   - Utilise le layout "photo bleed" (marges 0)
   - Accepte les options ci-dessus (playing_style, mental_strengths, etc.)
   - A un flag `photo_side` (left|right)
   - A un flag `theme` (violet|navy|black-gold|black-yellow) qui pré-remplit la palette
3. **Chargement de polices** custom via DomPDF (Bebas Neue + Inter à embarquer dans `storage/fonts/`)
4. **Génération icônes en SVG inline** pour DOB (calendrier), nationality (drapeau), position (silhouette), foot (chaussure), club (bouclier), languages (bulle)

### 6b. Frontend admin

1. **Éditeur** dans AdminPresentationEdit :
   - Section "Style de fiche marketing" (photo_side, theme)
   - Section "Profil détaillé" (playing_style, best_position, mental_strengths, objective)
   - Section "Galerie photos" (upload multi + drag & drop reorder)
   - Section "Parcours" (year+club+logo repeater)
   - Section "Bars de progression" (label+% repeater)
2. **Preview React** miroir du nouveau template

### 6c. Ordre suggéré

Développer **un seul template** en premier (le plus proche du besoin quotidien René), tester, puis dupliquer les variants.

**Ma reco** : fiche 4 (Destiny) — c'est la plus complète (couvre partner + academies + slogan + "vient de") et son layout est le plus proche de la fiche Camara qu'on a déjà en prod comme cible.

---

## 7. Estimation

- **Ajout des champs data + migration + validation** : ~2h
- **Un template complet (Marketing v1) avec icônes SVG** : ~6-8h
- **Chargement custom fonts DomPDF + test** : ~1h
- **Éditeur admin (repeaters, upload multi photos)** : ~4h
- **Preview React** : ~3h
- **Duplication en 4 variants supplémentaires** : ~3h/variant

**Total** : ~25-30h pour couvrir les 5 fiches à l'identique.

Pour comparaison, l'upload PNG (déjà livré) résout le même besoin en 0h supplémentaire — René fait la fiche dans Canva/Photoshop et l'attache.

---

## 8. Décision requise

Vue l'ampleur, avant de coder je propose de choisir :

**A. On garde l'upload PNG comme workflow principal** (déjà en prod) et on n'implémente pas de nouveau template — René produit les fiches marketing dans son outil de PAO habituel.

**B. On implémente UN template marketing "Marketing v1"** (fiche 4 Destiny comme cible) qui couvre agence + académies + partenaire + slogan. Les 4 autres fiches (variantes de couleur/layout) seront servies par le même template avec `theme` + `photo_side`. **Scope réaliste ~15h**.

**C. On implémente 5 templates distincts** pour matcher chaque fiche pixel-près. **Scope 25-30h**.
