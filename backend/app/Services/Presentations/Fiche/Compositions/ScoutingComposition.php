<?php

namespace App\Services\Presentations\Fiche\Compositions;

use App\Services\Presentations\Fiche\FichePage;
use App\Services\Presentations\Fiche\FicheTheme;
use App\Services\Presentations\Fiche\RenderContext;

/**
 * B — Scouting Intelligence. A report for recruiters and sporting directors:
 * header band, a left identity column (portrait, identity sheet, zones of
 * influence) and a right analysis column (key stats, athletic profile bars,
 * physical data, potential, strengths × characteristics, analysis text).
 * Every figure comes from the player record; sections without real data are
 * omitted and the space goes back to the remaining ones.
 */
class ScoutingComposition extends FicheComposition
{
    use FicheBlocks;

    private const M      = FichePage::MARGIN_MM;
    private const LEFT_W = 62.0;
    private const GAP    = 9.0;
    private const RIGHT_X = self::M + self::LEFT_W + self::GAP;
    private const RIGHT_W = FichePage::WIDTH_MM - self::M - self::RIGHT_X;

    public static function label(): string
    {
        return 'Scouting Intelligence';
    }

    public static function description(): string
    {
        return 'Rapport pour recruteurs et directeurs sportifs : fiche d’identité, statistiques réelles, barres de profil, potentiel, points forts et analyse.';
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="84" fill="#0a1f3d"/>'
            .'<rect width="60" height="9" fill="#12305c"/><rect x="3" y="12" width="18" height="24" fill="#2a4a7a"/>'
            .'<rect x="3" y="39" width="18" height="2" fill="#5b7bb0"/><rect x="3" y="43" width="18" height="2" fill="#5b7bb0"/><rect x="3" y="47" width="18" height="2" fill="#5b7bb0"/>'
            .'<rect x="24" y="12" width="20" height="3" fill="#fff"/><rect x="24" y="16" width="30" height="6" fill="#3b82f6"/>'
            .'<rect x="24" y="25" width="7" height="7" fill="#12305c"/><rect x="32" y="25" width="7" height="7" fill="#12305c"/><rect x="40" y="25" width="7" height="7" fill="#12305c"/><rect x="48" y="25" width="7" height="7" fill="#12305c"/>'
            .'<rect x="24" y="36" width="31" height="1.6" fill="#3b82f6"/><rect x="24" y="40" width="25" height="1.6" fill="#3b82f6"/><rect x="24" y="44" width="28" height="1.6" fill="#3b82f6"/>'
            .'<rect x="24" y="50" width="31" height="10" fill="none" stroke="#5b7bb0" stroke-width="0.6"/>'
            .'<rect x="0" y="78" width="60" height="6" fill="#12305c"/></svg>';
    }

    public function render(RenderContext $ctx): string
    {
        $headerH = 22.0 + $ctx->sp(4);
        $top = $headerH + $ctx->sp(8);

        // The two columns are measured separately: each gets back its own spare room.
        $leftExtra  = $ctx->spare ? $ctx->spareFor('scout-left') : 0.0;
        $rightExtra = $ctx->spare ? $ctx->spareFor('scout-right') : 0.0;

        $html = $this->header($ctx, $headerH)
            .$this->box(self::M, $top, self::LEFT_W, null, $this->leftColumn($ctx, $leftExtra), 'z-index:2;', 'data-block="scout-left" data-limit="1"')
            .$this->box(self::RIGHT_X, $top, self::RIGHT_W, null, $this->rightColumn($ctx, $rightExtra), 'z-index:2;', 'data-block="scout-right" data-limit="1"')
            .$this->footer($ctx, false);

        return $this->document($ctx, $html);
    }

