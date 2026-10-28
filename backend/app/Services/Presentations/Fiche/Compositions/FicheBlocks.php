<?php

namespace App\Services\Presentations\Fiche\Compositions;

use App\Services\Presentations\Fiche\RenderContext;

/**
 * Content blocks reused by several compositions (flow content, width in mm).
 * Each returns '' when it has nothing real to show.
 */
trait FicheBlocks
{
    /** Strengths as an editorial numbered list: 01 — label. */
    protected function numberedList(RenderContext $ctx, array $items, float $width, string $listKey = 'strengths'): string
    {
        $items = $ctx->take($listKey, $items);
        if (! $items) return '';
        $p = $ctx->data->palette;
        $rows = '';
        foreach (array_values($items) as $i => $label) {
            $rows .= '<tr>'
                .'<td style="width:9mm;padding:'.self::mm($ctx->sp(1.5)).' 0;border-bottom:0.25mm solid '.$p['rule'].';vertical-align:middle;">'
                .'<span class="d" style="font-size:'.$ctx->pt(15, 12).'pt;color:'.$p['accent'].';">'.sprintf('%02d', $i + 1).'</span></td>'
                .'<td style="padding:'.self::mm($ctx->sp(1.5)).' 0;border-bottom:0.25mm solid '.$p['rule'].';vertical-align:middle;">'
                .'<span class="bm" style="font-size:'.$ctx->body(10).'pt;color:'.$p['text'].';">'.self::e($label).'</span></td>'
                .'</tr>';
        }
        return '<table style="width:'.self::mm($width).';">'.$rows.'</table>';
    }

    /** Label / value table: playing style, best position, mental traits, ambition. */
    protected function characteristics(RenderContext $ctx, float $width, bool $withPosition = true): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $rows = [];
        if ($d->playingStyle) $rows[] = [$ctx->t('playing_style'), self::e($d->playingStyle)];
        if ($withPosition && $d->position && $d->positionDetail) $rows[] = [$ctx->t('best_position'), self::e($d->position)];
        if ($d->mental) {
            // Plain inline text with accent separators: DomPDF wraps bordered inline boxes unreliably.
            $rows[] = [$ctx->t('mental'), implode(' <span style="color:'.$p['accent'].';">/</span> ', array_map([self::class, 'e'], $ctx->take('mental', $d->mental)))];
        }
        if ($d->objective) $rows[] = [$ctx->t('objective'), self::e($ctx->prose('objective', $d->objective))];
        if (! $rows) return '';

