<?php

namespace App\Services\Presentations\Fiche;

/**
 * A verified one-page fiche: the PDF bytes plus the layout report stored in
 * `player_presentations.render_meta` and shown in the editor.
 */
final class FicheResult
{
    /**
     * @param array<string, array{shown:int,total:int}> $notes
     * @param array<int, array<string,mixed>> $attempts
     */
    public function __construct(
        public readonly string $pdf,
        public readonly string $html,
        public readonly string $composition,
        public readonly string $density,
        public readonly array $notes,
        public readonly array $attempts,
        public readonly array $pdfInfo,
        public readonly float $freeMm,
        public readonly float $ms,
    ) {
    }

    public function meta(): array
    {
        return [
            'engine'      => 'dompdf',
            'composition' => $this->composition,
            'density'     => $this->density,
            'synthesized' => $this->notes,
            'attempts'    => count($this->attempts),
            'pages'       => $this->pdfInfo['pages'] ?? null,
            'page_size_mm'=> isset($this->pdfInfo['width'])
                ? [round(FichePage::ptToMm($this->pdfInfo['width']), 1), round(FichePage::ptToMm($this->pdfInfo['height']), 1)]
                : null,
            'free_mm'     => $this->freeMm,
            'render_ms'   => $this->ms,
            'verified_at' => now()->toIso8601String(),
        ];
    }
}
