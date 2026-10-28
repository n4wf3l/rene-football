<?php

namespace App\Services\Presentations\Fiche\Compositions;

use App\Services\Presentations\Fiche\FichePage;
use App\Services\Presentations\Fiche\FicheTheme;
use App\Services\Presentations\Fiche\RenderContext;

/**
 * A — Signature Editorial. Agency poster: the photograph dominates, the name
 * is set monumental (behind a detoured player, in front of a framed photo),
 * a single line of key facts, then two editorial columns chosen by
 * `middle_variant`, an optional gallery and a project strip.
 */
class SignatureComposition extends FicheComposition
{
    use FicheBlocks;

    private const M = FichePage::MARGIN_MM;
    private const W = FichePage::WIDTH_MM - 2 * FichePage::MARGIN_MM;

    /** Set when the hero has no room for the "joined from" chip: the facts line carries it instead. */
    private bool $cameFromInFacts = false;

    public static function label(): string
    {
        return 'Signature Editorial';
    }

    public static function description(): string
    {
        return 'Affiche d’agence : photo dominante, nom monumental, faits clés sur une ligne, deux colonnes éditoriales. Impressionnante même avec peu de données.';
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="84" fill="#0a0a0a"/>'
            .'<rect x="26" y="0" width="34" height="46" fill="#2a2a2a"/><rect x="4" y="30" width="40" height="11" fill="#d4a017"/>'
            .'<rect x="4" y="25" width="16" height="3" fill="#fff"/><rect x="4" y="50" width="52" height="5" fill="none" stroke="#555" stroke-width="0.6"/>'
            .'<rect x="4" y="59" width="28" height="2" fill="#777"/><rect x="4" y="63" width="26" height="2" fill="#777"/><rect x="36" y="59" width="20" height="2" fill="#d4a017"/><rect x="36" y="63" width="20" height="2" fill="#777"/>'
            .'<rect x="0" y="78" width="60" height="6" fill="#d4a017"/></svg>';
    }

    public function render(RenderContext $ctx): string
    {
        $d = $ctx->data;

        // Spare room from the measuring pass: the photograph takes it first,
        // then the vertical rhythm between sections.
        $heroExtra = min(48.0, $ctx->elastic);
        $restExtra = $ctx->elastic - $heroExtra;
        $heroH = ($d->photo ? 70 + 80 * $ctx->density->space : 60 + 58 * $ctx->density->space) + $heroExtra;

        $this->cameFromInFacts = false;
        [$hero, $heroH] = $this->hero($ctx, $heroH);
        $sections = array_values(array_filter([
            $this->facts($ctx),
            $this->columns($ctx),
            $this->galleryRow($ctx, self::W, $ctx->sp(34) + min(12.0, $restExtra * 0.3)),
            $this->projectBlock($ctx),
        ]));
        $gap = $ctx->sp(6.5) + ($sections ? $restExtra * ($d->gallery ? 0.7 : 1) / (count($sections) + 1) : 0);

        $body = '';
        foreach ($sections as $i => $s) {
            $body .= '<div style="margin-top:'.self::mm($i === 0 ? 0 : $gap).';">'.$s.'</div>';
        }

        $html = $hero
            .($body !== '' ? $this->box(self::M, $heroH + $gap, self::W, null, $body, 'z-index:5;', 'data-block="body" data-limit="1"') : '')
            .$this->footer($ctx, true);

        return $this->document($ctx, $html);
    }

    // ------------------------------------------------------------------ hero

