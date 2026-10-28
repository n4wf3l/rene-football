<?php

namespace App\Services\Presentations\Fiche;

use DOMElement;
use DOMNode;
use Dompdf\Dompdf;
use Dompdf\Frame;
use Dompdf\Options;

/**
 * Renders fiche HTML with DomPDF on an A4 portrait page and measures what was
 * actually laid out. Compositions annotate their markup with:
 *
 *  - data-block="name"     record this element's box (mm)
 *  - data-limit="1"        its bottom must stay above the footer block
 *  - data-fit="1"          fixed-size box: no descendant may spill out of it
 *  - data-avoid="a b"      must not intersect the listed blocks
 *  - data-bleed="1"        decorative, allowed to cross the page edge
 *
 * Violations (second page, content below the footer, spill out of a fixed box,
 * horizontal overflow, collisions) make the attempt fail so the engine can
 * retry denser. Nothing is clipped to hide a problem.
 */
class FicheRenderer
{
    private const EPS_MM = 0.6;

    /**
     * @param bool $draft Measuring pass: every file image is swapped for a 1×1
     *                    transparent pixel at the same explicit size. Geometry
     *                    is identical (all fiche images carry width + height),
     *                    but DomPDF skips its per-pixel alpha processing, which
     *                    dominates render time. The final pass is never a draft.
     */
    public function render(string $html, bool $allowRemote = false, bool $draft = false): FicheMeasurement
    {
        $start = microtime(true);
        if ($draft) {
            $pixel = self::pixel();
            $html = preg_replace('/(<img\b[^>]*\bsrc=")(?!data:)[^"]*(")/i', '${1}'.$pixel.'${2}', $html) ?? $html;
        }

        $boxes   = [];          // data-block name => box
        $limits  = [];          // boxes that must end above the footer
        $avoids  = [];          // [box, [names]]
        $fits    = [];          // container id => [box, maxRight, maxBottom, name]
        $issues  = [];
        $pages   = [];

        $dompdf = new Dompdf($this->options($allowRemote));
        $dompdf->setPaper([0, 0, FichePage::WIDTH_PT, FichePage::HEIGHT_PT]);
        $dompdf->loadHtml($html, 'UTF-8');

        $dompdf->setCallbacks([[
            'event' => 'end_frame',
            'f'     => function (Frame $frame, $canvas) use (&$boxes, &$limits, &$avoids, &$fits, &$issues, &$pages) {
                $node = $frame->get_node();
                [$x, $y, $w, $h] = $frame->get_border_box();
                if (! is_numeric($x) || ! is_numeric($y)) return;
                $page = (int) $canvas->get_page_number();
                $box  = [
                    'x' => FichePage::ptToMm((float) $x), 'y' => FichePage::ptToMm((float) $y),
                    'w' => FichePage::ptToMm((float) $w), 'h' => FichePage::ptToMm((float) $h),
                    'page' => $page,
                ];
                $pages[$page] = true;

                $visible = $node instanceof DOMElement || ($node->nodeType === XML_TEXT_NODE && trim((string) $node->nodeValue) !== '');
                if (! $visible || $node->nodeName === 'html' || $node->nodeName === 'body') return;

                if ($node instanceof DOMElement) {
                    if ($name = $node->getAttribute('data-block')) {
                        $boxes[$name] = isset($boxes[$name]) ? self::union($boxes[$name], $box) : $box;
                        if ($node->getAttribute('data-limit')) $limits[$name] = $boxes[$name];
                    }
                    if ($avoid = trim($node->getAttribute('data-avoid'))) {
                        $avoids[] = [$box, preg_split('/\s+/', $avoid), $node->getAttribute('data-block') ?: $node->nodeName];
                    }
                    if ($node->getAttribute('data-fit')) {
                        $id = spl_object_id($node);
                        $fits[$id] = [$box, $fits[$id][1] ?? 0.0, $fits[$id][2] ?? 0.0, $node->getAttribute('data-block') ?: $node->nodeName];
                    }
                }

                if ($box['w'] <= 0.01 && $box['h'] <= 0.01) return;
                // Nearest fixed-size ancestor, unless a decorative (bleed) ancestor exempts us.
                $bleed = false;
                $container = null;
                for ($n = $node instanceof DOMElement ? $node : $node->parentNode; $n instanceof DOMElement; $n = $n->parentNode) {
                    if ($n->getAttribute('data-bleed')) { $bleed = true; break; }
                    if ($container === null && $n !== $node && $n->getAttribute('data-fit')) $container = $n;
                }
                if (! $bleed && $container) {
                    $id = spl_object_id($container);
                    $fits[$id] ??= [null, 0.0, 0.0, $container->getAttribute('data-block') ?: $container->nodeName];
                    $fits[$id][1] = max($fits[$id][1], $box['x'] + $box['w']);
                    $fits[$id][2] = max($fits[$id][2], $box['y'] + $box['h']);
                }
                if (! $bleed && ($box['x'] < -self::EPS_MM || $box['x'] + $box['w'] > FichePage::WIDTH_MM + self::EPS_MM)) {
                    $what = mb_substr(trim((string) $node->textContent), 0, 40);
                    $issues['overflow-x:'.self::label($node)] = sprintf('Débordement horizontal : %s « %s » (%.1f → %.1f mm)', self::label($node), $what, $box['x'], $box['x'] + $box['w']);
                }
            },
        ]]);

        $dompdf->render();
        $pageCount = (int) $dompdf->getCanvas()->get_page_count();

        if ($pageCount !== 1) {
            $issues['pages'] = "Le rendu occupe $pageCount pages.";
        }

        $footer   = $boxes['footer'] ?? null;
        $ceiling  = $footer ? $footer['y'] : FichePage::HEIGHT_MM;
        $lowest   = 0.0;
        $spare    = [];
        foreach ($limits as $name => $b) {
            $bottom = $b['y'] + $b['h'];
            $lowest = max($lowest, $bottom);
            $spare[$name] = round($ceiling - $bottom, 2);
            if ($b['page'] > 1 || $bottom > $ceiling + 0.1) {
                $issues['limit:'.$name] = sprintf('Le bloc « %s » descend sous le pied de page (%.1f mm > %.1f mm).', $name, $bottom, $ceiling);
            }
        }
        if ($footer && ($footer['page'] !== 1 || $footer['y'] + $footer['h'] > FichePage::HEIGHT_MM + self::EPS_MM)) {
            $issues['footer'] = 'Le pied de page n’est pas entièrement visible sur la page 1.';
        }

        foreach ($fits as [$box, $right, $bottom, $name]) {
            if (! $box) continue;
            if ($bottom > $box['y'] + $box['h'] + self::EPS_MM || $right > $box['x'] + $box['w'] + self::EPS_MM) {
                $issues['fit:'.$name] = sprintf('Contenu trop grand pour le cadre « %s ».', $name);
            }
        }

        foreach ($avoids as [$box, $names, $label]) {
            foreach ($names as $other) {
                if (isset($boxes[$other]) && self::intersects($box, $boxes[$other])) {
                    $issues['avoid:'.$label.':'.$other] = sprintf('Collision entre « %s » et « %s ».', $label, $other);
                }
            }
        }

        $free = $limits ? $ceiling - $lowest : 0.0;

        return new FicheMeasurement(
            $dompdf,
            $pageCount,
            $boxes,
            array_values($issues),
            round($free, 2),
            round((microtime(true) - $start) * 1000, 1),
            $spare,
            array_keys($issues),
        );
    }