    private function header(RenderContext $ctx, float $h): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $logoH = 10.0;
        $inner = ($d->logo ? $this->box(self::M, ($h - $logoH) / 2, 34, $logoH, $this->img($d->logo, 34, $logoH, '', 'left')) : '')
            .$this->box(self::M + 38, ($h - 11) / 2, 0.3, 11, '', 'background:'.$p['rule'].';')
            .$this->box(self::M + 42, ($h - 11) / 2, 90, 11,
                $this->caps($ctx, $ctx->t('doc_scouting'), $p['text'], 11, 0.22, 'font-weight:bold;')
                .$this->caps($ctx, trim($d->issuedOn.($d->tagline !== '' ? ' · '.$d->tagline : '')), $p['muted'], 7.2, 0.14, 'margin-top:1.4mm;'))
            .($d->headerMotto !== ''
                ? $this->box(FichePage::WIDTH_MM - self::M - 70, ($h - 5) / 2, 70, 5, $this->caps($ctx, $d->headerMotto, $p['accent'], 7.5, 0.22, 'text-align:right;'))
                : '');
        return $this->box(0, 0, FichePage::WIDTH_MM, $h, $inner, 'background:'.$p['panel'].';border-bottom:0.6mm solid '.$p['accent'].';', 'data-block="header"');
    }

    // ------------------------------------------------------------------ left

    private function leftColumn(RenderContext $ctx, float $extra): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $portraitExtra = min(60.0, $extra * 0.7);
        $gap = $ctx->sp(6) + min(13.0, ($extra - $portraitExtra) / 3);
        $parts = [$this->portrait($ctx, self::LEFT_W, max($ctx->density->level >= 3 ? 46.0 : 58.0, $ctx->sp(80)) + $portraitExtra)];

        $rows = $this->identityRows($ctx);
        if ($rows) $parts[] = $rows;
        // Compact data blocks live in the narrow column so the analysis column breathes.
        foreach ([$this->potential($ctx, self::LEFT_W), $this->physical($ctx, self::LEFT_W)] as $block) {
            if ($block !== '') $parts[] = $block;
        }
        if ($d->hasCharacteristics() && $this->traitsLeft($ctx)) $parts[] = $this->heading($ctx, $ctx->t('characteristics')).$this->characteristics($ctx, self::LEFT_W);

        if ($d->heatmapPath && $ctx->density->cap('heatmap') === 0) {
            $ctx->note('heatmap', 0, 1);
        } elseif ($d->heatmapPath) {
            $h = self::LEFT_W * 2 / 3;
            $parts[] = $this->caps($ctx, $ctx->t('heatmap'), $p['muted'], 7.2, 0.18, 'margin-bottom:1.6mm;')
                .$this->rawImg($d->heatmapPath, self::LEFT_W, $h);
        }

        $comparisons = $ctx->take('comparisons', $d->comparisons);
        if ($comparisons) {
            $list = '';
            foreach ($comparisons as $c) {
                $list .= '<div style="padding:'.self::mm($ctx->sp(1.4)).' 0;border-bottom:0.25mm solid '.$p['rule'].';">'
                    .'<span class="c" style="font-weight:bold;font-size:'.$ctx->pt(10, 9).'pt;letter-spacing:0.4pt;">'.self::e($c['name']).'</span>'
                    .($c['club'] !== '' ? '<span class="cm" style="font-size:'.$ctx->pt(8, 7).'pt;color:'.$p['muted'].';"> · '.self::e($c['club']).'</span>' : '')
                    .'</div>';
            }
            $parts[] = $this->caps($ctx, $ctx->t('comparisons'), $p['muted'], 7.2, 0.18, 'margin-bottom:1mm;').$list;
        }

        return implode('<div style="height:'.self::mm($gap).';"></div>', $parts);
    }

    private function portrait(RenderContext $ctx, float $w, float $h): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $frame = '<div style="position:relative;width:'.self::mm($w).';height:'.self::mm($h).';background:'.$p['panel'].';" data-block="portrait" data-fit="1">';
        if ($d->photo) {
            // Cut-outs stand on the panel; framed photos fill it. Both respect the editor framing.
            $f = $ctx->assets->frame($d->photo, $w, $h, $d->photo->cutout ? 'contain' : $d->photoFit, $d->photoZoom, $d->photoX, $d->photo->cutout ? 100 : $d->photoY);
            $frame .= $this->box($f['left'], $f['top'], $f['width'], $f['height'], $this->rawImg($f['image']->path, $f['width'], $f['height']));
        } else {
            $initials = mb_strtoupper(mb_substr($d->firstName, 0, 1).mb_substr($d->lastName, 0, 1));
            $frame .= $this->box(0, $h / 2 - 22, $w, 44, '<div class="d" style="text-align:center;font-size:120pt;color:'.$p['panel2'].';">'.self::e($initials).'</div>');
        }
        // Accent base line + category tag.
        $frame .= $this->box(0, $h - 0.8, $w, 0.8, '', 'background:'.$p['accent'].';');
        if ($d->category) {
            $frame .= $this->box(0, $h - 7.8, null, 7, '<div class="c" style="font-weight:bold;font-size:'.$ctx->pt(8.5, 7.5).'pt;letter-spacing:1.4pt;color:'.$p['ink'].';padding:1.6mm 2.6mm 0 2.6mm;line-height:1;">'.self::e($d->category).'</div>',
                'background:'.$p['accent'].';');
        }
        return $frame.'</div>';
    }

    private function identityRows(RenderContext $ctx): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $rows = [];
        if ($d->birthDate) $rows[] = ['calendar', $ctx->t('born'), self::e($d->birthDate).($d->age ? ' <span style="color:'.$p['muted'].';">('.self::e($ctx->t('years_old', $d->age)).')</span>' : '')];
        elseif ($d->age) $rows[] = ['calendar', $ctx->t('age'), self::e($ctx->t('years_old', $d->age))];
        if ($d->nationalities) {
            $v = [];
            foreach ($d->nationalities as $n) $v[] = $this->flag($n['flag'], 2.5, 'margin-right:1.2mm;').self::e($n['label']);
            $rows[] = ['globe', $ctx->t('nationality'), implode(' &nbsp;', $v)];
        }
        if ($d->club) $rows[] = ['shield', $ctx->t('club'), self::e($d->club)];
        if ($d->previousClub) $rows[] = ['arrow', $ctx->t('came_from'), self::e($d->previousClub)];
        if ($d->foot) $rows[] = ['boot', $ctx->t('foot'), self::e($d->foot)];
        if ($d->height) $rows[] = ['ruler', $ctx->t('height'), self::e($d->height)];
        if ($d->languages) $rows[] = ['speech', $ctx->t('languages'), self::e(implode(', ', $ctx->take('languages', $d->languages)))];
        $rows = $ctx->take('facts', $rows);
        if (! $rows) return '';

        $html = '';
        foreach ($rows as [$icon, $label, $value]) {
            $html .= '<tr>'
                .'<td style="width:7mm;padding:'.self::mm($ctx->sp(1.6)).' 0;border-bottom:0.25mm solid '.$p['rule'].';vertical-align:middle;">'.$this->icon($icon, $p['accent'], 4.2).'</td>'
                .'<td style="padding:'.self::mm($ctx->sp(1.6)).' 0;border-bottom:0.25mm solid '.$p['rule'].';vertical-align:middle;">'
                .$this->caps($ctx, $label, $p['muted'], 6.8, 0.16, 'margin-bottom:0.5mm;')
                .'<div class="c" style="font-weight:bold;font-size:'.$ctx->pt(10, 9).'pt;letter-spacing:0.3pt;line-height:1.2;text-transform:none;">'.$value.'</div>'
                .'</td></tr>';
        }
        return '<table style="width:'.self::mm(self::LEFT_W).';">'.$html.'</table>';
    }

    // ------------------------------------------------------------------ right

    private function rightColumn(RenderContext $ctx, float $extra): string
    {
        $d = $ctx->data;
        $w = self::RIGHT_W;
        $sections = array_values(array_filter([
            $this->stats($ctx, $w),
            $d->bars ? $this->heading($ctx, $ctx->t('player_profile')).$this->bars($ctx, $w, 2) : '',
            $this->strengths($ctx, $w),
            $d->hasCharacteristics() && ! $this->traitsLeft($ctx) ? $this->heading($ctx, $ctx->t('characteristics')).$this->characteristics($ctx, $w) : '',
            $d->bio !== '' || $d->scoutQuote !== '' ? $this->heading($ctx, $ctx->t('analysis')).$this->prose($ctx, 9.8) : '',
            $d->hasProject() ? $this->heading($ctx, $ctx->t('project')).$this->projectStrip($ctx, $w) : '',
        ]));
        $gap = $ctx->sp(7) + ($sections ? min(13.0, $extra / (count($sections) + 1)) : 0);

        $html = $this->nameBlock($ctx, $w);
        foreach ($sections as $s) {
            $html .= '<div style="margin-top:'.self::mm($gap).';">'.$s.'</div>';
        }
        return $html;
    }

    private function nameBlock(RenderContext $ctx, float $w): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        [$lines, $size] = $this->displayLines($ctx, $d->lastName, $w, 78, 34);
        $first = $d->firstName !== ''
            ? '<div class="c" style="font-size:'.$ctx->pt(20, 15).'pt;letter-spacing:2.4pt;line-height:1;margin-bottom:1.2mm;">'.self::e($d->firstName).'</div>'
            : '';
        $meta = array_filter([$d->positionDetail, $d->club]);
        return ($d->position ? $this->caps($ctx, $d->position, $p['accent'], 10, 0.26, 'font-weight:bold;margin-bottom:2.4mm;') : '')
            .$first
            .'<div class="d" style="font-size:'.$size.'pt;color:'.$p['text'].';" data-block="scout-name">'.$this->displayHtml($lines).'</div>'
            .($meta ? '<div class="cm" style="margin-top:2mm;font-size:'.$ctx->pt(9.5, 8.5).'pt;letter-spacing:1pt;color:'.$p['secondary'].';">'.self::e(implode('  ·  ', $meta)).'</div>' : '');
    }

    private function stats(RenderContext $ctx, float $w): string
    {
        $d = $ctx->data;
        $stats = $ctx->take('stats', $d->stats);
        if (! $stats) return '';
        $p = $d->palette;
        $n = count($stats);
        $cells = '';
        foreach ($stats as $i => $s) {
            $cells .= '<td style="width:'.round(100 / $n, 3).'%;padding:'.self::mm($ctx->sp(3)).' 3mm;background:'.$p['panel'].';'.($i > 0 ? 'border-left:1.5mm solid '.$p['bg'].';' : '').'">'
                .'<div class="d" style="font-size:'.$ctx->pt(30, 22).'pt;color:'.$p['accent'].';">'.self::e($s['value']).'<span style="font-size:'.$ctx->pt(16, 12).'pt;">'.self::e($s['suffix']).'</span></div>'
                .$this->caps($ctx, $s['label'], $p['muted'], 7.2, 0.14, 'margin-top:1.4mm;')
                .'</td>';
        }
        $source = $d->statsSource ? $this->caps($ctx, $ctx->t('source', $d->statsSource), $p['muted'], 6.6, 0.12, 'margin-top:1.4mm;text-align:right;text-transform:none;') : '';
        return $this->heading($ctx, $ctx->t('key_stats'))
            .'<table style="width:'.self::mm($w).';table-layout:fixed;"><tr>'.$cells.'</tr></table>'.$source;
    }

    private function physical(RenderContext $ctx, float $w): string
    {
        $rows = $ctx->take('physical', $ctx->data->physical);
        if (! $rows) return '';
        $p = $ctx->data->palette;
        $perRow = $w < 90 ? 2 : count($rows);
        $html = '';
        foreach (array_chunk($rows, $perRow) as $ri => $chunk) {
            $html .= '<tr>';
            foreach ($chunk as $i => $r) {
                $html .= '<td style="width:'.round(100 / $perRow, 3).'%;padding:'.($ri > 0 ? self::mm($ctx->sp(2.5)) : '0').' 3mm 0 '.($i > 0 ? '3mm' : '0').';'.($i > 0 ? 'border-left:0.25mm solid '.$p['rule'].';' : '').'">'
                    .'<div class="d" style="font-size:'.$ctx->pt(19, 14).'pt;color:'.$p['text'].';">'.self::e($r['value']).'</div>'
                    .$this->caps($ctx, $r['label'], $p['muted'], 6.8, 0.12, 'margin-top:1mm;')
                    .'</td>';
            }
            for ($k = count($chunk); $k < $perRow; $k++) $html .= '<td></td>';
            $html .= '</tr>';
        }
        return $this->heading($ctx, $ctx->t('physical')).'<table style="width:'.self::mm($w).';table-layout:fixed;">'.$html.'</table>';
    }

    /** Potential as a 10-segment gauge + the scout's label. */
    private function potential(RenderContext $ctx, float $w): string
    {
        $d = $ctx->data;
        if ($d->potentialRating === null) return '';
        $p = $d->palette;
        $segs = '';
        for ($i = 1; $i <= 10; $i++) {
            $fill = $d->potentialRating >= $i ? $p['accent'] : ($d->potentialRating > $i - 1 ? FicheTheme::mix($p['accent'], $p['panel2'], 0.5) : $p['panel2']);
            $segs .= '<td style="padding-right:'.($i < 10 ? '1.2mm' : '0').';"><div style="height:3mm;background:'.$fill.';"></div></td>';
        }
        return $this->heading($ctx, $ctx->t('potential'))
            .'<table style="width:'.self::mm($w).';"><tr>'
            .'<td style="width:'.($w < 90 ? '20mm' : '24mm').';vertical-align:middle;"><span class="d" style="font-size:'.$ctx->pt(30, 22).'pt;color:'.$p['accent'].';">'.self::e($ctx->i18n->number($d->potentialRating, 1)).'</span><span class="c" style="font-size:'.$ctx->pt(10, 8).'pt;color:'.$p['muted'].';"> /10</span></td>'
            .'<td style="vertical-align:middle;"><table style="width:100%;"><tr>'.$segs.'</tr></table>'
            .($d->potentialLabel ? '<div class="cm" style="margin-top:1.6mm;font-size:'.$ctx->pt(9, 8).'pt;letter-spacing:0.8pt;color:'.$p['secondary'].';">'.self::e($d->potentialLabel).'</div>' : '')
            .'</td></tr></table>';
    }

    /** Characteristics sit in the narrow column unless the measured pass found it the taller one. */
    private function traitsLeft(RenderContext $ctx): bool
    {
        $l = $ctx->measured['scout-left'] ?? null;
        $r = $ctx->measured['scout-right'] ?? null;
        if (! $l || ! $r) return true;
        return $l['y'] + $l['h'] <= $r['y'] + $r['h'];
    }

    /** Strengths as a two-column checklist across the analysis column. */
    private function strengths(RenderContext $ctx, float $w): string
    {
        $d = $ctx->data;
        $items = $ctx->take('strengths', $d->strengths);
        if (! $items) return '';
        $p = $d->palette;
        $half = ($w - 6) / 2;
        $rows = '';
        foreach (array_chunk($items, 2) as $pair) {
            $rows .= '<tr>';
            foreach ([0, 1] as $i) {
                $s = $pair[$i] ?? null;
                $rows .= '<td style="width:'.self::mm($half).';'.($i ? 'padding-left:6mm;' : '').'padding-top:'.self::mm($ctx->sp(1.2)).';padding-bottom:'.self::mm($ctx->sp(1.2)).';">'
                    .($s !== null
                        ? '<table><tr><td style="width:6mm;vertical-align:middle;">'.$this->icon('check', $p['accent'], 3.8).'</td>'
                            .'<td class="bm" style="vertical-align:middle;font-size:'.$ctx->body(9.5).'pt;line-height:1.3;">'.self::e($s).'</td></tr></table>'
                        : '')
                    .'</td>';
            }
            $rows .= '</tr>';
        }
        return $this->heading($ctx, $ctx->t('strengths')).'<table style="width:'.self::mm($w).';table-layout:fixed;">'.$rows.'</table>';
    }
}