    /** @return array{0:string,1:float} markup and final hero height (grown if the name needs it) */
    private function hero(RenderContext $ctx, float $H): array
    {
        // The name is anchored to the hero bottom: if its stack would climb
        // into the brand block, the hero grows instead of the name shrinking.
        [, $probeTop] = $this->nameStack($ctx, $H, $this->nameWidth($ctx, $H), $this->nameMax($ctx), ! ($ctx->data->photo && $ctx->data->photo->cutout));
        $minTop = 40.0;
        if ($probeTop < $minTop) $H += $minTop - $probeTop;

        $d = $ctx->data;
        $p = $d->palette;
        $right = $d->photoSide === 'right';
        $out = '';

        // Brand, always on the text side.
        $brandX = $right ? self::M : FichePage::WIDTH_MM - self::M - 62;
        $brand = ($d->logo ? '<div style="height:12mm;">'.$this->img($d->logo, 42, 12, '', $right ? 'left' : 'right').'</div>' : '')
            .($d->tagline !== '' ? $this->caps($ctx, $d->tagline, $p['secondary'], 7, 0.3, 'margin-top:1.8mm;'.($right ? '' : 'text-align:right;')) : '')
            .($d->headerMotto !== '' ? $this->caps($ctx, $d->headerMotto, $p['accent'], 7, 0.3, 'margin-top:1mm;'.($right ? '' : 'text-align:right;')) : '');
        $out .= $this->box($brandX, 11, 62, null, $brand, 'z-index:6;', 'data-block="brand"');

        if ($d->photo && $d->photo->cutout) {
            [$pw, $ph] = $d->photo->fitWithin(128, $H - 14);
            $px = $right ? FichePage::WIDTH_MM - $pw - 3 : 3;
            $out .= $this->photo($ctx, $px, $H - $ph, $pw, $ph, 'data-block="photo"', 'z-index:3;');
            // Soft landing of the cut-out into the page (under the photo only).
            $out .= $this->box($px, $H - 24, $pw, 24.5, $this->rawImg($ctx->assets->fade($p['bg'], 'bottom'), $pw, 24.5), 'z-index:4;');
            // The name runs behind the player but only the first ~20 % of the
            // photo overlaps it, so the surname stays legible.
            [$name, $nameTop] = $this->nameStack($ctx, $H, $this->nameWidth($ctx, $H), $this->nameMax($ctx), false);
            $out .= $name;
        } elseif ($d->photo) {
            $pw = 124.0;
            $px = $right ? FichePage::WIDTH_MM - $pw : 0;
            $out .= $this->photo($ctx, $px, 0, $pw, $H, 'data-block="photo"', 'z-index:1;');
            $fadeX = $right ? $px - 0.5 : $px + $pw - 40;
            $out .= $this->box($fadeX, 0, 40.5, $H, $this->rawImg($ctx->assets->fade($p['bg'], $right ? 'left' : 'right'), 40.5, $H), 'z-index:2;');
            $out .= $this->box(0, $H - 36, FichePage::WIDTH_MM, 36.5, $this->rawImg($ctx->assets->fade($p['bg'], 'bottom'), FichePage::WIDTH_MM, 36.5), 'z-index:2;');
            [$name, $nameTop] = $this->nameStack($ctx, $H, $this->nameWidth($ctx, $H), $this->nameMax($ctx), true);
            $out .= $name;
        } else {
            $out .= $this->watermark($ctx, $right ? 96 : -6, 6, 380, 0.05);
            [$name, $nameTop] = $this->nameStack($ctx, $H, $this->nameWidth($ctx, $H), $this->nameMax($ctx), true);
            $out .= $name;
        }

        $out .= $this->cameFrom($ctx, $H, $nameTop);
        return [$out, $H];
    }

    /** Width the surname may use: the text side (plus a little overlap behind a cut-out). */
    private function nameWidth(RenderContext $ctx, float $H): float
    {
        $d = $ctx->data;
        if (! $d->photo) return self::W;
        if (! $d->photo->cutout) return 158.0;
        [$pw] = $d->photo->fitWithin(128, $H - 14);
        $textCol = FichePage::WIDTH_MM - $pw - 3 - self::M;
        return max(96.0, min(self::W, $textCol + $pw * 0.2));
    }

    private function nameMax(RenderContext $ctx): float
    {
        $d = $ctx->data;
        return ! $d->photo ? 200.0 : ($d->photo->cutout ? 190.0 : 120.0);
    }

