<?php

namespace App\Services\Presentations;

use App\Models\Player;

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
            'accent_color'    => '#0f5132',
            'secondary_color' => '#84b896',
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
        $labels = [
            'matches_played'     => self::T['st_matches_played'][$lang]     ?? self::T['st_matches_played']['fr'],
            'minutes_played'     => self::T['st_minutes_played'][$lang]     ?? self::T['st_minutes_played']['fr'],
            'clean_sheets'       => self::T['st_clean_sheets'][$lang]       ?? self::T['st_clean_sheets']['fr'],
            'saves'              => self::T['st_saves'][$lang]              ?? self::T['st_saves']['fr'],
            'pass_accuracy'      => self::T['st_pass_accuracy'][$lang]      ?? self::T['st_pass_accuracy']['fr'],
            'yellow_cards'       => self::T['st_yellow_cards'][$lang]       ?? self::T['st_yellow_cards']['fr'],
            'goals'              => self::T['st_goals'][$lang]              ?? self::T['st_goals']['fr'],
            'assists'            => self::T['st_assists'][$lang]            ?? self::T['st_assists']['fr'],
            'xg'                 => self::T['st_xg'][$lang]                 ?? self::T['st_xg']['fr'],
            'xa'                 => self::T['st_xa'][$lang]                 ?? self::T['st_xa']['fr'],
            'key_passes'         => self::T['st_key_passes'][$lang]         ?? self::T['st_key_passes']['fr'],
            'shots_on_target'    => self::T['st_shots_on_target'][$lang]    ?? self::T['st_shots_on_target']['fr'],
            'dribbles_completed' => self::T['st_dribbles_completed'][$lang] ?? self::T['st_dribbles_completed']['fr'],
            'tackles'            => self::T['st_tackles'][$lang]            ?? self::T['st_tackles']['fr'],
            'interceptions'      => self::T['st_interceptions'][$lang]      ?? self::T['st_interceptions']['fr'],
            'duels_won'          => self::T['st_duels_won'][$lang]          ?? self::T['st_duels_won']['fr'],
        ];

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
        $png = $this->buildHeatmapPng($grid);
        return '<img src="data:image/png;base64,'.$png.'" alt="" width="100%" style="display:block;border-radius:2mm;">';
    }

    /**
     * Rasterise a 4×6 heatmap_grid into a football-pitch PNG (base64). Draws
     * turf gradient + pitch markings via GD primitives, then paints radial
     * blobs pixel-by-pixel with a continuous ease-out alpha falloff so the
     * result is genuinely smooth (concentric imagefilledellipse would band).
     */
    private function buildHeatmapPng(array $grid): string
    {
        // 600×400 keeps per-pixel PHP work under a second while staying above
        // typical PDF embed resolution. imagecopyresampled would upscale it if
        // higher DPI were ever needed.
        $W = 600;
        $H = 400;
        $img = imagecreatetruecolor($W, $H);
        imagealphablending($img, true);
        imagesavealpha($img, true);
        imageantialias($img, true);

        // Turf gradient (top to bottom).
        for ($y = 0; $y < $H; $y++) {
            $t = $y / $H;
            $r = (int) round(14 + (8 - 14)  * $t);
            $g = (int) round(63 + (38 - 63) * $t);
            $b = (int) round(34 + (22 - 34) * $t);
            $c = imagecolorallocate($img, $r, $g, $b);
            imageline($img, 0, $y, $W, $y, $c);
        }

        // Pitch markings - white lines at ~22% alpha.
        $stroke = imagecolorallocatealpha($img, 255, 255, 255, 99);
        imagesetthickness($img, 2);
        imagerectangle($img, 4, 4, $W - 4, $H - 4, $stroke);
        imageline($img, (int) ($W / 2), 4, (int) ($W / 2), $H - 4, $stroke);
        imageellipse($img, (int) ($W / 2), (int) ($H / 2), 130, 130, $stroke);
        imagefilledellipse($img, (int) ($W / 2), (int) ($H / 2), 7, 7, $stroke);
        // Left penalty
        imagerectangle($img, 4, (int) ($H * 0.275), (int) ($W * 0.14),  (int) ($H * 0.725), $stroke);
        imagerectangle($img, 4, (int) ($H * 0.4),   (int) ($W * 0.047), (int) ($H * 0.6),   $stroke);
        imagefilledellipse($img, (int) ($W * 0.10), (int) ($H / 2), 7, 7, $stroke);
        // Right penalty
        imagerectangle($img, (int) ($W * 0.86),  (int) ($H * 0.275), $W - 4, (int) ($H * 0.725), $stroke);
        imagerectangle($img, (int) ($W * 0.953), (int) ($H * 0.4),   $W - 4, (int) ($H * 0.6),   $stroke);
        imagefilledellipse($img, (int) ($W * 0.90), (int) ($H / 2), 7, 7, $stroke);

        // Pre-collect blobs with pre-computed radii and RGB tuples so the
        // inner loop stays tight.
        $blobs = [];
        foreach ($grid as $rowI => $row) {
            foreach ($row as $colI => $raw) {
                $v = max(0, min(100, (int) $raw));
                if ($v < 5) continue;
                $cx   = (int) round($colI * ($W / 6) + $W / 12);
                $cy   = (int) round($rowI * ($H / 4) + $H / 8);
                // Slightly larger than half a cell so adjacent blobs overlap
                // and blend into continuous hotspot regions like the preview.
                $maxR = 75 + ($v / 100) * 30;                        // 75..105 in target space
                $rgb  = $this->hexToRgbInts($this->heatColor($v));
                // Peak overlay strength at the centre (0..1). Higher intensity → more opaque core.
                $peak = min(0.9, 0.35 + ($v / 100) * 0.55);
                $blobs[] = [$cx, $cy, $maxR, $rgb[0], $rgb[1], $rgb[2], $peak];
            }
        }

        // Pixel-by-pixel blend for every blob. Truecolor images accept raw
        // packed ints from imagecolorat / imagesetpixel, so we bypass palette
        // allocation entirely.
        foreach ($blobs as [$cx, $cy, $maxR, $br, $bg, $bb, $peak]) {
            $rSq = $maxR * $maxR;
            $x0 = max(0, (int) floor($cx - $maxR));
            $x1 = min($W - 1, (int) ceil($cx + $maxR));
            $y0 = max(0, (int) floor($cy - $maxR));
            $y1 = min($H - 1, (int) ceil($cy + $maxR));

            for ($py = $y0; $py <= $y1; $py++) {
                $dy = $py - $cy;
                $dy2 = $dy * $dy;
                for ($px = $x0; $px <= $x1; $px++) {
                    $dx = $px - $cx;
                    $d2 = $dx * $dx + $dy2;
                    if ($d2 > $rSq) continue;

                    // Two-stop falloff mirroring the preview SVG (peak at
                    // centre, ~70% of peak at 55% of the radius, 0 at edge).
                    // Gives wide, overlapping hotspots instead of tight dots.
                    $t = sqrt($d2) / $maxR;                          // 0 at centre, 1 at edge
                    if ($t < 0.55) {
                        $falloff = 1 - 0.3 * ($t / 0.55);            // 1.00 → 0.70
                    } else {
                        $falloff = 0.7 * (1 - ($t - 0.55) / 0.45);   // 0.70 → 0
                    }
                    $a = $peak * $falloff;                           // 0..peak
                    if ($a <= 0.005) continue;

                    // Read current pixel (truecolor packed).
                    $existing = imagecolorat($img, $px, $py);
                    $er = ($existing >> 16) & 0xFF;
                    $eg = ($existing >> 8) & 0xFF;
                    $eb = $existing & 0xFF;

                    // Standard "over" alpha compositing.
                    $nr = (int) round($br * $a + $er * (1 - $a));
                    $ng = (int) round($bg * $a + $eg * (1 - $a));
                    $nb = (int) round($bb * $a + $eb * (1 - $a));

                    $packed = ($nr << 16) | ($ng << 8) | $nb;
                    imagesetpixel($img, $px, $py, $packed);
                }
            }
        }

        ob_start();
        imagepng($img);
        $data = ob_get_clean();
        imagedestroy($img);
        return base64_encode($data);
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

    /**
     * Map a 0-100 intensity to the standard football heatmap ramp
     * (yellow → orange → red → deep red), returned as a #rrggbb string.
     * Independent of the template accent so blobs are always visible on the
     * green pitch.
     */
    protected function heatColor(int $v): string
    {
        $v = max(0, min(100, $v));
        // Four stops: 0=yellow, 33=orange, 66=red, 100=deep red.
        $stops = [
            [0.00, 250, 204,  21],   // #facc15 yellow
            [0.33, 249, 115,  22],   // #f97316 orange
            [0.66, 239,  68,  68],   // #ef4444 red
            [1.00, 190,  18,  60],   // #be123c deep red / crimson
        ];
        $t = $v / 100;
        for ($i = 0; $i < count($stops) - 1; $i++) {
            [$t0, $r0, $g0, $b0] = $stops[$i];
            [$t1, $r1, $g1, $b1] = $stops[$i + 1];
            if ($t >= $t0 && $t <= $t1) {
                $ratio = $t1 === $t0 ? 0 : ($t - $t0) / ($t1 - $t0);
                $r = (int) round($r0 + ($r1 - $r0) * $ratio);
                $g = (int) round($g0 + ($g1 - $g0) * $ratio);
                $b = (int) round($b0 + ($b1 - $b0) * $ratio);
                return sprintf('#%02x%02x%02x', $r, $g, $b);
            }
        }
        return '#be123c';
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
        'scan_more'           => ['fr' => 'Scannez pour en voir plus', 'en' => 'Scan for more', 'de' => 'Für mehr scannen', 'nl' => 'Scan voor meer'],
        'internal_document'   => ['fr' => 'Document interne',     'en' => 'Internal document',   'de' => 'Internes Dokument',    'nl' => 'Intern document'],
        'no_strengths'        => ['fr' => 'Aucun point fort renseigné sur la fiche joueur.', 'en' => 'No strengths listed on the player card.', 'de' => 'Keine Stärken auf der Spielerkarte hinterlegt.', 'nl' => 'Geen sterke punten opgegeven op de spelerskaart.'],
        'no_bio'              => ['fr' => 'Ajoutez une bio dans la fiche joueur pour enrichir cette présentation.', 'en' => 'Add a bio to the player card to enrich this presentation.', 'de' => 'Fügen Sie der Spielerkarte eine Biografie hinzu, um diese Präsentation zu bereichern.', 'nl' => 'Voeg een bio toe aan de spelerskaart om deze presentatie te verrijken.'],
        'no_bio_stadium'      => ['fr' => "Ajoutez une bio dans la fiche joueur pour enrichir cette présentation, ou attachez un article et une vidéo YouTube depuis l'éditeur.", 'en' => 'Add a bio on the player card, or attach an article and a YouTube video from the editor.', 'de' => 'Fügen Sie eine Biografie zur Spielerkarte hinzu oder verknüpfen Sie einen Artikel und ein YouTube-Video aus dem Editor.', 'nl' => 'Voeg een bio toe op de spelerskaart, of koppel een artikel en een YouTube-video vanuit de editor.'],
        'no_heatmap'          => ['fr' => "Activez la heatmap dans l'éditeur pour l'afficher ici.", 'en' => 'Enable the heatmap in the editor to display it here.', 'de' => 'Aktivieren Sie die Heatmap im Editor, um sie hier anzuzeigen.', 'nl' => 'Activeer de heatmap in de editor om hem hier weer te geven.'],

        // Positions catalogue
        'cat_gardien'      => ['fr' => 'Gardien',      'en' => 'Goalkeeper', 'de' => 'Torwart',           'nl' => 'Doelman'],
        'cat_defenseur'    => ['fr' => 'Défenseur',    'en' => 'Defender',   'de' => 'Verteidiger',       'nl' => 'Verdediger'],
        'cat_milieu'       => ['fr' => 'Milieu',       'en' => 'Midfielder', 'de' => 'Mittelfeldspieler', 'nl' => 'Middenvelder'],
        'cat_attaquant'    => ['fr' => 'Attaquant',    'en' => 'Forward',    'de' => 'Stürmer',           'nl' => 'Aanvaller'],
        'foot_droit'       => ['fr' => 'Droit',        'en' => 'Right',      'de' => 'Rechts',            'nl' => 'Rechts'],
        'foot_gauche'      => ['fr' => 'Gauche',       'en' => 'Left',       'de' => 'Links',             'nl' => 'Links'],
        'foot_ambidextre'  => ['fr' => 'Ambidextre',   'en' => 'Both',       'de' => 'Beidfüßig',         'nl' => 'Beidbenig'],

        // Stat labels
        'st_matches_played'     => ['fr' => 'Matchs joués',      'en' => 'Matches',         'de' => 'Spiele',            'nl' => 'Wedstrijden'],
        'st_minutes_played'     => ['fr' => 'Minutes',           'en' => 'Minutes',         'de' => 'Minuten',           'nl' => 'Minuten'],
        'st_goals'              => ['fr' => 'Buts',              'en' => 'Goals',           'de' => 'Tore',              'nl' => 'Doelpunten'],
        'st_assists'            => ['fr' => 'Passes décisives',  'en' => 'Assists',         'de' => 'Vorlagen',          'nl' => 'Assists'],
        'st_xg'                 => ['fr' => 'xG',                'en' => 'xG',              'de' => 'xG',                'nl' => 'xG'],
        'st_xa'                 => ['fr' => 'xA',                'en' => 'xA',              'de' => 'xA',                'nl' => 'xA'],
        'st_key_passes'         => ['fr' => 'Passes clés',       'en' => 'Key passes',      'de' => 'Schlüsselpässe',    'nl' => 'Sleutelpasses'],
        'st_pass_accuracy'      => ['fr' => '% passes',          'en' => 'Pass %',          'de' => 'Pass %',            'nl' => 'Pass %'],
        'st_shots_on_target'    => ['fr' => 'Tirs cadrés',       'en' => 'Shots on target', 'de' => 'Schüsse aufs Tor',  'nl' => 'Schoten op doel'],
        'st_dribbles_completed' => ['fr' => 'Dribbles réussis',  'en' => 'Dribbles',        'de' => 'Dribblings',        'nl' => 'Dribbels'],
        'st_tackles'            => ['fr' => 'Tacles',            'en' => 'Tackles',         'de' => 'Tacklings',         'nl' => 'Tackles'],
        'st_interceptions'      => ['fr' => 'Interceptions',     'en' => 'Interceptions',   'de' => 'Abfangungen',       'nl' => 'Onderscheppingen'],
        'st_duels_won'          => ['fr' => 'Duels gagnés',      'en' => 'Duels won',       'de' => 'Gewonnene Duelle',  'nl' => 'Duels gewonnen'],
        'st_yellow_cards'       => ['fr' => 'Cartons jaunes',    'en' => 'Yellow cards',    'de' => 'Gelbe Karten',      'nl' => 'Gele kaarten'],
        'st_clean_sheets'       => ['fr' => 'Clean sheets',      'en' => 'Clean sheets',    'de' => 'Zu-Null-Spiele',    'nl' => 'Clean sheets'],
        'st_saves'              => ['fr' => 'Arrêts',            'en' => 'Saves',           'de' => 'Paraden',           'nl' => 'Reddingen'],
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
        $articleSlug = $options['article_slug'] ?? null;
        $youtubeUrl  = $options['youtube_url'] ?? null;

        // Trim empty club entries.
        $clubs = array_values(array_filter($clubs, static fn ($c) =>
            (isset($c['name']) && trim((string) $c['name']) !== '')
            || (isset($c['logo_url']) && trim((string) $c['logo_url']) !== '')
        ));

        $articleUrl = null;
        if ($articleSlug) {
            $article = \App\Models\Article::where('slug', $articleSlug)->first();
            if ($article) $articleUrl = url('/actualites/'.$article->slug);
        }

        if (empty($clubs) && ! $articleUrl && ! $youtubeUrl) return '';

        $accent    = $style['accent']    ?? ($options['accent_color']    ?? '#0f5132');
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
        if ($articleUrl) {
            $qrCells .= '<td style="width:24mm;text-align:center;vertical-align:middle;padding-left:5mm;">'
                .'<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data='.urlencode($articleUrl).'" width="46" height="46" style="background:#fff;padding:1mm;">'
                .'<div style="font-size:6pt;letter-spacing:2px;color:'.$secondary.';margin-top:1.5mm;font-weight:700;">'.$this->esc($this->t('article', $options)).'</div>'
                .'</td>';
        }
        if ($youtubeUrl) {
            $qrCells .= '<td style="width:24mm;text-align:center;vertical-align:middle;padding-left:5mm;">'
                .'<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data='.urlencode($youtubeUrl).'" width="46" height="46" style="background:#fff;padding:1mm;">'
                .'<div style="font-size:6pt;letter-spacing:2px;color:'.$secondary.';margin-top:1.5mm;font-weight:700;">'.$this->esc($this->t('video', $options)).'</div>'
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