<?php

namespace App\Services\Presentations\Fiche\Compositions;

use App\Services\Presentations\Fiche\FicheImage;
use App\Services\Presentations\Fiche\FichePage;
use App\Services\Presentations\Fiche\FicheTheme;
use App\Services\Presentations\Fiche\FontMeasure;
use App\Services\Presentations\Fiche\RenderContext;

/**
 * Shared vocabulary of the premium compositions: document shell with the
 * embedded type system, measured display type, exact-ratio images, vector
 * icons, section headings and the contact footer.
 *
 * Layout model: the page is built from absolutely positioned regions in mm.
 * Regions whose height depends on content are marked data-limit so the
 * renderer can check them against the footer; fixed regions are data-fit.
 * Every composition consumes `$ctx->elastic` (spare mm measured by the
 * engine) to grow its hero / rhythm on the second pass.
 */
abstract class FicheComposition
{
    abstract public static function label(): string;

    abstract public static function description(): string;

    abstract public static function thumbnailSvg(): string;

    abstract public function render(RenderContext $ctx): string;

    // ---------------------------------------------------------------- document

    protected function document(RenderContext $ctx, string $body): string
    {
        $p    = $ctx->data->palette;
        $dir  = str_replace('\\', '/', FontMeasure::dir());
        $face = static fn (string $family, string $file, string $weight = 'normal', string $style = 'normal') =>
            "@font-face{font-family:'$family';src:url('$dir/$file') format('truetype');font-weight:$weight;font-style:$style;}";

        $display = $ctx->data->fontFamily === 'grotesque' ? FontMeasure::DISPLAY_X : FontMeasure::DISPLAY;
        $bodyFont = $ctx->data->fontFamily === 'editorial' ? "'Times', serif" : "'FicheBody', sans-serif";

        $css = implode('', [
            $face('FicheDisplay', $display),
            $face('FicheCond', 'BarlowCondensed-SemiBold.ttf'),
            $face('FicheCond', 'BarlowCondensed-Bold.ttf', 'bold'),
            $face('FicheCondMed', 'BarlowCondensed-Medium.ttf'),
            $face('FicheBody', 'Barlow-Regular.ttf'),
            $face('FicheBody', 'Barlow-SemiBold.ttf', 'bold'),
            $face('FicheBody', 'Barlow-Italic.ttf', 'normal', 'italic'),
            $face('FicheBodyMed', 'Barlow-Medium.ttf'),
            $face('FicheBodyMed', 'Barlow-Bold.ttf', 'bold'),
        ]);

        return '<!DOCTYPE html><html lang="'.$ctx->data->lang.'"><head><meta charset="utf-8"><style>'
            .$css
            .'@page{size:210mm 297mm;margin:0;}'
            .'html,body{margin:0;padding:0;}'
            .'body{background:'.$p['bg'].';color:'.$p['text'].';font-family:'.$bodyFont.';font-size:'.$ctx->body().'pt;line-height:1.42;}'
            .'.a{position:absolute;}'
            .'.d{font-family:\'FicheDisplay\';font-weight:normal;line-height:0.86;text-transform:uppercase;}'
            .'.c{font-family:\'FicheCond\';text-transform:uppercase;}'
            .'.cm{font-family:\'FicheCondMed\';text-transform:uppercase;}'
            .'.bm{font-family:\'FicheBodyMed\';}'
            .'table{border-collapse:collapse;}td{padding:0;vertical-align:top;}'
            .'p{margin:0;}'
            .'</style></head><body>'
            // Full-page background as an element: DomPDF paints body background per page box only.
            .'<div class="a" style="left:0;top:0;width:210mm;height:297mm;background:'.$p['bg'].';"></div>'
            .$body
            .'</body></html>';
    }

    // ---------------------------------------------------------------- primitives

