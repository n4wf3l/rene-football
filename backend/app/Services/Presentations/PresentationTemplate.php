<?php

namespace App\Services\Presentations;

use App\Models\Player;
use App\Services\Presentations\Fiche\FicheI18n;

/**
 * Each concrete template returns a complete <html>...</html> document that
 * DomPDF can rasterize directly. We keep CSS inline (DomPDF dislikes modern
 * CSS) and let `render()` interpolate the chosen options.
 */
abstract class PresentationTemplate
{
    abstract public static function key(): string;
    abstract public static function label(): string;
    abstract public static function description(): string;

    /** Defaults for the option fields the editor exposes. */
    public static function defaultOptions(): array
    {
        return [
            'accent_color'    => '#1e40af',
            'secondary_color' => '#93c5fd',
            'text_color'      => '#0c0a09',
            'background_color'=> '#fafaf9',
            'selected_stats'  => [],
            'show_heatmap'    => true,
            'photo_source'    => 'player', // 'player' | 'custom'
            'custom_photo_url'=> null,
            'tagline'         => null,
        ];
    }

    /** Returns a SVG snippet that the admin UI uses as a thumbnail preview. */
    public static function thumbnailSvg(): string
    {
        return '';
    }

    abstract public function render(Player $player, array $options, string $title): string;

    /** Curated stat catalogue, segmented by player category for the picker UI. */
    public static function statCatalogue(string $category, string $lang = 'fr'): array
    {
        $i18n = FicheI18n::for($lang);
        $labels = [];
        foreach (['matches_played', 'minutes_played', 'clean_sheets', 'saves', 'pass_accuracy', 'yellow_cards', 'goals', 'assists', 'xg', 'xa', 'key_passes', 'shots_on_target', 'dribbles_completed', 'tackles', 'interceptions', 'duels_won'] as $key) {
            $labels[$key] = $i18n->t('st_'.$key);
        }

        if ($category === 'Gardien') {
            return [
                ['key' => 'matches_played', 'label' => $labels['matches_played']],
                ['key' => 'minutes_played', 'label' => $labels['minutes_played']],
                ['key' => 'clean_sheets',   'label' => $labels['clean_sheets']],
                ['key' => 'saves',          'label' => $labels['saves']],
                ['key' => 'pass_accuracy',  'label' => $labels['pass_accuracy'], 'suffix' => '%'],
                ['key' => 'yellow_cards',   'label' => $labels['yellow_cards']],
            ];
        }
        return [
            ['key' => 'matches_played',     'label' => $labels['matches_played']],
            ['key' => 'minutes_played',     'label' => $labels['minutes_played']],
            ['key' => 'goals',              'label' => $labels['goals']],
            ['key' => 'assists',            'label' => $labels['assists']],
            ['key' => 'xg',                 'label' => $labels['xg']],
            ['key' => 'xa',                 'label' => $labels['xa']],
            ['key' => 'key_passes',         'label' => $labels['key_passes']],
            ['key' => 'pass_accuracy',      'label' => $labels['pass_accuracy'], 'suffix' => '%'],
            ['key' => 'shots_on_target',    'label' => $labels['shots_on_target']],
            ['key' => 'dribbles_completed', 'label' => $labels['dribbles_completed']],
            ['key' => 'tackles',            'label' => $labels['tackles']],
            ['key' => 'interceptions',      'label' => $labels['interceptions']],
            ['key' => 'duels_won',          'label' => $labels['duels_won']],
            ['key' => 'yellow_cards',       'label' => $labels['yellow_cards']],
        ];
    }

    // -------------------- shared helpers (used by concrete templates) --------------------

    protected function pickPhoto(Player $player, array $options): ?string
    {
        $src = $options['photo_source'] ?? 'player';
        if ($src === 'custom' && ! empty($options['custom_photo_url'])) {
            return $this->absolutePath($options['custom_photo_url']);
        }
        return $player->photo_url ? $this->absolutePath($player->photo_url) : null;
    }

    /**
     * Compose the CSS payload used to render the hero photo with the admin's
     * cropping choices. Returns a `<div>` whose background image fills the
     * frame using `cover` semantics, plus a `scale()` transform on top so the
     * admin can zoom in beyond cover. The chosen focal point doubles as the
     * transform origin so zooming keeps it pinned. DomPDF supports both
     * `background-size: cover` and `transform: scale()`.
     */
    protected function photoCss(array $options): array
    {
        $fit  = ($options['photo_fit'] ?? 'contain') === 'cover' ? 'cover' : 'contain';
        $zoom = max(100, min(250, (int) ($options['photo_zoom'] ?? 100)));
        $x    = max(0, min(100, (int) ($options['photo_position_x'] ?? 50)));
        $y    = max(0, min(100, (int) ($options['photo_position_y'] ?? 50)));
        $scale = number_format($zoom / 100, 3, '.', '');
        return [
            'object_fit'      => $fit,
            'object_position' => "{$x}% {$y}%",
            'transform'       => $zoom > 100 ? "transform: scale({$scale}); transform-origin: {$x}% {$y}%;" : '',
        ];
    }

