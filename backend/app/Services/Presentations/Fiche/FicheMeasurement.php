<?php

namespace App\Services\Presentations\Fiche;

use Dompdf\Dompdf;

/**
 * Geometry of one DomPDF render, captured frame by frame while DomPDF lays
 * out the page (so absolutely positioned elements are measured too), in mm
 * from the top-left corner of their page.
 */
final class FicheMeasurement
{
    /**
     * @param array<string, array{x:float,y:float,w:float,h:float,page:int}> $blocks
     * @param string[] $violations
     * @param array<string,float> $spare mm left between each data-limit block and the footer
     */
    private ?string $bytes = null;

    public function __construct(
        private ?Dompdf $dompdf,
        public readonly int $pageCount,
        public readonly array $blocks,
        public readonly array $violations,
        public readonly float $freeMm,
        public readonly float $ms,
        public readonly array $spare = [],
        /** @var string[] machine keys of the violations (e.g. "fit:opening") */
        public readonly array $issueKeys = [],
    ) {
    }

    /** PDF bytes, serialised lazily: measuring passes that get discarded never pay for output(). */
    public function pdf(): string
    {
        if ($this->bytes === null) {
            $this->bytes = (string) $this->dompdf?->output();
            $this->dompdf = null;
        }
        return $this->bytes;
    }

    public function fits(): bool
    {
        return $this->pageCount === 1 && $this->violations === [];
    }
}
