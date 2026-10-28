<?php

namespace App\Services\Presentations\Fiche\Compositions;

use App\Services\Presentations\Fiche\FichePage;
use App\Services\Presentations\Fiche\FicheTheme;
use App\Services\Presentations\Fiche\FontMeasure;
use App\Services\Presentations\Fiche\RenderContext;

/**
 * C — Career & Potential. A structured editorial page about trajectory:
 * a split opening (photo panel / identity + ambition statement), a career
 * timeline across the page ending on the current club, then the sporting
 * project — target academies by country, supervisor and partner — beside
 * the player's qualities.
 */
class CareerComposition extends FicheComposition
{
    use FicheBlocks;

    private const M       = FichePage::MARGIN_MM;
    private const PHOTO_W = 80.0;
    private const COL_GAP = 10.0;
    private const LEFT_W  = 110.0;
    private const RIGHT_W = FichePage::WIDTH_MM - 2 * self::M - self::LEFT_W - self::COL_GAP;

    public static function label(): string
    {
        return 'Career & Potential';
    }

    public static function description(): string
    {
        return 'Parcours et progression : frise des clubs jusqu’au club actuel, ambition, projet sportif, académies ciblées, superviseur et partenaires.';
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="84" fill="#1a0f2e"/>'
            .'<rect width="24" height="34" fill="#2e1d4f"/><rect x="28" y="6" width="14" height="3" fill="#fff"/><rect x="28" y="11" width="28" height="6" fill="#8b5cf6"/>'
            .'<rect x="28" y="21" width="12" height="2" fill="#a99cc9"/><rect x="44" y="21" width="12" height="2" fill="#a99cc9"/><rect x="28" y="26" width="28" height="4" fill="none" stroke="#8b5cf6" stroke-width="0.6"/>'
            .'<line x1="4" y1="42" x2="56" y2="42" stroke="#8b5cf6" stroke-width="0.6"/><circle cx="8" cy="42" r="1.4" fill="#1a0f2e" stroke="#8b5cf6" stroke-width="0.6"/><circle cx="22" cy="42" r="1.4" fill="#1a0f2e" stroke="#8b5cf6" stroke-width="0.6"/><circle cx="38" cy="42" r="1.4" fill="#1a0f2e" stroke="#8b5cf6" stroke-width="0.6"/><circle cx="52" cy="42" r="1.6" fill="#8b5cf6"/>'
            .'<rect x="4" y="52" width="30" height="8" fill="#24163f"/><rect x="4" y="62" width="30" height="8" fill="#24163f"/><rect x="38" y="52" width="18" height="2" fill="#c4b5fd"/><rect x="38" y="56" width="18" height="2" fill="#c4b5fd"/>'
            .'<rect x="0" y="78" width="60" height="6" fill="#8b5cf6"/></svg>';
    }

    public function render(RenderContext $ctx): string
    {
        $d = $ctx->data;
        $topExtra = min(48.0, $ctx->elastic * 0.6);
        [$topH, $infoHtml] = $this->opening($ctx, $topExtra);

        $y = $topH + $ctx->sp(8);
        $html = $this->photoPanel($ctx, $topH).$infoHtml;

        $timeline = $this->timeline($ctx);
        if ($timeline !== '') {
            // Club labels wrap freely; their real height comes back from the measuring pass.
            $labels = $ctx->measuredHeight('timeline-labels');
            $tlH = max(24.0 + 10 * $ctx->density->space, $labels !== null ? 12.0 + 4 * $ctx->density->space + 4 + $labels + 1.5 : 0);
            $html .= $this->box(self::M, $y, FichePage::WIDTH_MM - 2 * self::M, $tlH, $timeline, '', 'data-block="timeline" data-fit="1"');
            $y += $tlH + $ctx->sp(6);
        }

        $extra = $ctx->spare ? $ctx->spareFor('career-body') : 0.0;
        $body = $this->body($ctx, $extra);
        if ($body !== '') {
            $html .= $this->box(self::M, $y, FichePage::WIDTH_MM - 2 * self::M, null, $body, '', 'data-block="career-body" data-limit="1"');
        }

        return $this->document($ctx, $html.$this->footer($ctx, true));
    }

    // ------------------------------------------------------------------ opening