    /**
     * Render the hero photo using `background-image` + `background-size` on a
     * positioned div rather than `<img object-fit>`. DomPDF supports
     * background-size (cover / contain / percentage) reliably but silently
     * ignores object-fit / object-position on <img>, which was stretching
     * portrait photos into landscape frames.
     */
    protected function photoFrame(?string $src, array $options, string $fallbackBg, string $extraStyle = ''): string
    {
        if (! $src) {
            return '<div style="position:absolute;inset:0;background:'.$fallbackBg.';'.$extraStyle.'"></div>';
        }
        $fit  = ($options['photo_fit'] ?? 'contain') === 'cover' ? 'cover' : 'contain';
        $zoom = max(100, min(250, (int) ($options['photo_zoom'] ?? 100)));
        $x    = max(0, min(100, (int) ($options['photo_position_x'] ?? 50)));
        $y    = max(0, min(100, (int) ($options['photo_position_y'] ?? 50)));

        // When zoom > 100, express size as a percentage so DomPDF can scale
        // the background bitmap beyond `cover` semantics.
        $size = $zoom > 100 ? $zoom.'% auto' : $fit;

        return '<div style="position:absolute;inset:0;background:'.$fallbackBg.';background-image:url(\''.$this->esc($src).'\');'
            .'background-size:'.$size.';background-position:'.$x.'% '.$y.'%;background-repeat:no-repeat;'.$extraStyle.'"></div>';
    }