    /**
     * Position eyebrow, first name, monumental last name — anchored to the hero bottom.
     *
     * @return array{0:string,1:float} markup and top edge (mm)
     */
    private function nameStack(RenderContext $ctx, float $H, float $width, float $maxPt, bool $front): array
    {
        $d = $ctx->data;
        $p = $d->palette;
        $right = $d->photoSide === 'right';
        [$lastLines, $size, $hLast] = $this->displayLines($ctx, $d->lastName, $width, $maxPt, 44);
        $firstPt = $ctx->pt(min(30, max(20, $size * 0.24)), 16);
        $hFirst  = FichePage::ptToMm($firstPt * 1.05);
        $hEye    = $d->position ? 6.0 : 0.0;
        $top     = $H - 7 - $hLast - $hFirst - $hEye;
        $x       = $right || ! $d->photo ? self::M : FichePage::WIDTH_MM - self::M - $width;
        $align   = $right || ! $d->photo ? 'left' : 'right';

        $inner = ($d->position
                ? '<div class="c" style="font-weight:bold;font-size:'.$ctx->pt(11, 9).'pt;letter-spacing:3pt;color:'.$p['accent'].';height:6mm;text-align:'.$align.';">'.self::e($d->position).'</div>'
                : '')
            .($d->firstName !== ''
                ? '<div class="c" style="font-size:'.$firstPt.'pt;letter-spacing:'.round($firstPt * 0.12, 1).'pt;line-height:1;color:'.$p['text'].';height:'.self::mm($hFirst).';text-align:'.$align.';">'.self::e($d->firstName).'</div>'
                : '')
            .'<div class="d" style="font-size:'.$size.'pt;color:'.($front ? $p['text'] : $p['accent']).';text-align:'.$align.';">'.$this->displayHtml($lastLines).'</div>';

        return [$this->box($x, $top, $width, null, $inner, 'z-index:'.($front ? 5 : 2).';', 'data-block="name" data-avoid="brand"'), $top];
    }

    /** "Joined from" chip, on the text side just above the name (never over the face). */
    private function cameFrom(RenderContext $ctx, float $H, float $nameTop): string
    {
        $d = $ctx->data;
        if (! $d->previousClub) return '';
        $p = $d->palette;
        $right = $d->photoSide === 'right' || ! $d->photo;
        $w = 52.0;
        $h = 17.0;
        $y = $nameTop - $h - 7;
        $x = $right ? self::M : FichePage::WIDTH_MM - self::M - $w;
        // Not enough room between brand and name: never over the photo, the facts line takes it.
        $this->cameFromInFacts = $y < 36;
        if ($this->cameFromInFacts) return '';
        $inner = $this->caps($ctx, $ctx->t('came_from'), $p['accent'], 6.8, 0.2, 'margin-bottom:1.2mm;')
            .'<table><tr>'
            .($d->previousClubLogo ? '<td style="width:8mm;vertical-align:middle;">'.$this->img($d->previousClubLogo, 6.5, 6.5).'</td>' : '')
            .'<td class="c" style="vertical-align:middle;font-weight:bold;font-size:'.$ctx->pt(10, 8.5).'pt;letter-spacing:0.6pt;color:'.$p['text'].';">'.self::e($d->previousClub).'</td>'
            .'</tr></table>';
        return $this->box($x, $y, $w, null, $inner,
            'z-index:6;padding:2mm 3mm;background:'.FicheTheme::rgba($p['bg'], 0.82).';border-left:0.7mm solid '.$p['accent'].';',
            'data-block="came-from" data-avoid="brand name"');
    }

    // ------------------------------------------------------------------ body

    private function facts(RenderContext $ctx): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $facts = [];
        if ($d->birthDate) {
            $facts[] = [$ctx->t('born'), self::e($d->birthDate).($d->age ? '<span style="color:'.$p['muted'].';"> · '.self::e($ctx->t('years_old', $d->age)).'</span>' : '')];
        } elseif ($d->age) {
            $facts[] = [$ctx->t('age'), self::e($ctx->t('years_old', $d->age))];
        }
        if ($d->nationalities) {
            $v = [];
            foreach ($d->nationalities as $n) $v[] = $this->flag($n['flag'], 2.6, 'margin-right:1.2mm;').self::e($n['label']);
            $facts[] = [$ctx->t('nationality'), implode('<br>', $v)];
        }
        if ($d->club) {
            $facts[] = [$ctx->t('club'), ($d->clubLogo ? '<span style="display:inline-block;width:5mm;height:5mm;vertical-align:middle;margin-right:1.4mm;">'.$this->img($d->clubLogo, 5, 5).'</span>' : '').self::e($d->club)];
        }
        if ($d->positionDetail) {
            $facts[] = [$ctx->t('position'), self::e($d->positionDetail)];
        } elseif ($d->category && mb_strtolower((string) $d->category) !== mb_strtolower((string) $d->position)) {
            $facts[] = [$ctx->t('position'), self::e($d->category)];
        }
        if ($d->foot) $facts[] = [$ctx->t('foot'), self::e($d->foot)];
        if ($this->cameFromInFacts && $d->previousClub) $facts[] = [$ctx->t('came_from'), self::e($d->previousClub)];
        if ($d->height) $facts[] = [$ctx->t('height'), self::e($d->height)];
        if ($d->languages) $facts[] = [$ctx->t('languages'), self::e(implode(', ', $ctx->take('languages', $d->languages)))];
        if (! $facts) return '';

