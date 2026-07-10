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
    public static function statCatalogue(string $category): array
    {
        if ($category === 'Gardien') {
            return [
                ['key' => 'matches_played', 'label' => 'Matchs joués'],
                ['key' => 'minutes_played', 'label' => 'Minutes'],
                ['key' => 'clean_sheets',   'label' => 'Clean sheets'],
                ['key' => 'saves',          'label' => 'Arrêts'],
                ['key' => 'pass_accuracy',  'label' => '% passes', 'suffix' => '%'],
                ['key' => 'yellow_cards',   'label' => 'Cartons jaunes'],
            ];
        }
        return [
            ['key' => 'matches_played',     'label' => 'Matchs joués'],
            ['key' => 'minutes_played',     'label' => 'Minutes'],
            ['key' => 'goals',              'label' => 'Buts'],
            ['key' => 'assists',            'label' => 'Passes décisives'],
            ['key' => 'xg',                 'label' => 'xG'],
            ['key' => 'xa',                 'label' => 'xA'],
            ['key' => 'key_passes',         'label' => 'Passes clés'],
            ['key' => 'pass_accuracy',      'label' => '% passes', 'suffix' => '%'],
            ['key' => 'shots_on_target',    'label' => 'Tirs cadrés'],
            ['key' => 'dribbles_completed', 'label' => 'Dribbles réussis'],
            ['key' => 'tackles',            'label' => 'Tacles'],
            ['key' => 'interceptions',      'label' => 'Interceptions'],
            ['key' => 'duels_won',          'label' => 'Duels gagnés'],
            ['key' => 'yellow_cards',       'label' => 'Cartons jaunes'],
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
        $catalogue = static::statCatalogue($player->category);
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

        // DomPDF's SVG renderer silently drops radialGradient / linearGradient
        // in several installs. Rasterising to a PNG via GD is the only fully
        // reliable path. We render at 900x600 (3:2), embed as a data URI, and
        // let DomPDF paint it inside the fixed-size wrapper.
        $png = $this->buildHeatmapPng($grid);
        $heightMm = isset($options['_heatmap_height_mm']) ? (int) $options['_heatmap_height_mm'] : 62;
        return '<img src="data:image/png;base64,'.$png.'" alt="" style="width:100%;height:'.$heightMm.'mm;object-fit:cover;display:block;border-radius:2mm;">';
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
                .'<div style="font-size:6.5pt;letter-spacing:3px;text-transform:uppercase;color:'.$secondary.';margin-bottom:2mm;font-weight:700;">Clubs précédents</div>'
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
                .'<div style="font-size:6pt;letter-spacing:2px;color:'.$secondary.';margin-top:1.5mm;font-weight:700;">ARTICLE</div>'
                .'</td>';
        }
        if ($youtubeUrl) {
            $qrCells .= '<td style="width:24mm;text-align:center;vertical-align:middle;padding-left:5mm;">'
                .'<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data='.urlencode($youtubeUrl).'" width="46" height="46" style="background:#fff;padding:1mm;">'
                .'<div style="font-size:6pt;letter-spacing:2px;color:'.$secondary.';margin-top:1.5mm;font-weight:700;">VIDÉO</div>'
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