    private function infoX(RenderContext $ctx): float
    {
        $d = $ctx->data;
        if (! $d->photo) return self::M;
        return $d->photoSide === 'left' ? self::PHOTO_W + 10 : self::M;
    }

    private function infoW(RenderContext $ctx): float
    {
        return $ctx->data->photo ? FichePage::WIDTH_MM - self::PHOTO_W - 10 - self::M : FichePage::WIDTH_MM - 2 * self::M;
    }

    /**
     * Identity column. Its height is computed from real glyph metrics so the
     * photo panel and the opening band share one height; the renderer checks
     * the estimate (data-fit) and the engine densifies if it was wrong.
     *
     * @return array{0:float,1:string}
     */
    private function opening(RenderContext $ctx, float $extra): array
    {
        $d = $ctx->data;
        $p = $d->palette;
        $x = $this->infoX($ctx);
        $w = $this->infoW($ctx);
        $s = $ctx->density->space;

        $parts = [];
        $pad = max(8.0, $ctx->sp(12));
        $h = $pad;  // top padding
        if ($d->logo) {
            $parts[] = '<div style="height:11mm;">'.$this->img($d->logo, 38, 11, '', 'left').'</div>';
            $h += 11;
        }
        if ($d->tagline !== '' || $d->headerMotto !== '') {
            $parts[] = $this->caps($ctx, trim($d->tagline.($d->headerMotto !== '' ? ' · '.$d->headerMotto : ''), ' ·'), $p['secondary'], 7, 0.28, 'margin-top:1.6mm;');
            $h += 4.6;
        }
        $parts[] = '<div style="height:'.self::mm(7 * $s + 2).';"></div>';
        $h += 7 * $s + 2;

        $parts[] = $this->caps($ctx, $ctx->t('doc_career'), $p['accent'], 8.5, 0.3, 'font-weight:bold;margin-bottom:2mm;');
        $h += 6;
        if ($d->firstName !== '') {
            $fp = $ctx->pt(21, 16);
            $parts[] = '<div class="c" style="font-size:'.$fp.'pt;letter-spacing:2.2pt;line-height:1;margin-bottom:1.4mm;">'.self::e($d->firstName).'</div>';
            $h += FichePage::ptToMm($fp) + 1.4;
        }
        [$lines, $size, $hl] = $this->displayLines($ctx, $d->lastName, $w, ($d->photo ? 84 : 120) * $ctx->density->type, 34);
        $parts[] = '<div class="d" style="font-size:'.$size.'pt;">'.$this->displayHtml($lines).'</div>';
        $h += $hl + 1;
        if ($d->position) {
            $parts[] = $this->caps($ctx, $d->position.($d->positionDetail ? '  ·  '.$d->positionDetail : ''), $p['secondary'], 9.5, 0.2, 'margin-top:2.6mm;');
            $h += 7;
        }

        $facts = $this->facts($ctx);
        if ($facts) {
            $rows = (int) ceil(count($facts) / 2);
            $cells = '';
            foreach (array_chunk($facts, 2) as $pair) {
                $cells .= '<tr>';
                foreach ($pair as $i => [$label, $value]) {
                    $cells .= '<td style="width:50%;padding:'.self::mm($ctx->sp(1.8)).' '.($i === 0 ? '4mm' : '0').' '.self::mm($ctx->sp(1.8)).' 0;border-top:0.25mm solid '.$p['rule'].';">'
                        .$this->caps($ctx, $label, $p['muted'], 6.8, 0.16, 'margin-bottom:0.6mm;')
                        .'<div class="c" style="font-weight:bold;font-size:'.$ctx->pt(10, 9).'pt;letter-spacing:0.3pt;line-height:1.15;text-transform:none;">'.$value.'</div></td>';
                }
                if (count($pair) < 2) $cells .= '<td></td>';
                $cells .= '</tr>';
            }
            $parts[] = '<table style="width:'.self::mm($w).';table-layout:fixed;margin-top:'.self::mm($ctx->sp(5)).';">'.$cells.'</table>';
            $h += $ctx->sp(5) + $rows * (3.2 + FichePage::ptToMm($ctx->pt(10, 9) * 1.15) * 2 + 0.6 + 2 * $ctx->sp(1.8));
        }

        $statement = $d->objective;
        if ($statement) {
            $text = $ctx->prose('objective', $statement);
            $fs = $ctx->pt(12.5, 10.5);
            $lines = $this->lines($text, 'Barlow-Italic.ttf', $fs, $w - 5);
            $parts[] = '<div style="margin-top:'.self::mm($ctx->sp(5)).';border-left:0.9mm solid '.$p['accent'].';padding-left:4mm;">'
                .$this->caps($ctx, $ctx->t('objective'), $p['accent'], 7, 0.2, 'margin-bottom:1.2mm;')
                .'<div style="font-family:\'FicheBody\';font-style:italic;font-size:'.$fs.'pt;line-height:1.3;">'.self::e($text).'</div></div>';
            $h += $ctx->sp(5) + 4.4 + $lines * FichePage::ptToMm($fs * 1.3);
        }

        // Planned from glyph metrics; replaced by the real rendered height when
        // the engine re-composes after a measuring pass.
        $content = $ctx->measuredHeight('opening-inner');
        $h = $content !== null ? $content + $pad : $h;
        $base = 70 + 50 * $s;
        $topH = max($base, $h + 6) + $extra;
        $html = $this->box($x, 0, $w, $topH, '<div style="padding-top:'.self::mm($pad).';"><div data-block="opening-inner">'.implode('', $parts).'</div></div>', 'z-index:3;', 'data-block="opening" data-fit="1"');
        return [$topH, $html];
    }