        $facts = array_slice($facts, 0, 6);
        $n = count($facts);
        $cells = '';
        foreach ($facts as $i => [$label, $value]) {
            $cells .= '<td style="width:'.round(100 / $n, 3).'%;padding:'.self::mm($ctx->sp(2.6)).' 3mm '.self::mm($ctx->sp(2.6)).' '.($i === 0 ? '0' : '3.5mm').';'.($i > 0 ? 'border-left:0.25mm solid '.$p['rule'].';' : '').'">'
                .$this->caps($ctx, $label, $p['muted'], 7, 0.18, 'margin-bottom:1.2mm;')
                .'<div class="c" style="font-weight:bold;font-size:'.$ctx->pt(11.5, 9.5).'pt;letter-spacing:0.4pt;line-height:1.2;color:'.$p['text'].';">'.$value.'</div>'
                .'</td>';
        }
        return '<table style="width:'.self::mm(self::W).';table-layout:fixed;border-top:0.35mm solid '.$p['accent'].';border-bottom:0.25mm solid '.$p['rule'].';"><tr>'.$cells.'</tr></table>';
    }

    /** Two editorial columns; `middle_variant` decides what goes where, empty blocks fall back. */
    private function columns(RenderContext $ctx): string
    {
        $d = $ctx->data;
        $lw = 104.0;
        $rw = self::W - $lw - 10;

        $profile = fn (float $w) => $d->bio !== '' || $d->scoutQuote !== '' ? $this->heading($ctx, $ctx->t('profile')).$this->prose($ctx) : '';
        $strengths = fn (float $w, string $key = 'strengths') => $d->strengths ? $this->heading($ctx, $ctx->t($key)).$this->numberedList($ctx, $d->strengths, $w) : '';
        $caracs = fn (float $w) => $d->hasCharacteristics() ? $this->heading($ctx, $ctx->t('characteristics')).$this->characteristics($ctx, $w) : '';
        $career = fn (float $w) => $d->career ? $this->heading($ctx, $ctx->t('career')).$this->careerRows($ctx, $w) : '';
        $bars = fn (float $w) => $d->bars ? $this->heading($ctx, $ctx->t('player_profile')).$this->bars($ctx, $w) : '';

        [$left, $right] = match ($d->middleVariant) {
            'profile-caracteristiques' => [[$strengths, $profile], [$caracs, $bars]],
            'parcours-strengths'       => [[$career, $profile], [fn (float $w) => $strengths($w, 'qualities'), $caracs]],
            'profile-bars'             => [[$profile, $caracs], [$bars, $strengths]],
            default                    => [[$profile, $caracs], [$strengths, $bars]],
        };

        // First non-empty candidate per column, then the secondary one if the primary is short.
        $l = $this->stack($ctx, $left, $lw);
        $r = $this->stack($ctx, $right, $rw);
        if ($l === '' && $r === '') return '';
        if ($l === '' || $r === '') {
            return $l.$r;
        }
        return '<table style="width:'.self::mm(self::W).';"><tr>'
            .'<td style="width:'.self::mm($lw).';">'.$l.'</td><td style="width:10mm;"></td>'
            .'<td style="width:'.self::mm($rw).';">'.$r.'</td></tr></table>';
    }

    /** @param callable[] $candidates */
    private function stack(RenderContext $ctx, array $candidates, float $w): string
    {
        $out = [];
        foreach ($candidates as $c) {
            $html = $c($w);
            if ($html !== '') $out[] = $html;
        }
        return implode('<div style="height:'.self::mm($ctx->sp(5)).';"></div>', $out);
    }

    private function projectBlock(RenderContext $ctx): string
    {
        if (! $ctx->data->hasProject()) return '';
        $strip = $this->projectStrip($ctx, self::W);
        $intro = $ctx->data->projectIntro !== ''
            ? '<p style="font-size:'.$ctx->body(9.5).'pt;line-height:1.45;color:'.$ctx->data->palette['secondary'].';margin-bottom:'.self::mm($ctx->sp(2.5)).';">'.self::e($ctx->prose('project_intro', $ctx->data->projectIntro)).'</p>'
            : '';
        return $this->heading($ctx, $ctx->t('project')).$intro.$strip;
    }
}
