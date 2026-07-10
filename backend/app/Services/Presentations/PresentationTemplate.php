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
     * Render an `<img>` wrapped in an overflow-hidden frame using the cropping
     * options. Returns plain string HTML for templates to drop into their
     * layouts. Default fit is `contain` so the whole photo is always visible;
     * the fallback background shows through any letterboxing.
     */
    protected function photoFrame(?string $src, array $options, string $fallbackBg, string $extraStyle = ''): string
    {
        if (! $src) {
            return '<div style="position:absolute;inset:0;background:'.$fallbackBg.';'.$extraStyle.'"></div>';
        }
        $css = $this->photoCss($options);
        return '<div style="position:absolute;inset:0;overflow:hidden;background:'.$fallbackBg.';'.$extraStyle.'">'
            .'<img src="'.$this->esc($src).'" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;'
            .'object-fit:'.$css['object_fit'].';object-position:'.$css['object_position'].';'.$css['transform'].'">'
            .'</div>';
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

        // Viewport: 300×200 → aspect 3:2 (typical football pitch orientation).
        // Cells: 6 cols × 4 rows → each cell is 50×50 in viewBox units.
        // Each blob is a soft radial gradient (yellow → orange → red ramp)
        // rather than a filter-blurred circle - DomPDF renders SVG radial
        // gradients reliably, but `feGaussianBlur` and `<pattern>` are flaky.
        $gradients = '';
        $blobs = '';
        $index = 0;
        foreach ($grid as $rowI => $row) {
            foreach ($row as $colI => $v) {
                $v = max(0, min(100, (int) $v));
                if ($v < 5) continue;
                $cx = $colI * 50 + 25;
                $cy = $rowI * 50 + 25;
                $r  = 32 + ($v / 100) * 12;
                $core = number_format(min(0.85, 0.35 + ($v / 100) * 0.5), 3, '.', '');
                $mid  = number_format(min(0.60, 0.20 + ($v / 100) * 0.4), 3, '.', '');
                $color = $this->heatColor($v);
                $gid = 'hb'.$index;
                $gradients .= '<radialGradient id="'.$gid.'" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">'
                    .'<stop offset="0%" stop-color="'.$color.'" stop-opacity="'.$core.'"/>'
                    .'<stop offset="55%" stop-color="'.$color.'" stop-opacity="'.$mid.'"/>'
                    .'<stop offset="100%" stop-color="'.$color.'" stop-opacity="0"/>'
                    .'</radialGradient>';
                $blobs .= '<circle cx="'.$cx.'" cy="'.$cy.'" r="'.$r.'" fill="url(#'.$gid.')"/>';
                $index++;
            }
        }

        $stroke = 'rgba(255,255,255,0.22)';
        // DomPDF quirks:
        //   1. `height:auto` on inline SVG renders as zero-height, so the
        //      wrapping div sets an explicit mm height that DomPDF honours.
        //   2. Some builds ignore `mm` inside SVG attributes but respect it
        //      on CSS width/height on the parent, hence the two-layer setup.
        $heightMm = isset($options['_heatmap_height_mm']) ? (int) $options['_heatmap_height_mm'] : 62;
        return <<<SVG
<div style="position:relative;width:100%;height:{$heightMm}mm;overflow:hidden;border-radius:2mm;">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" preserveAspectRatio="none" width="100%" height="100%" style="display:block;position:absolute;top:0;left:0;">
  <defs>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0e3f22"/>
      <stop offset="100%" stop-color="#082616"/>
    </linearGradient>
    {$gradients}
  </defs>

  <!-- Turf -->
  <rect x="0" y="0" width="300" height="200" fill="url(#grass)"/>

  <!-- Pitch markings -->
  <rect x="1" y="1" width="298" height="198" fill="none" stroke="{$stroke}" stroke-width="1"/>
  <line x1="150" y1="1" x2="150" y2="199" stroke="{$stroke}" stroke-width="1"/>
  <circle cx="150" cy="100" r="22" fill="none" stroke="{$stroke}" stroke-width="1"/>
  <circle cx="150" cy="100" r="1.2" fill="{$stroke}"/>
  <rect x="1"   y="55" width="42" height="90" fill="none" stroke="{$stroke}" stroke-width="1"/>
  <rect x="1"   y="80" width="14" height="40" fill="none" stroke="{$stroke}" stroke-width="1"/>
  <circle cx="30"  cy="100" r="1.2" fill="{$stroke}"/>
  <rect x="257" y="55" width="42" height="90" fill="none" stroke="{$stroke}" stroke-width="1"/>
  <rect x="285" y="80" width="14" height="40" fill="none" stroke="{$stroke}" stroke-width="1"/>
  <circle cx="270" cy="100" r="1.2" fill="{$stroke}"/>

  <!-- Heat blobs (each a soft radial gradient) -->
  {$blobs}
</svg>
</div>
SVG;
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
}