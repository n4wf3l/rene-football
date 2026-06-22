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
        $zoom = max(100, min(250, (int) ($options['photo_zoom'] ?? 100)));
        $x    = max(0, min(100, (int) ($options['photo_position_x'] ?? 50)));
        $y    = max(0, min(100, (int) ($options['photo_position_y'] ?? 50)));
        $scale = number_format($zoom / 100, 3, '.', '');
        return [
            'object_position' => "{$x}% {$y}%",
            'transform'       => $zoom > 100 ? "transform: scale({$scale}); transform-origin: {$x}% {$y}%;" : '',
            'background_pos'  => "{$x}% {$y}%",
            'background_size' => $zoom > 100 ? "{$zoom}% auto" : 'cover',
        ];
    }

    /**
     * Render an `<img>` wrapped in an overflow-hidden frame using the cropping
     * options. Returns plain string HTML for templates to drop into their
     * layouts.
     */
    protected function photoFrame(?string $src, array $options, string $fallbackBg, string $extraStyle = ''): string
    {
        if (! $src) {
            return '<div style="position:absolute;inset:0;background:'.$fallbackBg.';'.$extraStyle.'"></div>';
        }
        $css = $this->photoCss($options);
        return '<div style="position:absolute;inset:0;overflow:hidden;'.$extraStyle.'">'
            .'<img src="'.$this->esc($src).'" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;'
            .'object-fit:cover;object-position:'.$css['object_position'].';'.$css['transform'].'">'
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
        return array_slice($rows, 0, 6);
    }

    /**
     * Produce a 4x6 grid of coloured cells (HTML table) representing the
     * heatmap. Returns empty string when the option is off.
     */
    protected function heatmapHtml(Player $player, array $options): string
    {
        if (empty($options['show_heatmap'])) return '';
        $grid = $player->heatmap_grid;
        if (! is_array($grid) || count($grid) !== 4) return '';

        $cells = '';
        foreach ($grid as $row) {
            $cells .= '<tr>';
            foreach ($row as $v) {
                $v = max(0, min(100, (int) $v));
                $alpha = number_format($v / 100, 2, '.', '');
                $accent = $options['accent_color'] ?? '#0f5132';
                $cells .= '<td style="background:'.$this->rgba($accent, (float)$alpha).';"></td>';
            }
            $cells .= '</tr>';
        }
        return '<table class="heatmap"><tbody>'.$cells.'</tbody></table>';
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