    private function photoPanel(RenderContext $ctx, float $h): string
    {
        $d = $ctx->data;
        if (! $d->photo) return '';
        $p = $d->palette;
        $x = $d->photoSide === 'left' ? 0 : FichePage::WIDTH_MM - self::PHOTO_W;
        $out = $this->box($x, 0, self::PHOTO_W, $h, '', 'background:'.$p['panel'].';');
        if ($d->photo->cutout) {
            $f = $ctx->assets->frame($d->photo, self::PHOTO_W - 6, $h - 14, 'contain', $d->photoZoom, $d->photoX, 100);
            $out .= $this->box($x + 3 + $f['left'], 14 + $f['top'], $f['width'], $f['height'], $this->rawImg($f['image']->path, $f['width'], $f['height']), 'z-index:1;');
        } else {
            $out .= $this->photo($ctx, $x, 0, self::PHOTO_W, $h, '', 'z-index:1;');
        }
        // Accent edge on the inner side of the panel.
        $edgeX = $d->photoSide === 'left' ? self::PHOTO_W - 1.2 : $x;
        $out .= $this->box($edgeX, 0, 1.2, $h, '', 'background:'.$p['accent'].';z-index:2;');
        // Soft floor so the panel lands on the page.
        $out .= $this->box($x, $h - 18, self::PHOTO_W, 18.2, $this->rawImg($ctx->assets->fade($p['bg'], 'bottom', 0.85), self::PHOTO_W, 18.2), 'z-index:2;');
        return $out;
    }

    /** @return array<int, array{0:string,1:string}> label + HTML value */
    private function facts(RenderContext $ctx): array
    {
        $d = $ctx->data;
        $p = $d->palette;
        $f = [];
        if ($d->birthDate) $f[] = [$ctx->t('born'), self::e($d->birthDate).($d->age ? ' <span style="color:'.$p['muted'].';">· '.self::e($ctx->t('years_old', $d->age)).'</span>' : '')];
        elseif ($d->age) $f[] = [$ctx->t('age'), self::e($ctx->t('years_old', $d->age))];
        if ($d->nationalities) {
            $v = [];
            foreach ($d->nationalities as $n) $v[] = $this->flag($n['flag'], 2.4, 'margin-right:1.2mm;').self::e($n['label']);
            $f[] = [$ctx->t('nationality'), implode(' &nbsp;', $v)];
        }
        if ($d->foot) $f[] = [$ctx->t('foot'), self::e($d->foot)];
        if ($d->height) $f[] = [$ctx->t('height'), self::e($d->height)];
        if ($d->languages) $f[] = [$ctx->t('languages'), self::e(implode(', ', $ctx->take('languages', $d->languages)))];
        if ($d->playingStyle) $f[] = [$ctx->t('playing_style'), self::e($d->playingStyle)];
        return $ctx->take('facts', $f);
    }

    // ------------------------------------------------------------------ timeline