        $out = '';
        if ($width < 70) {
            // Narrow column: label above value.
            foreach ($rows as [$label, $value]) {
                $out .= '<tr><td style="padding:'.self::mm($ctx->sp(1.4)).' 0;border-bottom:0.25mm solid '.$p['rule'].';">'
                    .$this->caps($ctx, $label, $p['secondary'], 7, 0.14, 'margin-bottom:0.6mm;')
                    .'<div class="bm" style="font-size:'.$ctx->body(9.5).'pt;line-height:1.3;color:'.$p['text'].';">'.$value.'</div></td></tr>';
            }
            return '<table style="width:'.self::mm($width).';">'.$out.'</table>';
        }
        foreach ($rows as [$label, $value]) {
            $out .= '<tr>'
                .'<td style="width:28mm;padding:'.self::mm($ctx->sp(1.6)).' 2mm '.self::mm($ctx->sp(1.6)).' 0;border-bottom:0.25mm solid '.$p['rule'].';">'
                .$this->caps($ctx, $label, $p['secondary'], 7.2, 0.14).'</td>'
                .'<td class="bm" style="padding:'.self::mm($ctx->sp(1.6)).' 0;border-bottom:0.25mm solid '.$p['rule'].';font-size:'.$ctx->body(9.5).'pt;line-height:1.35;color:'.$p['text'].';">'.$value.'</td>'
                .'</tr>';
        }
        return '<table style="width:'.self::mm($width).';">'.$out.'</table>';
    }

    /** Labelled percentage bars (player_profile_bars), optionally on two columns. */
    protected function bars(RenderContext $ctx, float $width, int $columns = 1): string
    {
        $bars = $ctx->take('bars', $ctx->data->bars);
        if (! $bars) return '';
        $p = $ctx->data->palette;
        // Two columns for long lists, and for any list once the page is dense.
        $columns = count($bars) > 4 || ($ctx->density->level >= 3 && count($bars) > 2) ? $columns : 1;
        $colW = ($width - ($columns - 1) * 8) / $columns;
        $cells = [];
        foreach ($bars as $b) {
            $cells[] = '<table style="width:'.self::mm($colW).';margin-bottom:'.self::mm($ctx->sp(2.2)).';"><tr>'
                .'<td class="c" style="font-size:'.$ctx->pt(8.5, 7.5).'pt;letter-spacing:0.8pt;color:'.$p['text'].';padding-bottom:1mm;">'.self::e($b['label']).'</td>'
                .'<td class="d" style="text-align:right;font-size:'.$ctx->pt(13, 11).'pt;color:'.$p['accent'].';">'.$b['pct'].'</td>'
                .'</tr><tr><td colspan="2">'
                .'<div style="height:1.6mm;background:'.$p['panel2'].';"><div style="height:1.6mm;width:'.$b['pct'].'%;background:'.$p['accent'].';"></div></div>'
                .'</td></tr></table>';
        }
        if ($columns === 1) return implode('', $cells);
        $rows = '';
        foreach (array_chunk($cells, $columns) as $chunk) {
            $rows .= '<tr>';
            foreach ($chunk as $i => $c) {
                $rows .= '<td style="width:'.self::mm($colW).';'.($i > 0 ? 'padding-left:8mm;' : '').'">'.$c.'</td>';
            }
            $rows .= '</tr>';
        }
        return '<table style="width:'.self::mm($width).';">'.$rows.'</table>';
    }

    /** Career entries as rows: years · crest · club (oldest first). */
    protected function careerRows(RenderContext $ctx, float $width): string
    {
        $entries = $ctx->take('career', $ctx->data->career);
        if (! $entries) return '';
        $p = $ctx->data->palette;
        $rows = '';
        foreach ($entries as $e) {
            $rows .= '<tr>'
                .'<td class="d" style="width:30mm;padding:'.self::mm($ctx->sp(1.8)).' 0;border-bottom:0.25mm solid '.$p['rule'].';vertical-align:middle;font-size:'.$ctx->pt(14, 11).'pt;color:'.$p['accent'].';">'.self::e($e['years']).'</td>'
                .'<td style="width:11mm;padding:'.self::mm($ctx->sp(1.2)).' 0;border-bottom:0.25mm solid '.$p['rule'].';vertical-align:middle;">'.($e['logo'] ? $this->img($e['logo'], 8, 8) : '').'</td>'
                .'<td class="c" style="padding:'.self::mm($ctx->sp(1.8)).' 0;border-bottom:0.25mm solid '.$p['rule'].';vertical-align:middle;font-weight:bold;font-size:'.$ctx->pt(10.5, 9).'pt;letter-spacing:0.6pt;">'.self::e($e['club']).'</td>'
                .'</tr>';
        }
        return '<table style="width:'.self::mm($width).';">'.$rows.'</table>';
    }

    /** Row of gallery thumbnails, each cropped to the same frame ratio. */
    protected function galleryRow(RenderContext $ctx, float $width, float $height, float $gap = 3.0): string
    {
        $photos = $ctx->take('gallery', $ctx->data->gallery);
        if (! $photos) return '';
        $n = count($photos);
        $w = ($width - ($n - 1) * $gap) / $n;
        $cells = '';
        foreach ($photos as $i => $img) {
            $f = $ctx->assets->frame($img, $w, $height, 'cover');
            $cells .= '<td style="width:'.self::mm($w).';'.($i > 0 ? 'padding-left:'.self::mm($gap).';' : '').'">'
                .$this->rawImg($f['image']->path, $f['width'], $f['height'])
                .'</td>';
        }
        return '<table style="width:'.self::mm($width).';"><tr>'.$cells.'</tr></table>';
    }

    /** Bio paragraph, with the scout quote as a pull-quote when present. */
    protected function prose(RenderContext $ctx, float $size = 10.0): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $out = '';
        if ($d->scoutQuote !== '') {
            $out .= '<div style="font-family:\'FicheBody\';font-style:italic;font-size:'.$ctx->pt(12.5, 10).'pt;line-height:1.35;color:'.$p['secondary'].';border-left:0.8mm solid '.$p['accent'].';padding-left:3.5mm;margin-bottom:'.self::mm($ctx->sp(3)).';">«&nbsp;'.self::e($d->scoutQuote).'&nbsp;»</div>';
        }
        if ($d->bio !== '') {
            $out .= '<p style="font-size:'.$ctx->body($size).'pt;line-height:1.5;color:'.$p['text'].';">'.nl2br(self::e($ctx->prose('bio', $d->bio))).'</p>';
        }
        return $out;
    }
}