    protected static function e(?string $v): string
    {
        return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    protected static function mm(float $v): string
    {
        return rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.').'mm';
    }

    /** Absolutely positioned box. */
    protected function box(float $x, float $y, ?float $w, ?float $h, string $inner, string $style = '', string $attrs = ''): string
    {
        return '<div class="a" '.$attrs.' style="left:'.self::mm($x).';top:'.self::mm($y).';'
            .($w !== null ? 'width:'.self::mm($w).';' : '')
            .($h !== null ? 'height:'.self::mm($h).';' : '')
            .$style.'">'.$inner.'</div>';
    }

    /** <img> sized to exactly the image's aspect ratio inside a w × h box (never stretched). */
    protected function img(?FicheImage $img, float $w, float $h, string $style = '', string $align = 'center'): string
    {
        if (! $img) return '';
        [$iw, $ih] = $img->fitWithin($w, $h);
        $pad = match ($align) {
            'left'  => 'margin-top:'.self::mm(($h - $ih) / 2).';',
            'right' => 'margin-top:'.self::mm(($h - $ih) / 2).';margin-left:'.self::mm($w - $iw).';',
            default => 'margin-top:'.self::mm(($h - $ih) / 2).';margin-left:'.self::mm(($w - $iw) / 2).';',
        };
        return '<img src="'.self::e(self::src($img->path)).'" style="display:block;width:'.self::mm($iw).';height:'.self::mm($ih).';'.$pad.$style.'">';
    }

    /** Raw image at a precise size (the caller guarantees the ratio). */
    protected function rawImg(string $path, float $w, float $h, string $style = ''): string
    {
        return '<img src="'.self::e(self::src($path)).'" style="display:block;width:'.self::mm($w).';height:'.self::mm($h).';'.$style.'">';
    }

    protected static function src(string $path): string
    {
        return str_replace('\\', '/', $path);
    }

    /**
     * Photo framed in a region following the editor's framing controls.
     * Returns positioned markup for a frame at (x, y, w, h).
     */
    protected function photo(RenderContext $ctx, float $x, float $y, float $w, float $h, string $attrs = '', string $style = ''): string
    {
        $d = $ctx->data;
        if (! $d->photo) return '';
        $f = $ctx->assets->frame($d->photo, $w, $h, $d->photoFit, $d->photoZoom, $d->photoX, $d->photoY);
        return $this->box($x + $f['left'], $y + $f['top'], $f['width'], $f['height'],
            $this->rawImg($f['image']->path, $f['width'], $f['height']), $style, $attrs);
    }

    /** Uppercase condensed label. */
    protected function caps(RenderContext $ctx, string $text, ?string $color = null, float $size = 7.2, float $tracking = 0.16, string $extra = ''): string
    {
        $color ??= $ctx->data->palette['muted'];
        return '<div class="c" style="font-size:'.$ctx->pt($size, 6.5).'pt;letter-spacing:'.round($size * $tracking, 2).'pt;color:'.$color.';line-height:1.15;'.$extra.'">'.self::e($text).'</div>';
    }

    /** Section heading: accent tick + condensed caps, optional hairline. */
    protected function heading(RenderContext $ctx, string $text, float $marginBottom = 3.2, bool $rule = true): string
    {
        $p = $ctx->data->palette;
        return '<table style="width:100%;margin-bottom:'.self::mm($ctx->sp($marginBottom)).';"><tr>'
            .'<td style="width:4mm;vertical-align:middle;"><div style="width:2.6mm;height:2.6mm;background:'.$p['accent'].';"></div></td>'
            .'<td style="vertical-align:middle;white-space:nowrap;"><span class="c" style="font-weight:bold;font-size:'.$ctx->pt(10.5, 8.5).'pt;letter-spacing:'.$ctx->pt(1.6, 1).'pt;color:'.$p['text'].';">'.self::e($text).'</span></td>'
            .($rule ? '<td style="width:100%;vertical-align:middle;padding-left:3mm;"><div style="height:0.25mm;background:'.$p['rule'].';"></div></td>' : '')
            .'</tr></table>';
    }

    /**
     * Display name sized to the measured width available.
     *
     * @return array{0:float,1:float} [size pt, rendered height mm]
     */
    protected function displaySize(RenderContext $ctx, string $text, float $maxWidthMm, float $maxPt, float $minPt): array
    {
        [, $size, $h] = $this->displayLines($ctx, $text, $maxWidthMm, $maxPt, $minPt);
        return [$size, $h];
    }

    /**
     * Monumental name set on one line when it fits, otherwise on two (then
     * three) balanced lines split at spaces or hyphens — each line measured
     * with the real glyph widths so nothing ever crosses the column.
     *
     * @return array{0:string[],1:float,2:float} [lines, size pt, height mm]
     */
    protected function displayLines(RenderContext $ctx, string $text, float $width, float $maxPt, float $minPt): array
    {
        $file = $ctx->data->fontFamily === 'grotesque' ? FontMeasure::DISPLAY_X : FontMeasure::DISPLAY;
        $fits = static fn (string $t, float $pt) => FontMeasure::width(mb_strtoupper($t), $file, $pt, 0.005 * $pt) <= $width;
        $fit  = static fn (string $t) => FontMeasure::fit(mb_strtoupper($t), $file, $width, $maxPt, $minPt, 0.005);
        $height = static fn (int $n, float $pt) => $n * FichePage::ptToMm($pt * 0.86) + ($n - 1) * FichePage::ptToMm($pt * 0.08);

        $one = $fit($text);
        if ($fits($text, $one) && $one >= min($maxPt, $minPt * 1.25)) return [[$text], $one, $height(1, $one)];

        // Tokens keep their trailing hyphen so "Adebayo-Christensen" can break after "-".
        $tokens = preg_split('/(?<=-)|\s+/u', trim($text), -1, PREG_SPLIT_NO_EMPTY) ?: [$text];
        $join = static function (array $parts): string {
            $out = '';
            foreach ($parts as $p) $out .= ($out === '' || str_ends_with($out, '-') ? '' : ' ').$p;
            return $out;
        };
        $best = [[$text], $one];
        for ($lines = 2; $lines <= 3 && count($tokens) >= $lines; $lines++) {
            foreach (self::splits(count($tokens), $lines) as $cuts) {
                $parts = [];
                $start = 0;
                foreach ([...$cuts, count($tokens)] as $end) {
                    $parts[] = $join(array_slice($tokens, $start, $end - $start));
                    $start = $end;
                }
                $size = min(array_map($fit, $parts));
                $ok = ! in_array(false, array_map(static fn ($p) => $fits($p, $size), $parts), true);
                if ($ok && ($size > $best[1] || ! $fits(implode(' ', $best[0]), $best[1]))) $best = [$parts, $size];
            }
            $allFit = ! in_array(false, array_map(static fn ($p) => $fits($p, $best[1]), $best[0]), true);
            if ($allFit && count($best[0]) > 1) break;
        }
        // Stacked names stay monumental but never taller than ~1.5 single lines.
        $size = count($best[0]) > 1 ? min($best[1], $maxPt * 0.72) : $best[1];
        return [$best[0], $size, $height(count($best[0]), $size)];
    }

    /** @return int[][] every way to cut n tokens into k non-empty lines (cut positions). */
    private static function splits(int $n, int $k): array
    {
        if ($k === 2) return array_map(static fn ($i) => [$i], range(1, $n - 1));
        $out = [];
        for ($i = 1; $i < $n - 1; $i++) {
            for ($j = $i + 1; $j < $n; $j++) $out[] = [$i, $j];
        }
        return $out;
    }

    /** HTML for display lines (one nowrap line each). */
    protected function displayHtml(array $lines): string
    {
        return implode('<br>', array_map(static fn ($l) => '<span style="white-space:nowrap;">'.self::e($l).'</span>', $lines));
    }

    /** Lines needed to set `$text` in a width (mm), from real glyph widths. */
    protected function lines(string $text, string $file, float $sizePt, float $widthMm, bool $upper = false, float $trackingPt = 0.0): int
    {
        $text = $upper ? mb_strtoupper($text) : $text;
        $lines = 0;
        foreach (preg_split('/\R/u', $text) ?: [''] as $para) {
            $lines++;
            $current = 0.0;
            $space = FontMeasure::width(' ', $file, $sizePt, $trackingPt);
            foreach (preg_split('/\s+/u', trim($para)) ?: [] as $word) {
                $w = FontMeasure::width($word, $file, $sizePt, $trackingPt);
                if ($current > 0 && $current + $space + $w > $widthMm) {
                    $lines++;
                    $current = $w;
                } else {
                    $current += ($current > 0 ? $space : 0) + $w;
                }
            }
        }
        return $lines;
    }

    // ---------------------------------------------------------------- icons

    /** Vector icon as an SVG image (DomPDF draws <img> SVG strokes reliably). */
    protected function icon(string $name, string $color, float $sizeMm = 4.2, string $style = ''): string
    {
        $s  = 'fill="none" stroke="'.$color.'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
        $sf = 'fill="'.$color.'" stroke="none"';
        $paths = match ($name) {
            'calendar' => '<rect x="3.5" y="5.5" width="17" height="15" rx="1.5" '.$s.'/><line x1="3.5" y1="10" x2="20.5" y2="10" '.$s.'/><line x1="8" y1="3" x2="8" y2="7" '.$s.'/><line x1="16" y1="3" x2="16" y2="7" '.$s.'/>',
            'globe'    => '<circle cx="12" cy="12" r="8.5" '.$s.'/><ellipse cx="12" cy="12" rx="3.8" ry="8.5" '.$s.'/><line x1="3.5" y1="12" x2="20.5" y2="12" '.$s.'/>',
            'pitch'    => '<rect x="3" y="5" width="18" height="14" '.$s.'/><line x1="12" y1="5" x2="12" y2="19" '.$s.'/><circle cx="12" cy="12" r="2.6" '.$s.'/><rect x="3" y="9" width="3" height="6" '.$s.'/><rect x="18" y="9" width="3" height="6" '.$s.'/>',
            'shield'   => '<path d="M12 3 L4.5 6 V11.5 C4.5 15.8 7.8 19.2 12 21 C16.2 19.2 19.5 15.8 19.5 11.5 V6 Z" '.$s.'/>',
            'boot'     => '<path d="M5 5 H10 V12 C13 12.6 16.5 13.6 18.5 15 C19.6 15.8 20 16.8 20 18 V19 H5 Z" '.$s.'/><line x1="5" y1="16" x2="20" y2="16" '.$s.'/>',
            'speech'   => '<path d="M4 5 H14 V13 H9 L6 16 V13 H4 Z" '.$s.'/><path d="M11 15 H17 L20 18 V10 H17" '.$s.'/>',
            'ruler'    => '<rect x="8" y="3" width="8" height="18" rx="1" '.$s.'/><line x1="8" y1="7" x2="11" y2="7" '.$s.'/><line x1="8" y1="11" x2="12" y2="11" '.$s.'/><line x1="8" y1="15" x2="11" y2="15" '.$s.'/>',
            'check'    => '<circle cx="12" cy="12" r="9" '.$s.'/><path d="M7.5 12.2 L10.6 15.2 L16.5 9" '.$s.'/>',
            'arrow'    => '<path d="M5 12 H19 M14 7 L19 12 L14 17" '.$s.'/>',
            'insta'    => '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" '.$s.'/><circle cx="12" cy="12" r="4" '.$s.'/><circle cx="17" cy="7" r="1.1" '.$sf.'/>',
            'mail'     => '<rect x="3" y="5.5" width="18" height="13" rx="1.5" '.$s.'/><path d="M3.5 7 L12 13 L20.5 7" '.$s.'/>',
            'phone'    => '<path d="M6.5 3.5 H9.5 L11 8 L8.8 9.4 C9.8 11.8 12.2 14.2 14.6 15.2 L16 13 L20.5 14.5 V17.5 C20.5 19.2 19.2 20.5 17.5 20.5 C9.8 20.5 3.5 14.2 3.5 6.5 C3.5 4.8 4.8 3.5 6.5 3.5 Z" '.$s.'/>',
            'star'     => '<path d="M12 3.5 L14.6 9 L20.5 9.6 L16 13.6 L17.3 19.5 L12 16.5 L6.7 19.5 L8 13.6 L3.5 9.6 L9.4 9 Z" '.$s.'/>',
            'target'   => '<circle cx="12" cy="12" r="8.5" '.$s.'/><circle cx="12" cy="12" r="4.5" '.$s.'/><circle cx="12" cy="12" r="1.2" '.$sf.'/>',
            default    => '',
        };
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'.$paths.'</svg>';
        return '<img src="data:image/svg+xml;base64,'.base64_encode($svg).'" style="width:'.self::mm($sizeMm).';height:'.self::mm($sizeMm).';'.$style.'">';
    }

    protected function flag(?FicheImage $flag, float $h = 3.0, string $style = ''): string
    {
        if (! $flag) return '';
        $w = $h * $flag->ratio();
        return '<img src="'.self::e(self::src($flag->path)).'" style="width:'.self::mm($w).';height:'.self::mm($h).';vertical-align:middle;'.$style.'">';
    }

    // ---------------------------------------------------------------- shared blocks

    /** Height (mm) of the footer for this data set; compositions plan above it. */
    protected function footerHeight(RenderContext $ctx): float
    {
        $d = $ctx->data;
        $h = $d->qr ? 21.0 : 15.0;
        $compact = $ctx->density->compactFooter();
        if ($d->motto !== '' || ($compact && $d->slogan !== '')) $h += 7.0;
        if ($d->slogan !== '' && ! $compact) $h += 10.0;
        return $h;
    }

    /**
     * Contact footer: optional cursive slogan, motto band, then the contact
     * bar with logo, socials and the QR code (only when a real URL exists).
     * `$filled` = accent bar (marketing look) or quiet panel (report look).
     */
    protected function footer(RenderContext $ctx, bool $filled = true): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $h = $this->footerHeight($ctx);
        $top = FichePage::HEIGHT_MM - $h;
        $bg  = $filled ? $p['accent'] : $p['panel'];
        $ink = $filled ? $p['ink'] : $p['text'];
        $sub = $filled ? FicheTheme::mix($p['ink'], $p['accent'], 0.35) : $p['muted'];
        $out = '';
        $y = 0.0;

        $compact = $ctx->density->compactFooter();
        if ($d->slogan !== '' && ! $compact) {
            $out .= $this->box(FichePage::MARGIN_MM, $y, FichePage::WIDTH_MM - 2 * FichePage::MARGIN_MM, 10,
                '<div style="text-align:right;font-family:\'FicheBody\';font-style:italic;font-size:'.$ctx->pt(13, 10).'pt;color:'.$p['accent'].';line-height:1.1;padding-top:1.5mm;">'.self::e($d->slogan).'</div>',
                '', 'data-fit="1"');
            $y += 10;
        }
        if ($d->motto !== '' || ($compact && $d->slogan !== '')) {
            $band = $compact && $d->slogan !== ''
                // Last-resort footer: motto and slogan share one band.
                ? '<table style="width:'.self::mm(FichePage::WIDTH_MM - 2 * FichePage::MARGIN_MM).';margin-left:'.self::mm(FichePage::MARGIN_MM).';"><tr>'
                    .'<td class="c" style="font-size:'.$ctx->pt(8, 7).'pt;letter-spacing:2pt;color:'.$p['secondary'].';line-height:1;padding-top:2.2mm;">'.self::e($d->motto).'</td>'
                    .'<td style="text-align:right;font-family:\'FicheBody\';font-style:italic;font-size:'.$ctx->pt(10, 9).'pt;color:'.$p['accent'].';line-height:1;padding-top:1.8mm;">'.self::e($d->slogan).'</td>'
                    .'</tr></table>'
                : '<div class="c" style="text-align:center;font-size:'.$ctx->pt(8, 7).'pt;letter-spacing:2.4pt;color:'.$p['secondary'].';line-height:1;padding-top:2.2mm;">'.self::e($d->motto).'</div>';
            $out .= $this->box(0, $y, FichePage::WIDTH_MM, 7, $band, 'background:'.$p['panel'].';', 'data-fit="1"');
            $y += 7;
        }

        $barH = $h - $y;
        $inner = '';
        $logoH = 7.5;
        if ($d->logo) {
            $logo = $filled && FicheTheme::luminance($p['accent']) > 0.45 ? $ctx->assets->brandLogo('black') : $d->logo;
            $inner .= $this->box(FichePage::MARGIN_MM, ($barH - $logoH) / 2, 30, $logoH, $this->img($logo, 30, $logoH, '', 'left'));
        }

        $contacts = [];
        foreach (['instagram' => 'insta', 'email' => 'mail', 'phone' => 'phone'] as $k => $icon) {
            if ($d->contact[$k] !== '') {
                $contacts[] = '<td style="vertical-align:middle;padding:0 3.2mm;white-space:nowrap;">'
                    .$this->icon($icon, $ink, 3.6, 'vertical-align:middle;margin-right:1.6mm;')
                    .'<span class="c" style="vertical-align:middle;font-size:'.$ctx->pt(9, 8).'pt;letter-spacing:0.5pt;color:'.$ink.';text-transform:none;">'.self::e($d->contact[$k]).'</span></td>';
            }
        }
        $qrW = $d->qr ? 16.0 : 0.0;
        $contactsW = FichePage::WIDTH_MM - 2 * FichePage::MARGIN_MM - 34 - ($qrW ? $qrW + 4 : 0);
        if ($contacts) {
            $inner .= $this->box(FichePage::MARGIN_MM + 34, 0, $contactsW, $barH,
                '<table style="height:'.self::mm($barH).';margin-left:auto;margin-right:'.($qrW ? '0' : 'auto').';"><tr>'.implode('', $contacts).'</tr></table>',
                '', 'data-block="footer-contacts" data-fit="1"');
        }
        if ($d->qr) {
            $qx = FichePage::WIDTH_MM - FichePage::MARGIN_MM - $qrW;
            $inner .= $this->box($qx, ($barH - $qrW) / 2 - 1.2, $qrW, $qrW,
                $this->rawImg($d->qr['image']->path, $qrW - 2, $qrW - 2, 'margin:1mm;'),
                'background:#ffffff;');
            $inner .= $this->box($qx - 1, ($barH + $qrW) / 2 - 0.9, $qrW + 2, 3,
                '<div class="cm" style="text-align:center;font-size:6.5pt;letter-spacing:0.6pt;color:'.$sub.';line-height:3mm;">'.self::e($ctx->t('scan')).'</div>');
        }
        $out .= $this->box(0, $y, FichePage::WIDTH_MM, $barH, $inner, 'background:'.$bg.';');

        return $this->box(0, $top, FichePage::WIDTH_MM, $h, $out, '', 'data-block="footer"');
    }