    /** Career entries + previous club + current club as one chronological line. */
    private function timeline(RenderContext $ctx): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $entries = $ctx->take('career', $d->career);
        $known = array_map(static fn ($e) => mb_strtolower($e['club']), $entries);
        $has = static function (string $club) use (&$known): bool {
            $c = mb_strtolower($club);
            foreach ($known as $k) if ($k !== '' && (str_contains($k, $c) || str_contains($c, $k))) return true;
            return false;
        };
        if ($d->previousClub && ! $has($d->previousClub)) {
            $entries[] = ['years' => $ctx->t('came_from'), 'club' => $d->previousClub, 'logo' => $d->previousClubLogo];
            $known[] = mb_strtolower($d->previousClub);
        }
        $current = null;
        if ($d->club && ! $has($d->club)) {
            $current = ['years' => $ctx->t('current'), 'club' => $d->club, 'logo' => $d->clubLogo, 'current' => true];
            $entries[] = $current;
        } elseif ($entries) {
            $entries[array_key_last($entries)]['current'] = true;
        }
        if (count($entries) < 2 && ! $d->career) return '';

        $n = count($entries);
        $w = FichePage::WIDTH_MM - 2 * self::M;
        $colW = $w / $n;
        $lineY = 12.0 + 4 * $ctx->density->space;
        $out = $this->box(0, 0, $w, 8, $this->heading($ctx, $ctx->t('career'), 0));
        $out .= $this->box($colW / 2, $lineY, $w - $colW, 0.4, '', 'background:'.$p['rule'].';');
        $cells = [];