    /** 1×1 transparent GIF (palette transparency: DomPDF embeds it without alpha processing). */
    private static function pixel(): string
    {
        $path = storage_path('app/fiche-cache/pixel.gif');
        if (! is_file($path)) {
            if (! is_dir(dirname($path))) @mkdir(dirname($path), 0775, true);
            $im = imagecreate(1, 1);
            imagecolortransparent($im, imagecolorallocate($im, 0, 0, 0));
            imagegif($im, $path);
            imagedestroy($im);
        }
        return str_replace(chr(92), '/', $path);
    }

    private function options(bool $allowRemote): Options
    {
        $cfg = (array) config('dompdf.options', []);
        $fontDir = $cfg['font_dir'] ?? storage_path('fonts');
        if (! is_dir($fontDir)) @mkdir($fontDir, 0775, true);

        $o = new Options();
        $o->setChroot([base_path()]);
        $o->setFontDir($fontDir);
        $o->setFontCache($cfg['font_cache'] ?? $fontDir);
        // Dedicated temp dir: DomPDF calls tempnam() for every alpha PNG, which
        // crawls on a crowded system temp folder (seconds per image on Windows).
        $tmp = storage_path('app/fiche-cache/tmp');
        if (! is_dir($tmp)) @mkdir($tmp, 0775, true);
        $o->setTempDir($tmp);
        $o->setIsRemoteEnabled($allowRemote);
        $o->setIsPhpEnabled(false);
        $o->setIsJavascriptEnabled(false);
        $o->setIsFontSubsettingEnabled(true);
        $o->setDefaultMediaType('print');
        $o->setDpi(96);
        $o->setDefaultFont('DejaVu Sans');
        return $o;
    }

    private static function label(DOMNode $node): string
    {
        for ($n = $node; $n; $n = $n->parentNode) {
            if ($n instanceof DOMElement && $n->getAttribute('data-block')) return $n->getAttribute('data-block');
        }
        return $node->nodeName;
    }

    private static function union(array $a, array $b): array
    {
        $x0 = min($a['x'], $b['x']);
        $y0 = min($a['y'], $b['y']);
        return [
            'x' => $x0, 'y' => $y0,
            'w' => max($a['x'] + $a['w'], $b['x'] + $b['w']) - $x0,
            'h' => max($a['y'] + $a['h'], $b['y'] + $b['h']) - $y0,
            'page' => max($a['page'], $b['page']),
        ];
    }

    private static function intersects(array $a, array $b): bool
    {
        if ($a['page'] !== $b['page']) return false;
        return $a['x'] + self::EPS_MM < $b['x'] + $b['w'] && $b['x'] + self::EPS_MM < $a['x'] + $a['w']
            && $a['y'] + self::EPS_MM < $b['y'] + $b['h'] && $b['y'] + self::EPS_MM < $a['y'] + $a['h'];
    }
}