    /** Monogram watermark used behind hero typography. */
    protected function watermark(RenderContext $ctx, float $x, float $y, float $sizePt, float $opacity = 0.06): string
    {
        if (! $ctx->data->watermark) return '';
        return $this->box($x, $y, null, null,
            '<div class="d" style="font-size:'.$sizePt.'pt;color:'.$ctx->data->palette['text'].';opacity:'.$opacity.';">RF</div>',
            'z-index:0;', 'data-bleed="1"');
    }

    /**
     * Compact project strip (supervisor · partner · target countries) for the
     * non-career compositions. One row on wide columns, stacked when narrow.
     * Club names of the target academies are not listed here: recorded as a
     * synthesis note (the Career composition shows them in full).
     */
    protected function projectStrip(RenderContext $ctx, float $width, bool $withOrgs = true): string
    {
        $d = $ctx->data;
        $p = $d->palette;
        $wide = $width >= 150;
        $orgW = $wide ? 42.0 : ($width - 6) / 2;
        $orgs = [];
        foreach ([['supervised_by', $d->supervisedBy], ['partner', $d->partner]] as [$key, $org]) {
            if (! $org || ! $withOrgs) continue;
            $content = $org['logo']
                ? '<div style="height:8mm;">'.$this->img($org['logo'], min(30, $orgW), 8, '', 'left').'</div>'
                : '<div class="c" style="font-weight:bold;font-size:'.$ctx->pt(11, 9).'pt;letter-spacing:0.8pt;color:'.$p['text'].';">'.self::e($org['name']).'</div>';
            $sub = trim(($org['logo'] && $org['name'] !== '' ? $org['name'] : '').($org['country'] !== '' ? ($org['logo'] && $org['name'] !== '' ? ' · ' : '').$org['country'] : ''));
            $orgs[] = '<td style="width:'.self::mm($orgW).';padding-right:5mm;">'.$this->caps($ctx, $ctx->t($key), $p['accent'], 7, 0.18, 'margin-bottom:1.2mm;')
                .$content
                .($sub !== '' ? '<div class="cm" style="font-size:'.$ctx->pt(7.5, 7).'pt;letter-spacing:0.6pt;color:'.$p['muted'].';margin-top:0.8mm;">'.$this->flag($org['flag'], 2.4, 'margin-right:1.2mm;').self::e($sub).'</div>' : '')
                .'</td>';
        }
        $targets = '';
        if ($d->academies) {
            $countries = $ctx->take('academies', $d->academies);
            $clubs = array_sum(array_map(static fn ($a) => count($a['clubs']), $d->academies));
            if ($clubs > 0) $ctx->note('academy_clubs', 0, $clubs);
            $chips = '';
            foreach ($countries as $c) {
                $chips .= '<span style="margin-right:3.5mm;">'.$this->flag($c['flag'], 2.6, 'margin-right:1.2mm;')
                    .'<span class="cm" style="vertical-align:middle;font-size:'.$ctx->pt(8.5, 7.5).'pt;letter-spacing:0.5pt;color:'.$p['text'].';">'.self::e($c['country']).'</span></span> ';
            }
            if (count($d->academies) > count($countries)) {
                $chips .= '<span class="cm" style="font-size:'.$ctx->pt(8, 7).'pt;color:'.$p['accent'].';">'.self::e($ctx->t('more', count($d->academies) - count($countries))).'</span>';
            }
            $targets = $this->caps($ctx, $ctx->t('targets'), $p['accent'], 7, 0.18, 'margin-bottom:1.6mm;')
                .'<div style="line-height:1.7;">'.$chips.'</div>';
        }
        if (! $orgs && $targets === '') return '';

        $table = '<table style="width:'.self::mm($width).';table-layout:fixed;">';
        if ($wide) {
            return $table.'<tr>'.implode('', $orgs).($targets !== '' ? '<td>'.$targets.'</td>' : '').'</tr></table>';
        }
        $out = $orgs ? $table.'<tr>'.implode('', $orgs).(count($orgs) < 2 ? '<td></td>' : '').'</tr></table>' : '';
        if ($targets !== '') $out .= '<div style="margin-top:'.self::mm($orgs ? $ctx->sp(3) : 0).';">'.$targets.'</div>';
        return $out;
    }
}