        foreach (array_values($entries) as $i => $e) {
            $cx = $colW * $i;
            $isCurrent = ! empty($e['current']);
            $dot = $isCurrent
                ? 'background:'.$p['accent'].';'
                : 'background:'.$p['bg'].';border:0.5mm solid '.$p['accent'].';';
            $size = $isCurrent ? 4.0 : 3.2;
            $out .= $this->box($cx + $colW / 2 - $size / 2, $lineY + 0.2 - $size / 2, $size, $size, '', $dot.'border-radius:'.self::mm($size).';');
            $out .= $this->box($cx, $lineY - 8.4, $colW, 6,
                '<div class="d" style="text-align:center;font-size:'.$ctx->pt(14, 11).'pt;color:'.($isCurrent ? $p['accent'] : $p['secondary']).';">'.self::e($e['years']).'</div>');
            $showLogo = $e['logo'] && $ctx->density->cap('career_logos') > 0;
            if ($e['logo'] && ! $showLogo) $ctx->note('career_logos', 0, count(array_filter($entries, static fn ($x) => $x['logo'])));
            $logo = $showLogo ? '<div style="height:8mm;margin-bottom:1.2mm;">'.$this->img($e['logo'], $colW - 6, 8).'</div>' : '';
            $cells[] = '<td style="width:'.self::mm($colW).';padding:0 2mm;">'.$logo
                .'<div class="c" style="text-align:center;font-weight:bold;font-size:'.$ctx->pt(10, 8.5).'pt;letter-spacing:0.4pt;line-height:1.15;color:'.($isCurrent ? $p['text'] : $p['secondary']).';">'.self::e($e['club']).'</div></td>';
        }
        $out .= '<div style="padding-top:'.self::mm($lineY + 4).';"><table data-block="timeline-labels" style="width:'.self::mm($w).';table-layout:fixed;"><tr>'.implode('', $cells).'</tr></table></div>';
        return $out;
    }

    // ------------------------------------------------------------------ body

    /**
     * Profile | qualities on two columns, then the sporting project across
     * the page (intro beside supervisor/partner cards, academies grid).
     */
    private function body(RenderContext $ctx, float $extra): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $W = FichePage::WIDTH_MM - 2 * self::M;

        $left = [];
        if ($d->bio !== '' || $d->scoutQuote !== '') $left[] = $this->heading($ctx, $ctx->t('profile')).$this->prose($ctx, 9.8);
        if ($d->mental) {
            $left[] = $this->heading($ctx, $ctx->t('mental')).'<div class="bm" style="font-size:'.$ctx->body(9.5).'pt;line-height:1.5;">'
                .implode(' <span style="color:'.$p['accent'].';">/</span> ', array_map([self::class, 'e'], $ctx->take('mental', $d->mental))).'</div>';
        }
        $right = [];
        if ($d->strengths) $right[] = $this->heading($ctx, $ctx->t('qualities')).$this->numberedList($ctx, $d->strengths, self::RIGHT_W);
        if ($d->bars && $ctx->density->cap('career_bars') > 0) {
            $right[] = $this->heading($ctx, $ctx->t('player_profile')).$this->bars($ctx, self::RIGHT_W);
        } elseif ($d->bars) {
            $ctx->note('bars', 0, count($d->bars));
        }
        if ($d->gallery) $right[] = $this->galleryRow($ctx, self::RIGHT_W, $ctx->sp(24), 2.5);

        $spacer = '<div style="height:'.self::mm($ctx->sp(5)).';"></div>';
        $l = implode($spacer, $left);
        $r = implode($spacer, $right);
        $sections = [];
        if ($l !== '' && $r !== '') {
            $sections[] = '<table style="width:'.self::mm($W).';"><tr><td style="width:'.self::mm(self::LEFT_W).';">'.$l.'</td>'
                .'<td style="width:'.self::mm(self::COL_GAP).';"></td><td style="width:'.self::mm(self::RIGHT_W).';">'.$r.'</td></tr></table>';
        } elseif ($l.$r !== '') {
            $sections[] = $l.$r;
        }
        if ($d->hasProject()) $sections[] = $this->project($ctx, $W);
        if (! $sections) return '';

        $gap = $ctx->sp(7) + min(16.0, $extra / count($sections));
        return implode('<div style="height:'.self::mm($gap).';"></div>', $sections);
    }

    private function project(RenderContext $ctx, float $W): string
    {
        $d = $ctx->data;
        $orgs = [];
        foreach ([['supervised_by', $d->supervisedBy], ['partner', $d->partner]] as [$key, $org]) {
            if ($org) $orgs[] = $this->orgCard($ctx, $ctx->t($key), $org, 56);
        }
        $intro = $d->projectIntro !== ''
            ? '<p style="font-size:'.$ctx->body(9.8).'pt;line-height:1.5;">'.self::e($ctx->prose('project_intro', $d->projectIntro)).'</p>'
            : '';
        $html = $this->heading($ctx, $ctx->t('project'));
        if ($ctx->density->level >= 3) {
            // Deep synthesis: partners and target countries on one compact strip.
            return $html.($intro !== '' ? $intro.'<div style="height:'.self::mm($ctx->sp(3)).';"></div>' : '').$this->projectStrip($ctx, $W);
        }
        if ($intro !== '' && $orgs) {
            $html .= '<table style="width:'.self::mm($W).';"><tr><td style="width:'.self::mm($W - 66).';">'.$intro.'</td><td style="width:10mm;"></td>'
                .'<td style="width:56mm;">'.implode('<div style="height:'.self::mm($ctx->sp(3)).';"></div>', $orgs).'</td></tr></table>';
        } elseif ($orgs) {
            $cells = '';
            foreach ($orgs as $o) $cells .= '<td style="width:'.self::mm($W / 2).';">'.$o.'</td>';
            $html .= '<table style="width:'.self::mm($W).';"><tr>'.$cells.(count($orgs) === 1 ? '<td></td>' : '').'</tr></table>';
        } else {
            $html .= $intro;
        }
        $grid = $this->academies($ctx, $W);
        return $html.($grid !== '' ? '<div style="height:'.self::mm($ctx->sp(4)).';"></div>'.$grid : '');
    }

    /** Target academies as a 4-up grid of country cards; long lists are synthesised with "+N". */
    private function academies(RenderContext $ctx, float $w): string
    {
        $d = $ctx->data;
        if (! $d->academies) return '';
        if ($ctx->density->level >= 2) {
            // Last resort before refusing: countries only, clubs summarised.
            return $this->projectStrip($ctx, $w, false);
        }
        $p = $d->palette;
        $groups = $ctx->take('academies', $d->academies);
        $perRow = 4;
        $gap = 3.0;
        $cardW = ($w - ($perRow - 1) * $gap) / $perRow;
        $cap = $ctx->density->cap('academy_clubs');
        $cards = [];
        $shownClubs = 0;
        $totalClubs = 0;
        foreach ($groups as $g) {
            $clubs = $g['clubs'];
            $shown = array_slice($clubs, 0, $cap);
            $totalClubs += count($clubs);
            $shownClubs += count($shown);
            $body = '';
            $logos = array_filter($shown, static fn ($c) => $c['logo']);
            if ($logos) {
                $body .= '<div style="margin-bottom:1.2mm;">';
                foreach ($logos as $c) $body .= '<span style="display:inline-block;width:7mm;height:7mm;margin-right:1.4mm;">'.$this->img($c['logo'], 7, 7).'</span>';
                $body .= '</div>';
            }
            $names = array_values(array_filter(array_map(static fn ($c) => $c['name'], $shown)));
            $body .= '<div class="bm" style="font-size:'.$ctx->pt(8.6, 7.8).'pt;line-height:1.35;color:'.$p['secondary'].';">'.implode('<br>', array_map([self::class, 'e'], $names)).'</div>';
            if (count($clubs) > count($shown)) {
                $body .= '<div class="cm" style="margin-top:0.8mm;color:'.$p['accent'].';font-size:'.$ctx->pt(8, 7).'pt;">'.self::e($ctx->t('more', count($clubs) - count($shown))).'</div>';
            }
            $cards[] = '<div style="background:'.$p['panel'].';border-top:0.5mm solid '.$p['accent'].';padding:'.self::mm($ctx->sp(2.4)).' 2.6mm;">'
                .'<div class="c" style="font-weight:bold;font-size:'.$ctx->pt(9.5, 8.5).'pt;letter-spacing:0.6pt;line-height:1.15;margin-bottom:1.4mm;">'.$this->flag($g['flag'], 2.6, 'margin-right:1.4mm;').'<span style="vertical-align:middle;">'.self::e($g['country']).'</span></div>'
                .$body.'</div>';
        }
        $ctx->note('academy_clubs', $shownClubs, $totalClubs);

        $rows = '';
        foreach (array_chunk($cards, $perRow) as $i => $chunk) {
            $rows .= '<tr>';
            for ($k = 0; $k < $perRow; $k++) {
                $rows .= '<td style="width:'.self::mm($cardW).';'.($k > 0 ? 'padding-left:'.self::mm($gap).';' : '').($i > 0 ? 'padding-top:'.self::mm($gap).';' : '').'">'.($chunk[$k] ?? '').'</td>';
            }
            $rows .= '</tr>';
        }
        $more = count($d->academies) > count($groups)
            ? '<div class="cm" style="margin-top:1.6mm;font-size:'.$ctx->pt(8.5, 7.5).'pt;color:'.$p['accent'].';">'.self::e($ctx->t('more', count($d->academies) - count($groups))).'</div>'
            : '';
        return $this->caps($ctx, $ctx->t('targets'), $p['accent'], 7.2, 0.2, 'margin-bottom:2mm;')
            .'<table style="width:'.self::mm($w).';table-layout:fixed;">'.$rows.'</table>'.$more;
    }

    private function orgCard(RenderContext $ctx, string $title, array $org, float $w): string
    {
        $p = $ctx->data->palette;
        $html = $this->caps($ctx, $title, $p['accent'], 7.2, 0.2, 'margin-bottom:1.8mm;');
        if ($org['logo']) $html .= '<div style="height:12mm;margin-bottom:1.6mm;">'.$this->img($org['logo'], min($w, 42), 12, '', 'left').'</div>';
        if ($org['name'] !== '') $html .= '<div class="c" style="font-weight:bold;font-size:'.$ctx->pt(12, 10).'pt;letter-spacing:0.8pt;">'.self::e($org['name']).'</div>';
        if ($org['country'] !== '') $html .= '<div class="cm" style="font-size:'.$ctx->pt(8.5, 7.5).'pt;letter-spacing:0.6pt;color:'.$p['muted'].';margin-top:0.8mm;">'.$this->flag($org['flag'], 2.4, 'margin-right:1.2mm;').self::e($org['country']).'</div>';
        if ($org['description'] !== '') $html .= '<p style="font-size:'.$ctx->body(9).'pt;line-height:1.4;color:'.$p['secondary'].';margin-top:1.6mm;">'.self::e($ctx->prose('org_description', $org['description'])).'</p>';
        return '<div style="border-left:0.6mm solid '.$p['accent'].';padding-left:3.5mm;">'.$html.'</div>';
    }
}
