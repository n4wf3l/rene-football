<?php

namespace App\Services\Presentations;

use App\Models\Player;
use App\Models\Presentation;
use App\Services\Presentations\Fiche\FicheLayoutEngine;
use App\Services\Presentations\Fiche\FicheLayoutException;
use App\Services\Presentations\Fiche\FichePage;
use App\Services\Presentations\Fiche\FicheResult;
use App\Services\Presentations\Fiche\PdfInspector;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Produces the PDF served for a presentation and guarantees it is exactly
 * one A4 portrait page:
 *  - uploaded external PDF → served as-is, but only if it is one A4 page;
 *  - uploaded external image → wrapped on one A4 page (ratio preserved);
 *  - otherwise → the adaptive fiche engine.
 * Throws FicheLayoutException (with an admin-facing message) instead of ever
 * returning a non-compliant document.
 */
class PresentationPdfService
{
    public function __construct(
        private readonly FicheLayoutEngine $engine,
        private readonly PdfInspector $inspector,
    ) {
    }

    public function render(Presentation $presentation, Player $player, array $overrides = []): FicheResult
    {
        if ($presentation->external_asset_path) {
            $relative = Str::after($presentation->external_asset_path, '/storage/');
            if (Storage::disk('public')->exists($relative)) {
                return $this->external(Storage::disk('public')->path($relative), (string) $presentation->external_asset_type);
            }
            // Asset disappeared from disk — fall back to the generated fiche.
        }
        return $this->engine->render($player, $presentation->options ?? [], $overrides);
    }

    /** Validates an uploaded PDF before it is stored. */
    public function assertUploadedPdf(string $bytes): void
    {
        $this->inspector->assertOnePageA4($bytes, 'Le PDF importé');
    }

    private function external(string $absolutePath, string $type): FicheResult
    {
        $start = microtime(true);
        $bytes = $type === 'pdf'
            ? (string) file_get_contents($absolutePath)
            : Pdf::loadHTML($this->imagePageHtml($absolutePath))->setPaper('a4', 'portrait')->output();
        $info = $this->inspector->assertOnePageA4($bytes, $type === 'pdf' ? 'Le PDF importé' : 'La fiche image');

        return new FicheResult($bytes, '', 'external', $type, [], [], $info, 0.0, round((microtime(true) - $start) * 1000, 1));
    }

    /** Centres an image on a borderless A4 page, preserving its aspect ratio. */
    private function imagePageHtml(string $absolutePath): string
    {
        [$w, $h] = @getimagesize($absolutePath) ?: [1, 1];
        $ratio = max(1, $w) / max(1, $h);
        $pageRatio = FichePage::WIDTH_MM / FichePage::HEIGHT_MM;
        [$iw, $ih] = $ratio > $pageRatio
            ? [FichePage::WIDTH_MM, FichePage::WIDTH_MM / $ratio]
            : [FichePage::HEIGHT_MM * $ratio, FichePage::HEIGHT_MM];
        $src = str_replace('\\', '/', $absolutePath);

        return '<!doctype html><html><head><style>@page{margin:0;}html,body{margin:0;padding:0;background:#fff;}</style></head><body>'
            .'<img src="'.htmlspecialchars($src, ENT_QUOTES).'" style="position:absolute;'
            .'left:'.round((FichePage::WIDTH_MM - $iw) / 2, 2).'mm;top:'.round((FichePage::HEIGHT_MM - $ih) / 2, 2).'mm;'
            .'width:'.round($iw, 2).'mm;height:'.round($ih, 2).'mm;">'
            .'</body></html>';
    }
}
