<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

/**
 * Renders the public player profile as a printable A4 PDF.
 *
 * Blade is intentionally NOT used in this project; the HTML payload is built
 * inline in PHP via a heredoc string. DomPDF only needs a complete HTML doc
 * with inline CSS, so an embedded template keeps everything in one file.
 */
class PdfController extends Controller
{
    public function playerProfile(Player $player): Response
    {
        abort_unless($player->is_published, 404);

        $html = $this->buildHtml($player);

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');

        return $pdf->download('rene-football-'.$player->slug.'.pdf');
    }

    private function buildHtml(Player $player): string
    {
        $generatedAt = now()->format('d/m/Y H:i');

        // ---------- Identity rows (conditional) ----------
        $infoRows = '<tr><td>Âge</td><td>'.((int) $player->age).' ans</td></tr>';
        if ($player->height) {
            $infoRows .= '<tr><td>Taille</td><td>'.e($player->height).'</td></tr>';
        }
        if ($player->nationality) {
            $infoRows .= '<tr><td>Nationalité</td><td>'.e($player->nationality).'</td></tr>';
        }
        if ($player->preferred_foot) {
            $infoRows .= '<tr><td>Pied fort</td><td>'.e($player->preferred_foot).'</td></tr>';
        }
        $infoRows .= '<tr><td>Catégorie</td><td>'.e($player->category).'</td></tr>';

        // ---------- Photo (optional) ----------
        $photoBlock = $player->photo_url
            ? '<img src="'.e($player->photo_url).'" alt="">'
            : '';

        // ---------- Top KPIs ----------
        $isKeeper       = $player->category === 'Gardien';
        $kpiPrimary     = $isKeeper ? 'Clean sheets' : 'Buts';
        $kpiPrimaryVal  = $isKeeper ? $player->clean_sheets : $player->goals;
        $kpiSecondary   = $isKeeper ? 'Arrêts' : 'Passes décisives';
        $kpiSecondaryV  = $isKeeper ? $player->saves : $player->assists;

        // ---------- Detailed stats rows ----------
        $statsRows  = '<tr><td>Minutes jouées</td><td>'.number_format((float) $player->minutes_played, 0, ',', ' ').' min</td></tr>';
        if (! $isKeeper) {
            $statsRows .= '<tr><td>Tirs (cadrés)</td><td>'.((int) $player->shots).' <span class="stat-suffix">('.((int) $player->shots_on_target).')</span></td></tr>';
            $statsRows .= '<tr><td>xG · Buts attendus</td><td>'.number_format((float) $player->xg, 2, ',', '').'</td></tr>';
            $statsRows .= '<tr><td>xA · Passes décisives attendues</td><td>'.number_format((float) $player->xa, 2, ',', '').'</td></tr>';
            $statsRows .= '<tr><td>Passes clés</td><td>'.((int) $player->key_passes).'</td></tr>';
            $statsRows .= '<tr><td>Précision des passes</td><td>'.number_format((float) $player->pass_accuracy, 1, ',', '').' %</td></tr>';
            $statsRows .= '<tr><td>Dribbles réussis</td><td>'.((int) $player->dribbles_completed).'</td></tr>';
            $statsRows .= '<tr><td>Tacles · Interceptions</td><td>'.((int) $player->tackles).' · '.((int) $player->interceptions).'</td></tr>';
            $statsRows .= '<tr><td>Duels gagnés</td><td>'.((int) $player->duels_won).'</td></tr>';
        } else {
            $statsRows .= '<tr><td>Arrêts</td><td>'.((int) $player->saves).'</td></tr>';
            $statsRows .= '<tr><td>Clean sheets</td><td>'.((int) $player->clean_sheets).'</td></tr>';
            $statsRows .= '<tr><td>Précision des passes</td><td>'.number_format((float) $player->pass_accuracy, 1, ',', '').' %</td></tr>';
        }
        $statsRows .= '<tr><td>Cartons jaunes · rouges</td><td>'.((int) $player->yellow_cards).' · '.((int) $player->red_cards).'</td></tr>';

        // ---------- Bio (optional) ----------
        $bioBlock = $player->bio
            ? '<div class="section-title">À propos</div><p>'.nl2br(e($player->bio)).'</p>'
            : '';

        // ---------- Pitch + heatmap SVG ----------
        $pitchBlock = '';
        if (is_array($player->heatmap_grid) && count($player->heatmap_grid) === 4) {
            $pitchBlock =
                '<div class="section-title">Zones d\'activité — terrain</div>'
                .'<div class="pitch-caption">Le joueur attaque de gauche à droite. Les zones les plus vertes sont celles où il est le plus actif.</div>'
                .'<div class="pitch-wrap">'.$this->buildPitchSvg($player->heatmap_grid).'</div>';
        }

        // ---------- Pre-escape scalars used inline below ----------
        $name     = e($player->name);
        $position = e($player->position);
        $category = e($player->category);
        $club     = e($player->club ?? '—');
        $since    = $player->since !== null ? (int) $player->since : '—';

        // ---------- Document ----------
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Profil joueur — {$name}</title>
    <style>
        @page { margin: 24mm 18mm 22mm 18mm; }
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            color: #18181b;
            font-size: 11px;
            line-height: 1.45;
            margin: 0;
        }
        .header {
            display: table;
            width: 100%;
            border-bottom: 2px solid #0a0a0a;
            padding-bottom: 10px;
            margin-bottom: 18px;
        }
        .brand {
            display: table-cell;
            vertical-align: middle;
            font-weight: bold;
            font-size: 14px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }
        .brand .accent { color: #0f5132; }
        .header-meta {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
            font-size: 9px;
            color: #71717a;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .hero { display: table; width: 100%; margin-bottom: 18px; }
        .hero-info {
            display: table-cell;
            vertical-align: top;
            padding-right: 16px;
        }
        .hero-photo {
            display: table-cell;
            vertical-align: top;
            width: 145px;
        }
        .hero-photo img {
            width: 145px;
            height: 195px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #e4e4e7;
        }
        .eyebrow {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 2.5px;
            color: #0f5132;
            margin-bottom: 6px;
        }
        h1 {
            font-size: 28px;
            margin: 0 0 6px;
            font-weight: bold;
            line-height: 1.05;
            letter-spacing: -0.5px;
        }
        .position { font-size: 12px; color: #52525b; margin: 0 0 12px; }
        .infos { width: 100%; border-collapse: collapse; }
        .infos td {
            padding: 4px 0;
            border-bottom: 1px solid #e4e4e7;
            font-size: 10.5px;
        }
        .infos td:first-child {
            color: #71717a;
            text-transform: uppercase;
            font-size: 8.5px;
            letter-spacing: 1.4px;
            width: 40%;
        }
        .infos td:last-child {
            text-align: right;
            font-weight: bold;
        }
        .section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #18181b;
            border-top: 1px solid #18181b;
            padding-top: 8px;
            margin: 22px 0 10px;
            font-weight: bold;
        }
        .stats-grid { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .stats-grid td {
            width: 33.33%;
            padding: 10px 12px;
            border: 1px solid #e4e4e7;
            vertical-align: top;
        }
        .stat-label {
            font-size: 8.5px;
            color: #71717a;
            text-transform: uppercase;
            letter-spacing: 1.4px;
        }
        .stat-value {
            font-size: 22px;
            font-weight: bold;
            margin-top: 4px;
            color: #0a0a0a;
        }
        .stat-suffix {
            font-size: 11px;
            color: #71717a;
            font-weight: normal;
            margin-left: 4px;
        }
        .stats-table { width: 100%; border-collapse: collapse; }
        .stats-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #e4e4e7;
            font-size: 10.5px;
        }
        .stats-table td:first-child { color: #52525b; width: 60%; }
        .stats-table td:last-child {
            text-align: right;
            font-weight: bold;
            font-variant-numeric: tabular-nums;
        }
        .pitch-caption {
            font-size: 9.5px;
            color: #71717a;
            margin: -4px 0 8px;
            font-style: italic;
        }
        .pitch-wrap {
            width: 100%;
            margin-top: 4px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e4e4e7;
        }
        .pitch-wrap svg {
            display: block;
            width: 100%;
            height: auto;
        }
        .footer {
            position: fixed;
            bottom: -10mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8.5px;
            color: #a1a1aa;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
    </style>
</head>
<body>

<div class="header">
    <div class="brand">RENÉ <span class="accent">FOOTBALL</span></div>
    <div class="header-meta">Profil joueur · {$generatedAt}</div>
</div>

<div class="hero">
    <div class="hero-info">
        <div class="eyebrow">{$category} · {$position}</div>
        <h1>{$name}</h1>
        <p class="position">{$club} · depuis {$since}</p>

        <table class="infos">
            {$infoRows}
        </table>
    </div>
    <div class="hero-photo">{$photoBlock}</div>
</div>

<div class="section-title">Saison en cours · vue d'ensemble</div>

<table class="stats-grid">
    <tr>
        <td>
            <div class="stat-label">Matchs joués</div>
            <div class="stat-value">{$player->matches_played}</div>
        </td>
        <td>
            <div class="stat-label">{$kpiPrimary}</div>
            <div class="stat-value">{$kpiPrimaryVal}</div>
        </td>
        <td>
            <div class="stat-label">{$kpiSecondary}</div>
            <div class="stat-value">{$kpiSecondaryV}</div>
        </td>
    </tr>
</table>

<div class="section-title">Statistiques détaillées</div>

<table class="stats-table">
    {$statsRows}
</table>

{$pitchBlock}

{$bioBlock}

<div class="footer">René Football · Agence sportive · rene-football.fr</div>

</body>
</html>
HTML;
    }

    /**
     * Render the pitch + heatmap as inline SVG. Kept dompdf-friendly: no filters
     * (no Gaussian blur), explicit colors, no CSS variables.
     *
     * @param  array<int, array<int, int>> $grid 4 rows × 6 cols, intensity 0-100
     */
    private function buildPitchSvg(array $grid): string
    {
        $vw = 600; $vh = 400; $pad = 10;
        $fw = $vw - 2 * $pad;
        $fh = $vh - 2 * $pad;
        $cols = 6; $rows = 4;
        $cw = $fw / $cols;
        $ch = $fh / $rows;

        // ---- Heatmap cells ----
        $cells = '';
        foreach ($grid as $i => $row) {
            foreach ($row as $j => $val) {
                $v = max(0, min(100, (int) $val));
                if ($v <= 0) continue;
                $opacity = round(0.10 + ($v / 100) * 0.78, 3);
                $x = $pad + $j * $cw;
                $y = $pad + $i * $ch;
                // Slight inset and rounded corners give the heatmap a softer look without blur filters.
                $cells .= sprintf(
                    '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="6" ry="6" fill="rgb(15,81,50)" fill-opacity="%.3f" />',
                    $x + 1, $y + 1, $cw - 2, $ch - 2, $opacity
                );
            }
        }

        // ---- Pitch lines (white, on green field) ----
        $cx = $vw / 2; $cy = $vh / 2;
        $stroke = '#f5f5f4';
        $sw = 1.4;

        $lines = ''
            // Outer
            .sprintf('<rect x="%d" y="%d" width="%d" height="%d" rx="6" ry="6" fill="none" stroke="%s" stroke-width="%.1f" />', $pad, $pad, $fw, $fh, $stroke, $sw)
            // Halfway
            .sprintf('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="%.1f" />', $cx, $pad, $cx, $vh - $pad, $stroke, $sw)
            // Center circle + spot
            .sprintf('<circle cx="%d" cy="%d" r="50" fill="none" stroke="%s" stroke-width="%.1f" />', $cx, $cy, $stroke, $sw)
            .sprintf('<circle cx="%d" cy="%d" r="2.5" fill="%s" />', $cx, $cy, $stroke)
            // Left penalty area
            .sprintf('<rect x="%d" y="%.1f" width="91" height="222" fill="none" stroke="%s" stroke-width="%.1f" />', $pad, $cy - 111, $stroke, $sw)
            // Left goal area
            .sprintf('<rect x="%d" y="%.1f" width="30" height="101" fill="none" stroke="%s" stroke-width="%.1f" />', $pad, $cy - 50.5, $stroke, $sw)
            .sprintf('<circle cx="%.1f" cy="%d" r="2.5" fill="%s" />', $pad + 60.5, $cy, $stroke)
            // Right penalty area
            .sprintf('<rect x="%d" y="%.1f" width="91" height="222" fill="none" stroke="%s" stroke-width="%.1f" />', $vw - $pad - 91, $cy - 111, $stroke, $sw)
            // Right goal area
            .sprintf('<rect x="%d" y="%.1f" width="30" height="101" fill="none" stroke="%s" stroke-width="%.1f" />', $vw - $pad - 30, $cy - 50.5, $stroke, $sw)
            .sprintf('<circle cx="%.1f" cy="%d" r="2.5" fill="%s" />', $vw - $pad - 60.5, $cy, $stroke)
            // Goals
            .sprintf('<rect x="%d" y="%d" width="5" height="44" fill="none" stroke="%s" stroke-width="%.1f" />', $pad - 5, $cy - 22, $stroke, $sw)
            .sprintf('<rect x="%d" y="%d" width="5" height="44" fill="none" stroke="%s" stroke-width="%.1f" />', $vw - $pad, $cy - 22, $stroke, $sw);

        // ---- Field background (deep turf) + alternating mowing stripes ----
        $stripes = '';
        for ($i = 0; $i < $cols; $i++) {
            $shade = $i % 2 === 0 ? 'rgb(13,72,45)' : 'rgb(17,89,55)';
            $stripes .= sprintf(
                '<rect x="%.2f" y="%d" width="%.2f" height="%d" fill="%s" />',
                $pad + $i * $cw, $pad, $cw, $fh, $shade
            );
        }

        return <<<SVG
<svg viewBox="0 0 {$vw} {$vh}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="{$vw}" height="{$vh}" fill="rgb(15,81,50)" />
    {$stripes}
    {$cells}
    {$lines}
</svg>
SVG;
    }
}