    /**
     * DomPDF resolves /storage/... paths against the public dir, but only if
     * we hand it a filesystem path or a fully-qualified URL. Convert relative
     * /storage/... refs to absolute filesystem paths so the image embeds.
     */
    protected function absolutePath(string $url): string
    {
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }
        if (str_starts_with($url, '/storage/')) {
            return public_path(substr($url, 1));
        }
        return $url;
    }

    /** Pull the selected stat rows out of the player, in the order chosen. */
    protected function statRows(Player $player, array $options): array
    {
        $catalogue = static::statCatalogue($player->category, $this->lang($options));
        $byKey = [];
        foreach ($catalogue as $row) {
            $byKey[$row['key']] = $row;
        }
        $selected = $options['selected_stats'] ?? [];
        if (empty($selected)) {
            // Fall back to a sensible default if nothing was selected.
            $selected = $player->category === 'Gardien'
                ? ['matches_played', 'clean_sheets', 'saves', 'pass_accuracy']
                : ['matches_played', 'goals', 'assists', 'xg'];
        }
        $rows = [];
        foreach ($selected as $key) {
            if (! isset($byKey[$key])) continue;
            $rows[] = [
                'label'  => $byKey[$key]['label'],
                'value'  => $player->{$key} ?? 0,
                'suffix' => $byKey[$key]['suffix'] ?? '',
            ];
        }
        // 4 is the cap that fits cleanly in every template layout (2x2 grid
        // in Classic, 4-tile strip in Magazine, 4-cell row in Minimal, KPI
        // strip in Stadium). The picker enforces the same limit.
        return array_slice($rows, 0, 4);
    }

    /**
     * Render the player's positioning as a proper football heatmap: an SVG
     * pitch with markings + soft radial blobs whose intensity comes from the
     * 4×6 heatmap_grid. Uses feGaussianBlur so the cells blend into believable
     * hotspots instead of a naked pixel grid. DomPDF v3 supports feGaussianBlur.
     */
    protected function heatmapHtml(Player $player, array $options): string
    {
        if (empty($options['show_heatmap'])) return '';
        $grid = $player->heatmap_grid;
        if (! is_array($grid) || count($grid) !== 4) return '';

        // DomPDF ignores `object-fit` and stretches images when both width and
        // height are set. Emit only a width (100% of parent) and let DomPDF
        // preserve the source PNG's 3:2 aspect ratio automatically - the
        // resulting on-page height ends up ~66% of whatever column width the
        // template gives us, which is what we want anyway.
        $png = base64_encode(HeatmapRenderer::png($grid));
        return '<img src="data:image/png;base64,'.$png.'" alt="" width="100%" style="display:block;border-radius:2mm;">';
    }

    /** Convert #rrggbb (or #rgb) to [r, g, b] ints. */
    protected function hexToRgbInts(string $hex): array
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
    }

    /** Convert hex + alpha into an rgba string DomPDF understands. */
    protected function rgba(string $hex, float $alpha): string
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        return "rgba($r,$g,$b,$alpha)";
    }

    protected function esc(?string $v): string
    {
        return e((string) $v);
    }

    /**
     * Resolves the font-family CSS declaration for the chosen pairing. All
     * three fall back to a bundled DomPDF family (DejaVu Sans / Serif) so the
     * PDF always renders even if the primary font is missing.
     *
     * - editorial : classic serif for traditional sporting directors
     * - sans      : neutral sans for corporate / modern envois
     * - grotesque : bold sans with tight tracking for sport-branded impact
     */
    protected function fontFamily(array $options): string
    {
        return match ($options['font_family'] ?? 'editorial') {
            'sans'      => "'Helvetica', 'DejaVu Sans', sans-serif",
            'grotesque' => "'Helvetica', 'DejaVu Sans', sans-serif",
            default     => "'Times', 'DejaVu Serif', serif",
        };
    }

    /** Extra letter-spacing baked in for `grotesque` for a tighter poster feel. */
    protected function fontTracking(array $options): string
    {
        return ($options['font_family'] ?? 'editorial') === 'grotesque'
            ? 'letter-spacing: -0.02em;' : '';
    }

    /** Base font-size multiplier for the chosen scale. */
    protected function fontScale(array $options): float
    {
        return match ($options['font_scale'] ?? 'normal') {
            'small' => 0.9,
            'large' => 1.1,
            default => 1.0,
        };
    }

    /** Scale a base pt value by the font_scale option, formatted as `<n>pt`. */
    protected function pt(float $basePt, array $options): string
    {
        return number_format($basePt * $this->fontScale($options), 1, '.', '').'pt';
    }

    /**
     * Central translation table for the labels every template hard-codes.
     * Only the fixed chrome is translated - free-form fields the admin types
     * (title, tagline, bio) stay as they were entered.
     */
    private const T = [
        'presentation_joueur' => ['fr' => 'Présentation joueur', 'en' => 'Player presentation', 'de' => 'Spielervorstellung', 'nl' => 'Spelerpresentatie'],
        'age'                 => ['fr' => 'Âge',                  'en' => 'Age',                 'de' => 'Alter',                'nl' => 'Leeftijd'],
        'date_of_birth'       => ['fr' => 'Date de naissance',     'en' => 'Date of birth',       'de' => 'Geburtsdatum',         'nl' => 'Geboortedatum'],
        'position'            => ['fr' => 'Poste',                'en' => 'Position',            'de' => 'Position',             'nl' => 'Positie'],
        'category'            => ['fr' => 'Catégorie',            'en' => 'Category',            'de' => 'Kategorie',            'nl' => 'Categorie'],
        'height'              => ['fr' => 'Taille',               'en' => 'Height',              'de' => 'Größe',                'nl' => 'Lengte'],
        'preferred_foot'      => ['fr' => 'Pied fort',            'en' => 'Preferred foot',      'de' => 'Starker Fuß',          'nl' => 'Voorkeurvoet'],
        'club'                => ['fr' => 'Club',                 'en' => 'Club',                'de' => 'Verein',               'nl' => 'Club'],
        'nationality'         => ['fr' => 'Nationalité',          'en' => 'Nationality',         'de' => 'Nationalität',         'nl' => 'Nationaliteit'],
        'years_old'           => ['fr' => 'ans',                  'en' => 'yrs',                 'de' => 'Jahre',                'nl' => 'jaar'],
        'zones_influence'     => ['fr' => "Zones d'influence",    'en' => 'Areas of influence',  'de' => 'Einflusszonen',        'nl' => 'Invloedszones'],
        'scout_summary'       => ['fr' => 'Résumé scout',         'en' => 'Scout summary',       'de' => 'Scout-Zusammenfassung', 'nl' => 'Scout samenvatting'],
        'scout_profile'       => ['fr' => 'Profil scout',         'en' => 'Scout profile',       'de' => 'Scout-Profil',         'nl' => 'Scout profiel'],
        'strengths'           => ['fr' => 'Points forts',         'en' => 'Strengths',           'de' => 'Stärken',              'nl' => 'Sterke punten'],
        'previous_clubs'      => ['fr' => 'Clubs précédents',     'en' => 'Previous clubs',      'de' => 'Frühere Vereine',      'nl' => 'Voormalige clubs'],
        'identity'            => ['fr' => 'Identité',             'en' => 'Identity',            'de' => 'Identität',            'nl' => 'Identiteit'],
        'article'             => ['fr' => 'ARTICLE',              'en' => 'ARTICLE',             'de' => 'ARTIKEL',              'nl' => 'ARTIKEL'],
        'video'               => ['fr' => 'VIDÉO',                'en' => 'VIDEO',               'de' => 'VIDEO',                'nl' => 'VIDEO'],
        'link'                => ['fr' => 'LIEN',                 'en' => 'LINK',                'de' => 'LINK',                 'nl' => 'LINK'],
        'scan_more'           => ['fr' => 'Scannez pour en voir plus', 'en' => 'Scan for more', 'de' => 'Für mehr scannen', 'nl' => 'Scan voor meer'],
        'partner_agency'      => ['fr' => 'En collaboration avec',     'en' => 'In collaboration with', 'de' => 'In Zusammenarbeit mit', 'nl' => 'In samenwerking met'],
        'partner_academies'   => ['fr' => 'Accès aux plus grandes académies européennes', 'en' => 'Access to top European academies', 'de' => 'Zugang zu Top-Akademien Europas', 'nl' => 'Toegang tot Europese topacademies'],
        'internal_document'   => ['fr' => 'Document interne',     'en' => 'Internal document',   'de' => 'Internes Dokument',    'nl' => 'Intern document'],
        'no_strengths'        => ['fr' => 'Aucun point fort renseigné sur la fiche joueur.', 'en' => 'No strengths listed on the player card.', 'de' => 'Keine Stärken auf der Spielerkarte hinterlegt.', 'nl' => 'Geen sterke punten opgegeven op de spelerskaart.'],
        'no_bio'              => ['fr' => 'Ajoutez une bio dans la fiche joueur pour enrichir cette présentation.', 'en' => 'Add a bio to the player card to enrich this presentation.', 'de' => 'Fügen Sie der Spielerkarte eine Biografie hinzu, um diese Präsentation zu bereichern.', 'nl' => 'Voeg een bio toe aan de spelerskaart om deze presentatie te verrijken.'],
        'no_bio_stadium'      => ['fr' => "Ajoutez une bio dans la fiche joueur pour enrichir cette présentation, ou attachez un article et une vidéo YouTube depuis l'éditeur.", 'en' => 'Add a bio on the player card, or attach an article and a YouTube video from the editor.', 'de' => 'Fügen Sie eine Biografie zur Spielerkarte hinzu oder verknüpfen Sie einen Artikel und ein YouTube-Video aus dem Editor.', 'nl' => 'Voeg een bio toe op de spelerskaart, of koppel een artikel en een YouTube-video vanuit de editor.'],
        'no_heatmap'          => ['fr' => "Activez la heatmap dans l'éditeur pour l'afficher ici.", 'en' => 'Enable the heatmap in the editor to display it here.', 'de' => 'Aktivieren Sie die Heatmap im Editor, um sie hier anzuzeigen.', 'nl' => 'Activeer de heatmap in de editor om hem hier weer te geven.'],

        // Physical KPIs + potential (used to fill space on the sober templates)
        'physical'          => ['fr' => 'Physique',          'en' => 'Physical',          'de' => 'Athletisch',      'nl' => 'Fysiek'],
        'potential'         => ['fr' => 'Potentiel',         'en' => 'Potential',         'de' => 'Potenzial',       'nl' => 'Potentieel'],
        'since'             => ['fr' => 'Depuis',            'en' => 'Since',             'de' => 'Seit',            'nl' => 'Sinds'],
        'comparisons'       => ['fr' => 'Comparaisons',      'en' => 'Comparisons',       'de' => 'Vergleiche',      'nl' => 'Vergelijkingen'],
        'phy_distance'      => ['fr' => 'Km / match',        'en' => 'Km / match',        'de' => 'Km / Spiel',      'nl' => 'Km / wedstrijd'],
        'phy_top_speed'     => ['fr' => 'Vitesse max',       'en' => 'Top speed',         'de' => 'Höchstgeschw.',   'nl' => 'Topsnelheid'],
        'phy_sprints'       => ['fr' => 'Sprints / match',   'en' => 'Sprints / match',   'de' => 'Sprints / Spiel', 'nl' => 'Sprints / match'],
        'phy_hir'           => ['fr' => 'Courses intensives', 'en' => 'High-intensity runs', 'de' => 'Intensivläufe', 'nl' => 'Intensieve loopjes'],

        // Positions catalogue
        'cat_gardien'      => ['fr' => 'Gardien',      'en' => 'Goalkeeper', 'de' => 'Torwart',           'nl' => 'Doelman'],
        'cat_defenseur'    => ['fr' => 'Défenseur',    'en' => 'Defender',   'de' => 'Verteidiger',       'nl' => 'Verdediger'],
        'cat_milieu'       => ['fr' => 'Milieu',       'en' => 'Midfielder', 'de' => 'Mittelfeldspieler', 'nl' => 'Middenvelder'],
        'cat_attaquant'    => ['fr' => 'Attaquant',    'en' => 'Forward',    'de' => 'Stürmer',           'nl' => 'Aanvaller'],
        'foot_droit'       => ['fr' => 'Droit',        'en' => 'Right',      'de' => 'Rechts',            'nl' => 'Rechts'],
        'foot_gauche'      => ['fr' => 'Gauche',       'en' => 'Left',       'de' => 'Links',             'nl' => 'Links'],
        'foot_ambidextre'  => ['fr' => 'Ambidextre',   'en' => 'Both',       'de' => 'Beidfüßig',         'nl' => 'Beidbenig'],

    ];

    protected function lang(array $options): string
    {
        $lang = $options['language'] ?? 'fr';
        return in_array($lang, ['fr', 'en', 'de', 'nl'], true) ? $lang : 'fr';
    }

    /** Translate a label into the presentation's chosen language. */
    protected function t(string $key, array $options): string
    {
        $lang = $this->lang($options);
        return self::T[$key][$lang] ?? self::T[$key]['fr'] ?? $key;
    }

    /** Player-category label localised. Falls back to the raw value when unknown. */
    protected function tCategory(?string $rawCategory, array $options): string
    {
        return match ($rawCategory) {
            'Gardien'    => $this->t('cat_gardien', $options),
            'Defenseur', 'Défenseur' => $this->t('cat_defenseur', $options),
            'Milieu'     => $this->t('cat_milieu', $options),
            'Attaquant'  => $this->t('cat_attaquant', $options),
            default      => (string) ($rawCategory ?? '-'),
        };
    }

    /** Preferred-foot label localised. */
    protected function tFoot(?string $rawFoot, array $options): string
    {
        return match ($rawFoot) {
            'Droit'      => $this->t('foot_droit', $options),
            'Gauche'     => $this->t('foot_gauche', $options),
            'Ambidextre' => $this->t('foot_ambidextre', $options),
            default      => (string) ($rawFoot ?? '-'),
        };
    }

    /**
     * Physical KPIs to display when the template has room. Each row is a
     * [translation_key, pre-formatted value string] tuple. Empty when the
     * player has no telemetry attached, so callers can skip the block.
     */
    protected function physiqueRows(Player $player): array
    {
        $rows = [];
        if ($player->distance_avg_km !== null)         $rows[] = ['phy_distance',  number_format((float) $player->distance_avg_km, 1, ',', '').' km'];
        if ($player->top_speed_kmh !== null)           $rows[] = ['phy_top_speed', number_format((float) $player->top_speed_kmh, 1, ',', '').' km/h'];
        if ($player->sprints_avg !== null)             $rows[] = ['phy_sprints',   (string) (int) $player->sprints_avg];
        if ($player->high_intensity_runs_avg !== null) $rows[] = ['phy_hir',       (string) (int) $player->high_intensity_runs_avg];
        return $rows;
    }

    /**
     * Player strengths flattened to a capped list of labels. Accepts either
     * strings or objects with a `label` key (both shapes exist in the seeder
     * / editor UI).
     */
    protected function strengthsList(Player $player, int $max = 5): array
    {
        $raw = is_array($player->strengths) ? $player->strengths : [];
        $out = [];
        foreach ($raw as $s) {
            $label = is_array($s) && isset($s['label']) ? $s['label'] : (is_string($s) ? $s : '');
            $label = trim((string) $label);
            if ($label === '') continue;
            $out[] = $label;
            if (count($out) >= $max) break;
        }
        return $out;
    }

    /**
     * Adaptive layout hints for the current player. Delegates to
     * AdaptiveLayout; kept as a template method so subclasses call it
     * without an extra import.
     *
     * @return array{
     *   richness:int,
     *   bio_variant:string,
     *   strengths_variant:string,
     *   physique_variant:string,
     *   comparisons_variant:string,
     * }
     */
    protected function layoutHints(Player $player): array
    {
        return AdaptiveLayout::hintsFor($player);
    }

    /**
     * Render Points forts in the requested variant. Variants:
     *   row   — inline chips (small footprint)
     *   grid  — 2-col grid of chips
     *   stack — vertical bulleted list (fills empty column)
     *   skip  — empty string
     *
     * `$style` lets each template pass its accent + text colours so the
     * output matches the surrounding chrome.
     *
     * @param array{accent:string, text:string, muted?:string, bg?:string} $style
     */
    protected function strengthsBlockHtml(Player $player, string $variant, array $style, string $title = 'Points forts'): string
    {
        if ($variant === 'skip') return '';
        $list = $this->strengthsList($player, $variant === 'stack' ? 8 : ($variant === 'grid' ? 6 : 4));
        if (empty($list)) return '';

        $accent = $style['accent'] ?? '#1e40af';
        $text   = $style['text']   ?? '#0c0a09';
        $muted  = $style['muted']  ?? '#78716c';

        $titleHtml = '<div style="font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;color:'.$muted.';font-weight:700;margin-bottom:2mm;">'.$this->esc($title).'</div>';

        if ($variant === 'row') {
            $chips = '';
            foreach ($list as $s) {
                $chips .= '<td style="padding:2mm 4mm;background:rgba(0,0,0,0.04);border-left:2px solid '.$accent.';font-size:8pt;font-weight:700;color:'.$text.';letter-spacing:0.5px;">'
                    .$this->esc($s).'</td><td style="width:2mm;"></td>';
            }
            return $titleHtml.'<table style="border-collapse:collapse;"><tr>'.$chips.'</tr></table>';
        }

        if ($variant === 'grid') {
            $rows = '';
            $chunks = array_chunk($list, 2);
            foreach ($chunks as $pair) {
                $rows .= '<tr>';
                foreach ($pair as $s) {
                    $rows .= '<td style="width:50%;padding:1.5mm 3mm 1.5mm 0;">'
                        .'<span style="display:inline-block;width:2.5mm;height:2.5mm;border-radius:1.25mm;background:'.$accent.';margin-right:2.5mm;vertical-align:middle;"></span>'
                        .'<span style="font-size:9pt;font-weight:600;color:'.$text.';">'.$this->esc($s).'</span>'
                        .'</td>';
                }
                if (count($pair) < 2) $rows .= '<td style="width:50%;"></td>';
                $rows .= '</tr>';
            }
            return $titleHtml.'<table style="width:100%;border-collapse:collapse;">'.$rows.'</table>';
        }

        // stack — vertical list, fills a column
        $items = '';
        foreach ($list as $s) {
            $items .= '<li style="padding:2.5mm 0;border-bottom:0.5px solid rgba(0,0,0,0.08);list-style:none;">'
                .'<span style="display:inline-block;width:2.5mm;height:2.5mm;border-radius:1.25mm;background:'.$accent.';margin-right:3mm;vertical-align:middle;"></span>'
                .'<span style="font-size:9.5pt;font-weight:600;color:'.$text.';">'.$this->esc($s).'</span>'
                .'</li>';
        }
        return $titleHtml.'<ul style="list-style:none;padding:0;margin:0;">'.$items.'</ul>';
    }

    /**
     * Render Physique in the requested variant. Variants:
     *   row   — 1x4 tuiles rangée
     *   grid2 — 2x2 tuiles carré (fills vertical space)
     *   stack — vertical stack with progress bars
     *   skip  — empty string
     *
     * @param array{accent:string, text:string, muted?:string, bg?:string} $style
     */
    protected function physiqueBlockHtml(Player $player, string $variant, array $style, array $options, string $title = 'Physique'): string
    {
        if ($variant === 'skip') return '';
        $rows = $this->physiqueRows($player);
        if (empty($rows)) return '';

        $accent = $style['accent'] ?? '#1e40af';
        $text   = $style['text']   ?? '#0c0a09';
        $muted  = $style['muted']  ?? '#78716c';
        $bg     = $style['bg']     ?? 'rgba(0,0,0,0.03)';

        $titleHtml = '<div style="font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;color:'.$muted.';font-weight:700;margin-bottom:2mm;">'.$this->esc($title).'</div>';

        if ($variant === 'row' || $variant === 'grid2') {
            $columns = $variant === 'grid2' ? 2 : count($rows);
            $chunks  = array_chunk($rows, $columns);
            $body = '';
            foreach ($chunks as $chunk) {
                $body .= '<tr>';
                foreach ($chunk as [$key, $value]) {
                    $body .= '<td style="text-align:center;padding:3mm 2mm;background:'.$bg.';border-left:2px solid '.$accent.';">'
                        .'<div style="font-size:14pt;font-weight:800;color:'.$text.';line-height:1;">'.$this->esc($value).'</div>'
                        .'<div style="font-size:6.5pt;color:'.$muted.';text-transform:uppercase;letter-spacing:1.5px;margin-top:1.5mm;">'.$this->esc($this->t($key, $options)).'</div>'
                        .'</td><td style="width:2mm;"></td>';
                }
                // Pad missing columns for square 2x2 alignment.
                for ($i = count($chunk); $i < $columns; $i++) $body .= '<td></td><td style="width:2mm;"></td>';
                $body .= '</tr>';
                if ($variant === 'grid2') $body .= '<tr><td colspan="'.($columns * 2).'" style="height:2mm;"></td></tr>';
            }
            return $titleHtml.'<table style="width:100%;border-collapse:collapse;">'.$body.'</table>';
        }

        // stack — vertical, one row per metric with a label and big value
        $items = '';
        foreach ($rows as [$key, $value]) {
            $items .= '<div style="display:table;width:100%;padding:2mm 0;border-bottom:0.5px solid rgba(0,0,0,0.08);">'
                .'<div style="display:table-cell;font-size:8pt;letter-spacing:1.5px;text-transform:uppercase;color:'.$muted.';vertical-align:middle;">'.$this->esc($this->t($key, $options)).'</div>'
                .'<div style="display:table-cell;text-align:right;font-size:14pt;font-weight:800;color:'.$accent.';vertical-align:middle;">'.$this->esc($value).'</div>'
                .'</div>';
        }
        return $titleHtml.$items;
    }

    /**
     * Render Comparaisons in the requested variant. Variants:
     *   row   — inline "Nom · Club" pairs (small footprint)
     *   stack — vertical rows with divider (fills column)
     *   skip  — empty
     *
     * @param array{accent:string, text:string, muted?:string} $style
     */
    protected function comparisonsBlockHtml(Player $player, string $variant, array $style, string $title = 'Comparaisons'): string
    {
        if ($variant === 'skip') return '';
        $raw = is_array($player->comparisons) ? $player->comparisons : [];
        $list = [];
        foreach ($raw as $c) {
            if (! is_array($c)) continue;
            $name = trim((string) ($c['name'] ?? ''));
            if ($name === '') continue;
            $list[] = ['name' => $name, 'club' => trim((string) ($c['club'] ?? ''))];
            if (count($list) >= ($variant === 'stack' ? 4 : 3)) break;
        }
        if (empty($list)) return '';

        $accent = $style['accent'] ?? '#1e40af';
        $text   = $style['text']   ?? '#0c0a09';
        $muted  = $style['muted']  ?? '#78716c';

        $titleHtml = '<div style="font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;color:'.$muted.';font-weight:700;margin-bottom:2mm;">'.$this->esc($title).'</div>';

        if ($variant === 'row') {
            $cells = [];
            foreach ($list as $c) {
                $cells[] = '<span style="font-size:9pt;font-weight:700;color:'.$text.';">'.$this->esc($c['name']).'</span>'
                    . ($c['club'] !== '' ? ' <span style="font-size:7pt;color:'.$muted.';">· '.$this->esc($c['club']).'</span>' : '');
            }
            return $titleHtml.'<div style="font-size:9pt;line-height:1.6;">'.implode(' &nbsp;·&nbsp; ', $cells).'</div>';
        }

        // stack — one row per comparison
        $rows = '';
        foreach ($list as $c) {
            $rows .= '<tr>'
                .'<td style="padding:2.5mm 0;border-bottom:0.5px solid rgba(0,0,0,0.08);font-size:9.5pt;font-weight:700;color:'.$text.';">'.$this->esc($c['name']).'</td>'
                .'<td style="padding:2.5mm 0;border-bottom:0.5px solid rgba(0,0,0,0.08);text-align:right;font-size:7.5pt;letter-spacing:1.5px;text-transform:uppercase;color:'.$muted.';">'.$this->esc($c['club']).'</td>'
                .'</tr>';
        }
        return $titleHtml.'<table style="width:100%;border-collapse:collapse;">'.$rows.'</table>';
    }

    /**
     * Column-friendly extras (Previous clubs + Article/Video QRs) rendered
     * as a compact VERTICAL block — meant to sit inside a template column
     * (typically the shorter one) so the content fills whitespace instead
     * of pushing to a second page.
     *
     * Returns empty string when no clubs / article / video are configured.
     * Legacy helper retained for future use; not currently wired into the
     * Marketing template.
     *
     * @param array{accent?:string, text?:string, muted?:string, bg?:string} $style
     */
    protected function columnExtrasHtml(array $options, array $style = []): string
    {
        $clubs = is_array($options['previous_clubs'] ?? null) ? $options['previous_clubs'] : [];
        $clubs = array_values(array_filter($clubs, static fn ($c) =>
            (isset($c['name']) && trim((string) $c['name']) !== '')
            || (isset($c['logo_url']) && trim((string) $c['logo_url']) !== '')
        ));

        $qrs = $this->qrTargets($options);
        if (empty($clubs) && empty($qrs)) return '';

        $accent = $style['accent'] ?? '#1e40af';
        $text   = $style['text']   ?? '#0c0a09';
        $muted  = $style['muted']  ?? '#78716c';

        $sectionTitle = fn (string $label) =>
            '<div style="font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;color:'.$muted.';font-weight:700;margin-bottom:2mm;">'.$this->esc($label).'</div>';

        $out = '';

        // Clubs list — vertical, cap 3 to keep the block short enough to
        // fit inside a column without pushing the whole doc row past the
        // page break.
        if (! empty($clubs)) {
            $rows = '';
            foreach (array_slice($clubs, 0, 3) as $c) {
                $name = trim((string) ($c['name'] ?? ''));
                $logo = $c['logo_url'] ?? null;
                $rows .= '<tr>'
                    .'<td style="width:10mm;padding:1.5mm 2mm 1.5mm 0;border-bottom:0.5px solid rgba(0,0,0,0.08);vertical-align:middle;">'
                    .($logo ? '<img src="'.$this->esc($this->absolutePath($logo)).'" alt="" style="height:7mm;max-width:10mm;object-fit:contain;">' : '')
                    .'</td>'
                    .'<td style="padding:1.5mm 0;border-bottom:0.5px solid rgba(0,0,0,0.08);font-size:8.5pt;font-weight:700;color:'.$text.';">'.$this->esc($name).'</td>'
                    .'</tr>';
            }
            $out .= $sectionTitle(mb_strtoupper($this->t('previous_clubs', $options)))
                .'<table style="width:100%;border-collapse:collapse;margin-bottom:3mm;">'.$rows.'</table>';
        }

        // QR codes for the resolved link targets — compact (40x40) so the
        // whole extras block stays under ~35mm even when several links are set.
        $linkRows = '';
        foreach ($qrs as $qr) {
            $linkRows .= '<tr>'
                .'<td style="width:14mm;padding:1.5mm 2mm 1.5mm 0;vertical-align:middle;">'
                .'<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data='.urlencode($qr['url']).'" width="40" height="40" style="background:#fff;padding:0.5mm;">'
                .'</td>'
                .'<td style="padding:1.5mm 0;font-size:7pt;letter-spacing:1.5px;color:'.$muted.';text-transform:uppercase;font-weight:700;vertical-align:middle;">'.$this->esc($this->t($qr['label_key'], $options)).'</td>'
                .'</tr>';
        }
        if ($linkRows !== '') {
            $out .= $sectionTitle(mb_strtoupper($this->t('scan_more', $options)))
                .'<table style="width:100%;border-collapse:collapse;">'.$linkRows.'</table>';
        }

        // No border-top / heavy padding here — a thin separator was pushing
        // the column past the doc-row height budget. Just a small margin
        // to keep the block visually distinct from the strengths list above.
        return $out !== '' ? '<div style="margin-top:4mm;">'.$out.'</div>' : '';
    }

    /**
     * Resolves the QR targets for a presentation. Priority:
     *   1. options.qr_custom_url — wins alone (single QR with "Lien" label)
     *   2. article_slug + youtube_url — the historic pair (rendered as-is)
     * Returns a list of ['url' => ..., 'label_key' => ...] where label_key
     * is a translation key resolved via $this->t().
     *
     * @return array<int, array{url:string, label_key:string}>
     */
    protected function qrTargets(array $options): array
    {
        $custom = trim((string) ($options['qr_custom_url'] ?? ''));
        if ($custom !== '') {
            return [['url' => $custom, 'label_key' => 'link']];
        }

        $out = [];
        $articleSlug = $options['article_slug'] ?? null;
        if ($articleSlug) {
            $article = \App\Models\Article::where('slug', $articleSlug)->first();
            if ($article) {
                $out[] = ['url' => url('/actualites/'.$article->slug), 'label_key' => 'article'];
            }
        }
        $youtube = trim((string) ($options['youtube_url'] ?? ''));
        if ($youtube !== '') {
            $out[] = ['url' => $youtube, 'label_key' => 'video'];
        }
        return $out;
    }

    /**
     * "En collaboration avec" block — small partner-agency card with logo,
     * name, country and flag. Returns '' when not configured so callers can
     * inline it unconditionally.
     */
    protected function partnerAgencyHtml(array $options, array $style = []): string
    {
        $pa = $options['partner_agency'] ?? null;
        if (! is_array($pa)) return '';
        $name = trim((string) ($pa['name'] ?? ''));
        $logo = trim((string) ($pa['logo_url'] ?? ''));
        $country = trim((string) ($pa['country'] ?? ''));
        $countryCode = trim((string) ($pa['country_code'] ?? ''));
        if ($name === '' && $logo === '' && $country === '') return '';

        $muted = $style['muted'] ?? '#78716c';
        $text  = $style['text']  ?? '#0c0a09';

        $flagHtml = '';
        if ($countryCode !== '') {
            // Flat, 24x18 CDN flags (SVG/PNG) — flagcdn.com serves both.
            $flagHtml = '<img src="https://flagcdn.com/w40/'.$this->esc(strtolower($countryCode)).'.png" width="16" height="12" style="vertical-align:middle;margin-right:1.5mm;">';
        }

        $logoHtml = $logo !== ''
            ? '<img src="'.$this->esc($this->absolutePath($logo)).'" alt="" style="height:8mm;max-width:26mm;object-fit:contain;">'
            : '';

        return '<div style="padding:2.5mm 3mm;">'
            .'<div style="font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;color:'.$muted.';font-weight:700;margin-bottom:1.5mm;">'
            .$this->esc(mb_strtoupper($this->t('partner_agency', $options)))
            .'</div>'
            .($logoHtml !== '' ? '<div style="margin-bottom:1.5mm;">'.$logoHtml.'</div>' : '')
            .($name !== '' ? '<div style="font-size:9pt;font-weight:700;color:'.$text.';margin-bottom:0.5mm;">'.$this->esc($name).'</div>' : '')
            .($country !== '' ? '<div style="font-size:7.5pt;color:'.$muted.';">'.$flagHtml.$this->esc(mb_strtoupper($country)).'</div>' : '')
            .'</div>';
    }

    /**
     * Partner-academies grid ("Accès aux plus grandes académies européennes"):
     * one column per country, each with a list of club logos + names. Empty
     * groups are skipped. Returns '' when nothing is configured.
     */
    protected function partnerAcademiesHtml(array $options, array $style = []): string
    {
        $groups = is_array($options['partner_academies'] ?? null) ? $options['partner_academies'] : [];
        $groups = array_values(array_filter($groups, static function ($g) {
            return is_array($g)
                && isset($g['clubs']) && is_array($g['clubs']) && count(array_filter($g['clubs'], static fn ($c) =>
                    is_array($c) && (
                        (isset($c['name']) && trim((string) $c['name']) !== '')
                        || (isset($c['logo_url']) && trim((string) $c['logo_url']) !== '')
                    )
                )) > 0;
        }));
        if (empty($groups)) return '';

        $accent = $style['accent'] ?? '#1e40af';
        $muted  = $style['muted']  ?? '#78716c';
        $text   = $style['text']   ?? '#0c0a09';

        $cols = '';
        foreach ($groups as $g) {
            $country = trim((string) ($g['country'] ?? ''));
            $clubsHtml = '';
            foreach ($g['clubs'] as $c) {
                $cname = trim((string) ($c['name'] ?? ''));
                $clogo = trim((string) ($c['logo_url'] ?? ''));
                if ($cname === '' && $clogo === '') continue;
                $img = $clogo !== ''
                    ? '<img src="'.$this->esc($this->absolutePath($clogo)).'" alt="" style="height:9mm;max-width:14mm;object-fit:contain;">'
                    : '<div style="height:9mm;line-height:9mm;font-size:6.5pt;font-weight:700;">'.$this->esc(strtoupper(mb_substr($cname, 0, 3))).'</div>';
                $clubsHtml .= '<div style="display:inline-block;text-align:center;padding:1.5mm 1.5mm;vertical-align:top;width:32%;">'
                    .$img
                    .'<div style="font-size:5.5pt;letter-spacing:0.5px;color:'.$text.';margin-top:1mm;text-transform:uppercase;font-weight:700;">'.$this->esc($cname).'</div>'
                    .'</div>';
            }
            $cols .= '<td style="vertical-align:top;padding:2mm 3mm;border-left:0.5px solid '.$muted.';">'
                .'<div style="font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;color:'.$accent.';font-weight:800;margin-bottom:2mm;text-align:center;">'.$this->esc(mb_strtoupper($country)).'</div>'
                .$clubsHtml
                .'</td>';
        }

        return '<div style="margin-top:4mm;">'
            .'<div style="font-size:7pt;letter-spacing:2.5px;text-transform:uppercase;color:'.$muted.';font-weight:800;margin-bottom:2mm;text-align:center;">'
            .$this->esc(mb_strtoupper($this->t('partner_academies', $options)))
            .'</div>'
            .'<table style="width:100%;border-collapse:collapse;table-layout:fixed;">'
            .'<tr>'.$cols.'</tr>'
            .'</table>'
            .'</div>';
    }

    /**
     * Truncate a free-form text at a max character count, appending "…" when
     * cut. Used to cap bios / scout notes that were saved before the frontend
     * character limit existed. Prevents a runaway string from silently
     * overflowing the target block.
     */
    protected function safeText(?string $raw, int $max): string
    {
        $s = trim((string) ($raw ?? ''));
        if ($s === '') return '';
        if (mb_strlen($s) <= $max) return $s;
        return rtrim(mb_substr($s, 0, $max - 1)).'…';
    }

    /**
     * Compact "extras" band shared by Classic / Magazine / Minimal:
     * a row of previous-club chips + QR codes for the article and YouTube
     * links when set. Returns empty string when nothing is configured, so
     * templates can concatenate it unconditionally.
     *
     * The visual is deliberately light on styling because the exact background
     * / colour changes per template - the wrapper class lets each template
     * theme its own copy.
     *
     * @param array{light?: bool, accent?: string, secondary?: string} $style
     */
    protected function extrasBlockHtml(array $options, array $style = []): string
    {
        $clubs = is_array($options['previous_clubs'] ?? null) ? $options['previous_clubs'] : [];

        // Trim empty club entries.
        $clubs = array_values(array_filter($clubs, static fn ($c) =>
            (isset($c['name']) && trim((string) $c['name']) !== '')
            || (isset($c['logo_url']) && trim((string) $c['logo_url']) !== '')
        ));

        $qrs = $this->qrTargets($options);
        if (empty($clubs) && empty($qrs)) return '';

        $accent    = $style['accent']    ?? ($options['accent_color']    ?? '#1e40af');
        $secondary = $style['secondary'] ?? ($options['secondary_color'] ?? '#a8a29e');
        $bg        = $style['bg']        ?? 'transparent';
        $textColor = $style['text']      ?? ($options['text_color'] ?? '#0c0a09');

        // Clubs cell: horizontal row of logos / names.
        $clubsInnerCells = '';
        foreach ($clubs as $c) {
            $name = $c['name'] ?? '';
            $logo = $c['logo_url'] ?? null;
            $inner = $logo
                ? '<img src="'.$this->esc($this->absolutePath($logo)).'" alt="" width="60" height="30" style="height:10mm;max-width:20mm;object-fit:contain;">'
                : '<span style="font-weight:700;font-size:8pt;letter-spacing:1px;">'.$this->esc(strtoupper($name)).'</span>';
            $clubsInnerCells .= '<td style="text-align:center;padding:0 3mm;vertical-align:middle;">'.$inner.'</td>';
        }
        $clubsCell = '';
        if ($clubsInnerCells !== '') {
            $clubsCell = '<td style="vertical-align:middle;padding:0;">'
                .'<div style="font-size:6.5pt;letter-spacing:3px;text-transform:uppercase;color:'.$secondary.';margin-bottom:2mm;font-weight:700;">'.$this->esc(strtoupper($this->t('previous_clubs', $options))).'</div>'
                .'<table style="border-collapse:collapse;"><tr>'.$clubsInnerCells.'</tr></table>'
                .'</td>';
        } else {
            $clubsCell = '<td style="vertical-align:middle;">&nbsp;</td>';
        }

        // QR codes are requested at a smaller pixel size so DomPDF's default
        // 96dpi lookup lands close to the intended 12mm print size instead of
        // upscaling to ~42mm. Explicit width/height attrs harden the sizing.
        $qrCells = '';
        foreach ($qrs as $qr) {
            $qrCells .= '<td style="width:24mm;text-align:center;vertical-align:middle;padding-left:5mm;">'
                .'<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data='.urlencode($qr['url']).'" width="46" height="46" style="background:#fff;padding:1mm;">'
                .'<div style="font-size:6pt;letter-spacing:2px;color:'.$secondary.';margin-top:1.5mm;font-weight:700;">'.$this->esc($this->t($qr['label_key'], $options)).'</div>'
                .'</td>';
        }

        // Single-table row keeps clubs + QR cells locked side by side. DomPDF
        // renders tables far more reliably than flex, so the whole strip stays
        // on one line and never spills to a second page.
        return '<table style="width:100%;margin-top:3mm;border-top:0.5px solid '.$secondary.';border-bottom:0.5px solid '.$secondary.';background:'.$bg.';color:'.$textColor.';border-collapse:collapse;">'
            .'<tr><td style="padding:3mm 4mm;">'
            .'<table style="width:100%;border-collapse:collapse;"><tr>'.$clubsCell.$qrCells.'</tr></table>'
            .'</td></tr></table>';
    }
}