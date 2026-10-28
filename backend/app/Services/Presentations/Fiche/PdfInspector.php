<?php

namespace App\Services\Presentations\Fiche;

use Smalot\PdfParser\Parser;
use Throwable;

/**
 * Reads a finished PDF with a parser independent from the rendering engine
 * (smalot/pdfparser) and reports its page count and page size. Used to
 * verify every generated fiche and every uploaded external PDF.
 */
class PdfInspector
{
    /** @return array{pages:int, width:float, height:float} sizes in pt (first page) */
    public function inspect(string $bytes): array
    {
        try {
            $pdf   = (new Parser())->parseContent($bytes);
            $pages = $pdf->getPages();
        } catch (Throwable $e) {
            throw new FicheLayoutException('Le fichier PDF est illisible.', [$e->getMessage()]);
        }
        $count = count($pages);
        [$w, $h] = $count ? $this->mediaBox($pages[0]) : [0.0, 0.0];
        return ['pages' => $count, 'width' => $w, 'height' => $h];
    }

    public function isOnePageA4(array $info): bool
    {
        return $info['pages'] === 1
            && abs($info['width'] - FichePage::WIDTH_PT) <= FichePage::SIZE_TOLERANCE_PT
            && abs($info['height'] - FichePage::HEIGHT_PT) <= FichePage::SIZE_TOLERANCE_PT;
    }

    /** Throws with an actionable message when the PDF is not exactly one A4 portrait page. */
    public function assertOnePageA4(string $bytes, string $subject = 'Le PDF'): array
    {
        $info = $this->inspect($bytes);
        if ($info['pages'] !== 1) {
            throw new FicheLayoutException("$subject contient {$info['pages']} pages : une fiche doit tenir sur exactement une page A4.");
        }
        if (! $this->isOnePageA4($info)) {
            throw new FicheLayoutException(sprintf(
                '%s mesure %.0f × %.0f mm : le format attendu est A4 portrait (210 × 297 mm).',
                $subject,
                FichePage::ptToMm($info['width']),
                FichePage::ptToMm($info['height']),
            ));
        }
        return $info;
    }

    /** @return array{0:float,1:float} */
    private function mediaBox($page): array
    {
        // MediaBox may be inherited from the /Pages node; walk up when absent.
        for ($node = $page, $i = 0; $node && $i < 8; $i++) {
            $box = $node->getHeader()->get('MediaBox');
            if ($box && method_exists($box, 'getContent')) {
                $vals = array_map(static fn ($e) => (float) (is_object($e) ? $e->getContent() : $e), (array) $box->getContent());
                if (count($vals) === 4) {
                    // CropBox / rotation aside, effective size is the box extent.
                    $w = abs($vals[2] - $vals[0]);
                    $h = abs($vals[3] - $vals[1]);
                    $rot = $node->getHeader()->get('Rotate');
                    $deg = $rot && method_exists($rot, 'getContent') ? ((int) $rot->getContent()) % 180 : 0;
                    return $deg === 90 ? [$h, $w] : [$w, $h];
                }
            }
            $parent = $node->getHeader()->get('Parent');
            $node = is_object($parent) && method_exists($parent, 'getHeader') ? $parent : null;
        }
        return [0.0, 0.0];
    }
}
