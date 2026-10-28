<?php

namespace App\Services\Presentations\Fiche;

/**
 * A raster image available on the local filesystem, ready to be embedded by
 * DomPDF. Width/height are the intrinsic pixel dimensions; `cutout` is true
 * for PNGs whose border is mostly transparent (detoured player photos), which
 * lets compositions layer them over typography.
 */
final class FicheImage
{
    public function __construct(
        public readonly string $path,
        public readonly int $width,
        public readonly int $height,
        public readonly bool $cutout = false,
    ) {
    }

    public function ratio(): float
    {
        return $this->width / max(1, $this->height);
    }

    /**
     * Largest box of the image's aspect ratio that fits in w × h (mm).
     *
     * @return array{0:float,1:float}
     */
    public function fitWithin(float $w, float $h): array
    {
        $r = $this->ratio();
        return ($w / $h) > $r ? [$h * $r, $h] : [$w, $w / $r];
    }
}
